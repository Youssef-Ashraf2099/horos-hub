# HOROS Technical Specification: Adaptive Mitigation, Directional TTC & Zero-Trust Sensory Architecture (Patches 4 & 7)

**Document ID:** `TECH-DOC-ADAPTIVE-01`  
**Classification:** Mitigation Core & Sensor Plausibility Architecture  
**Author:** Youssef Ashraf Khalil  
**Institution:** German International University (GIU Cairo)  
**Academic Degree:** Bachelor of Science in Computer Science  
**Supervisors:** Dr. Marwa Zamzam, Prof. Slim Abdennadher  
**Target Platforms:** Unitree Go2 EDU Quadruped / UBTech Yanshee Humanoid / ROS 2 Humble LTS  

---

## 1. Theoretical Rationale & Research Questions

The core thesis objective of the HOROS framework centers on two primary research questions:
* **RQ1 (Availability vs. Security):** Traditional robotic defenses employ static binary emergency stops (E-Stops), which maximize security by completely halting the robot ($v = 0.0\text{ m/s}$), but destroy operational availability ($\text{Task Continuity } TC = 0$).
* **RQ2 (Cyber-Physical Environmental Safety):** State-of-the-art dynamic policy matrices scale speed based on cyber attack severity $S$, but are **context-blind** (unaware of spatial surroundings). In a narrow corridor or confined space, an attacker injecting a steering bias easily drives the robot into a wall even under clamped speeds.

The **Adaptive Decision Surface** resolves both questions by continuous multi-dimensional modulation:
$$v_{\text{safe}} = f\big(S,\ d_{\min},\ v_{\text{act}},\ M,\ \gamma_{\text{loc}}\big)$$

However, two critical real-world failure modes required engineering remediation:
1. **Wall Deadlock & Impending Collisions (Patch 4):** A static proximity halt traps the robot permanently if an obstacle is close, preventing backward extrication. Furthermore, distance alone does not account for closing velocity.
2. **Sensory Manipulation & Deception (Patch 7):** An adaptive surface that blindly trusts sensor readings is vulnerable to sensor spoofing, blinding, and stale telemetry.

---

## 2. Patch 4: Directional Clearance, TTC & Reverse Deadlock Bypass

Implemented in [`src/horos_mitigation_engine/include/horos_mitigation_engine/adaptive_strategy.hpp`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_mitigation_engine/include/horos_mitigation_engine/adaptive_strategy.hpp):

### 2.1 Directional Time-To-Collision (TTC)
Spatial clearance $d_{\min}$ alone does not reflect kinetic momentum. A robot $0.60\text{ m}$ from a wall traveling at $0.05\text{ m/s}$ is safe, whereas at $0.80\text{ m/s}$ it will impact the wall within $0.75\text{ s}$ due to physical braking lag.

HOROS evaluates **Time-To-Collision**:
$$\text{TTC} = \frac{d_{\min}}{\max\left(0.05,\ |v_{\text{cmd}, x}|\right)}$$

* **Impending Collision Tripwire:**  
  If $v_{\text{cmd}, x} > 0.05\text{ m/s}$ and $\text{TTC} < 1.00\text{ s}$, the strategy preemptively clamps forward velocity to crawl speed:
  $$v_{\text{safe}, x} = \min\left(0.08 \cdot \frac{\text{TTC}}{1.00} \cdot \gamma_{\text{loc}},\ 0.30 \cdot v_{\text{cruise}}\right)$$
  Action Tag: `ADAPTIVE_PREEMPTIVE_TTC_DECELERATION`.

### 2.2 Autonomous Reverse Deadlock Bypass
When a robot is trapped near an obstacle ($d_{\min} < d_{\text{emergency}}$):
* Forward velocity commands ($v_{\text{cmd}, x} \ge 0$) must be halted to prevent collision.
* **HOWEVER:** If the upstream navigation planner or human operator commands backward motion ($v_{\text{cmd}, x} < -0.05\text{ m/s}$), halting would cause permanent entrapment.
* HOROS permits **active backward extrication**:
  $$v_{\text{safe}, x} = \text{clamp}\big(v_{\text{cmd}, x},\ -0.70 \cdot v_{\text{cruise}},\ 0.0\big)$$
  $$\omega_{\text{safe}, z} = \text{clamp}\big(\omega_{\text{cmd}, z},\ -0.45 \cdot \alpha_{\text{turn}},\ +0.45 \cdot \alpha_{\text{turn}}\big)$$
  Action Tag: `ADAPTIVE_ACTIVE_DISENGAGEMENT_REVERSE`, preserving $TC = 0.40$.

### 2.3 `DYNAMIC_PROXIMITY` Baseline Mode
Implemented in [`src/horos_mitigation_engine/include/horos_mitigation_engine/dynamic_strategy.hpp`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_mitigation_engine/include/horos_mitigation_engine/dynamic_strategy.hpp):  
Provides a baseline for academic comparison: pairs a classical dynamic matrix with a simple proximity halt ($d_{\min} < 0.45\text{m} \implies v = 0$), demonstrating why continuous adaptive modulation outperforms piecewise static clamping.

---

## 3. Patch 7: Zero-Trust Sensory Architecture & Fallback Ladder

A zero-trust sensory architecture presumes that any perception channel (`/scan` or `/odom`) can be compromised, blinded, or corrupted by an adversary.

### 3.1 Five Independent Sensory Tripwires
At every evaluation cycle, the strategy audits 5 physical plausibility invariants:

| Tripwire | Metric Audited | Plausibility Bound | Threat Vector Mitigated |
| :--- | :--- | :--- | :--- |
| **Tripwire 1** | Perception Staleness ($\Delta t_{\text{context}}$) | $\Delta t \le 0.50\text{ s}$ | Sensor publisher freeze / DDS starvation |
| **Tripwire 2** | Beam Sanity ($d_{\min}$) | $\neg\text{NaN} \land \neg\text{Inf} \land d_{\min} \ge 0.02\text{m}$ | LiDAR blinding / acoustic transducer short |
| **Tripwire 3** | Acceleration Feasibility ($\frac{\Delta v}{\Delta t}$) | $\frac{\Delta v}{\Delta t} \le 2.60\text{ m/s}^2$ | Spoofed odometry instantaneous velocity jumps |
| **Tripwire 4** | Absolute Velocity Limit ($v_{\text{act}}$) | $v_{\text{act}} \le 1.50 \cdot v_{\max}$ | Impossible wheel encoder speed reporting |
| **Tripwire 5** | Localization Covariance ($\gamma_{\text{loc}}$) | $\gamma_{\text{loc}} \ge 0.05 \land \neg\text{NaN}$ | Total SLAM divergence / kidnapping |

```
                       [Incoming Sensor Context C]
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │ Evaluate 5 Plausibility Tripwires:                     │
       │ 1. Staleness | 2. Beams | 3. Accel | 4. Limits | 5. Cov│
       └────────────────────────────┬───────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │ (0 Tripwires)           │ (1 Tripwire: Stale/Beam)│ (≥ 2 Tripwires)
          ▼                         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ Level 0: Trust   │      │ Level 2: Dynamic │      │ Level 3: Latched │
│ Full Adaptive    │      │ Matrix Fallback  │      │ Protective Hold  │
│ Decision Surface │      │ Clamped v_x(S)   │      │ v = 0, w = 0     │
│ TC = 85% - 95%   │      │ Zero Spatial Rely│      │ Failsafe Lockout │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

### 3.2 Four-Tier Hierarchical Fallback Ladder
* **Level 0 (Full Trust — 0 Tripwires):** Nominal Adaptive Decision Surface active. Velocity scaled continuously across all 5 dimensions.
* **Level 1 (Degraded Crawl — 1 Minor Anomaly):** Slight kinematic jitter or low localization confidence. Clamps forward velocity to crawl speed ($v_x \le 0.10\text{ m/s}$).
* **Level 2 (Dynamic Matrix Fallback — Sensory Untrusted):** Beam corruption or stale scan data. Spatial clearance $d_{\min}$ is untrusted. The engine falls back to pure kinematic clamping without spatial reliance:
  $$v_{\text{safe}, x} = \text{clamp}\big(v_{\text{cmd}, x},\ 0.0,\ v_{\text{cruise}} \cdot (1 - 0.50 \cdot S)\big)$$
  Action Tag: `ADAPTIVE_SENSORY_FALLBACK_DYNAMIC_CLAMP`.
* **Level 3 (Latched Protective Hold — Critical Contradiction $\ge 2$ Tripwires):** Multi-sensor contradiction indicates active adversarial deception. Instantaneous physical stop ($v = 0, \omega = 0$), applied action `ADAPTIVE_ZERO_TRUST_SENSORY_HALT`.

---

## 4. Universal HAL Kinematic Configuration

The Adaptive Strategy exposes a runtime `configure()` API allowing the Universal HAL to dynamically update limits upon robot auto-detection:
* `nominal_cruise_v_`: $0.35\text{ m/s}$ (Go2) vs $0.08\text{ m/s}$ (Yanshee).
* `min_clearance_emergency_`: $0.45\text{ m}$ (Go2) vs $0.25\text{ m}$ (Yanshee).
* `min_clearance_caution_`: $1.40\text{ m}$ (Go2) vs $0.80\text{ m}$ (Yanshee).
* `lateral_turn_attenuation_`: $1.0$ (Go2) vs $0.50$ (Yanshee, attenuating turns into blind zones).

---

## 5. Thesis Oral Defense Q&A

**Question:** *If an attacker blinds the robot's LiDAR with reflective tape, how does HOROS prevent a collision without crashing the robot?*  
**Defense:** "If LiDAR beams are blinded, returns either drop to zero or produce NaN/Inf out-of-range readings. Tripwire 2 detects this beam sanity violation immediately. Instead of blindly trusting a corrupted $d_{\min} = 10\text{m}$, the Zero-Trust Sensory Ladder immediately drops the engine to **Level 2: Dynamic Matrix Fallback**. In this mode, the system isolates spatial perception, clamps forward velocity by $50\%$ based on cyber threat severity $S$, and restricts turning rates. If odometry or localization also diverge, Tripwire 5 trips, triggering **Level 3: Latched Protective Hold**, safely immobilizing the robot until verified."
