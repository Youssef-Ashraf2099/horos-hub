# HOROS Technical Specification: Recovery Attestation Core & Persistent Relapse Backoff (Patch 1)

**Document ID:** `TECH-DOC-RECOVERY-01`  
**Classification:** Autonomous Safe Recovery Domain & Anti-Flapping Architecture  
**Author:** Youssef Ashraf Khalil  
**Institution:** German International University (GIU Cairo)  
**Academic Degree:** Bachelor of Science in Computer Science  
**Supervisors:** Dr. Marwa Zamzam, Prof. Slim Abdennadher  
**Target Platforms:** Unitree Go2 EDU Quadruped / UBTech Yanshee Humanoid / ROS 2 Humble LTS  

---

## 1. Architectural Problem Formulation

The HOROS Recovery Engine (Domain 2) governs the autonomous transition from protective mitigation back to nominal mission operations via the **6-State Recovery Finite State Machine**:
$$\text{NORMAL} \longrightarrow \text{SUSPECTED} \longrightarrow \text{PROTECTIVE} \longrightarrow \text{VERIFICATION} \longrightarrow \text{PHASED\_RECOVERY} \longrightarrow \text{NORMAL}$$

In the baseline implementation, three critical security vulnerabilities were identified:
1. **Tautological C1 Check:** Previously evaluated the *output* of the inline mitigation engine (`/cmd_vel_mitigated`). Because the mitigation engine had already clamped the command, C1 was a tautology and always returned `true`, even if the attacker was still aggressively injecting velocity spikes on `/cmd_vel_raw`.
2. **Superficial C4 Anti-Replay Check:** Evaluated a simple boolean flag without inspecting timestamps or sequence freshness, allowing delayed or replayed packets from the pre-attack buffer to be executed.
3. **5-Second Flapping Reset Vulnerability:** The recovery state machine reset `relapse_count_ = 0` whenever the robot remained nominal for 5.0 seconds. An intelligent adversary could pulse an attack every 5.1 seconds indefinitely without ever tripping the terminal `FAILED_HOLD` lockout.

---

## 2. Engineering Remediation & Implementation

Implemented in [`src/horos_recovery_engine/include/horos_recovery_engine/recovery_state_machine.hpp`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_recovery_engine/include/horos_recovery_engine/recovery_state_machine.hpp) and [`src/horos_recovery_engine/src/recovery_engine_node.cpp`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_recovery_engine/src/recovery_engine_node.cpp):

```
                                    +-----------------------+
                                    | STATE_NORMAL_OPERATION|
                                    +-----------+-----------+
                                                | Alert: under_attack
                                                v
                                    +-----------------------+
                                    |STATE_PROTECTIVE_HOLD  |
                                    +-----------+-----------+
                                                | Alert: subsided
                                                v
                                    +-----------------------+
                                    |STATE_VERIFICATION     |
                                    | Φ = C1 ∧ C2 ∧ C3 ∧ C4 |
                                    +-----------+-----------+
                                                | Sustained ≥ 250ms
                                                v
                                    +-----------------------+
                                    | STATE_PHASED_RECOVERY |
                                    | Cubic Hermite S-Curve |
                                    +-----------+-----------+
                                                |
                        ┌───────────────────────┴───────────────────────┐
                        │ Relapse (k < 3)                               │ Persistent (k ≥ 3)
                        ▼                                               ▼
     ┌─────────────────────────────────────┐         ┌─────────────────────────────────────┐
     │ Instant Sub-5ms Rollback            │         │ STATE_FAILED_HOLD                   │
     │ Exponential Probation Backoff:      │         │ Terminal Lockout                    │
     │ T_probation(k) = T_base · 2^k       │         │ 30-Second Extended Quiet Window     │
     └─────────────────────────────────────┘         └─────────────────────────────────────┘
```

### 2.1 Check C1: Real Raw Ingress Stream Attestation
The recovery engine directly subscribes to the unmitigated raw command topic (`cmd_raw_sub_` on `/cmd_vel_raw`).
In `STATE_VERIFICATION`, Check C1 audits the **true unmitigated command stream**:
$$C_1 = \big(|v_{\text{raw}, x}| \le v_{\text{kin\_max}}\big) \;\land\; \big(|\omega_{\text{raw}, z}| \le \omega_{\text{kin\_max}}\big) \;\land\; (\neg\text{alert.under\_attack})$$

Where $v_{\text{kin\_max}}$ and $\omega_{\text{kin\_max}}$ are dynamically bound via the Universal HAL profile (e.g. $0.80\text{ m/s}$ for Go2, $0.15\text{ m/s}$ for Yanshee). If an adversary continues transmitting velocity spikes on `/cmd_vel_raw`, $C_1$ remains `false`, preventing premature recovery.

### 2.2 Check C4: Sequence Freshness & Anti-Replay Audit
Validates that stale commands lingering in DDS transport buffers prior to the attack are never executed:
$$C_4 = \text{anti\_replay\_buffer\_purged\_} \;\land\; \big(t_{\text{now}} - t_{\text{last\_raw\_cmd}} \le \tau_{\text{stale\_max}}\big)$$

Where $\tau_{\text{stale\_max}} = 1.0\text{ s}$. If commands arrive with stale timestamps or if queue purging has not completed, $C_4$ fails.

### 2.3 Continuous Leaky Relapse Decay & Risk-Derived Rearm Window
In earlier iterations, a hard 30-second lockout and rigid counter was used. However, under unknown threats and noisy environments, sporadic non-consecutive probes could permanently strand the robot.

HOROS enhances this with **Continuous Leaky Relapse Decay**:
$$k_{\text{eff}} = k_{\text{relapse}} \cdot \exp\left(-\frac{t_{\text{clean}}}{\tau_k}\right) \quad (\tau_k = 10.0\text{ s})$$

1. **Pulsing Attack Defense:** An intelligent adversary cycling attacks every $5.1\text{ s}$ fails to achieve sufficient $t_{\text{clean}}$, forcing $k_{\text{eff}}$ to accumulate past $3.0$ and tripping protective lockout.
2. **Transient Probes Forgiven:** Isolated, non-consecutive probes decay continuously over time during clean nominal mission execution without requiring an artificial step reset.
3. **Dynamic Rearm Window:** Instead of a rigid 30-second standstill, the rearm window scales dynamically with the relapse exponent:
   $$T_{\text{hold\_rearm}} = \operatorname{clamp}\left(2.0 \cdot 2^{k_{\text{relapse}}},\; 2.0\,\text{s},\; 12.0\,\text{s}\right)$$

---

## 3. Resilient Leaky Gate Integrator & Composite Confidence Metric ($\Phi$)

Rather than a brittle boolean reset (`clean_condition_active_ = false` upon a single dropped LiDAR packet), the recovery gate employs a sliding 10-tick ring buffer integrator:

$$\text{pass\_rate} = \frac{1}{N} \sum_{i=1}^{N} \text{gate\_hist}_i, \quad N = 10$$

* **Stability Condition:** $\text{pass\_rate} \ge 0.85$ ($9/10$ ticks passed). Single scan anomalies or reflections do not reset verified progress.
* **Composite Multi-Channel Confidence Metric ($\Phi$):**
  $$\Phi = \min\Big(\text{score}_{\text{cmd}},\; \text{score}_{\text{perc}},\; \gamma_{\text{loc\_gate}},\; \text{replay\_gate}\Big)$$
* **Immediate Crawl Initiation:** When $\Phi \ge 0.50$, the robot immediately initiates cautious crawl ($v \le 0.08\text{ m/s}$), scaling its dynamic velocity envelope ceiling smoothly as confidence solidifies:
  $$v_{\text{ceiling}} = v_{\text{floor}} + (v_{\max} - v_{\text{floor}}) \cdot \Phi$$

* **Sub-5 ms Instant Rollback Invariance:** If an active attack recurrence (`alert.under_attack == true`) or severe spatial collision risk occurs, the system executes an instantaneous sub-5 ms rollback to `STATE_PROTECTIVE_RESPONSE`, entirely bypassing the integrator.

---

## 4. Thesis Oral Defense Q&A

**Question:** *Why is continuous leaky decay preferable to either fixed-time resets or permanent lockouts?*  
**Defense:** "Fixed-time step resets (e.g., clearing the counter after 5.0 seconds) create an exploitation window where an adversary can pulse attacks at 5.1 seconds indefinitely without penalty. Conversely, permanent or rigid 30-second lockouts cause severe denial of service in noisy cyber-physical environments where transient sensor dropouts occur. Continuous exponential leaky decay ($k_{\text{eff}} = k \cdot \exp(-t/\tau_k)$) mathematically guarantees that rapid sequential attacks accumulate into a defensive lockout, while benign, well-spaced anomalies smoothly decay, preserving both security against flapping and mission availability."

**Question:** *How does your multi-channel parallel attestation prevent context attacks from creating verification livelocks?*  
**Defense:** "In a legacy serial architecture, a single corrupted or spoofed LiDAR scan tick flips the obstacle clearance check to false, resetting the consecutive clean counter to zero. By decoupling command trust from perception trust with independent 4-state mini-FSMs and applying an asymmetric leaky score integrator ($+0.15$ on success, $-0.40$ on failure) over a 10-tick ring buffer, isolated sensory glitches do not cancel accumulated progress. If perception is completely quarantined, the robot does not halt; it engages a safe degraded dead-reckoning crawl bounded by the last-known trusted clearance, guaranteeing task continuity ($TC > 0$)."
