# Technical Reference: Adversarial Attack Injector Node

**File Path:** [`src/horos_attack_injector/horos_attack_injector/attack_injector_node.py`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_attack_injector/horos_attack_injector/attack_injector_node.py)  
**Attack Modules:** [`src/horos_attack_injector/horos_attack_injector/attacks/`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_attack_injector/horos_attack_injector/attacks/__init__.py)  
**Package:** `horos_attack_injector`  
**Executable:** `attack_injector_node`  
**Language:** Python 3 (ROS 2 `rclpy`)  
**Author:** Youssef Ashraf Khalil  
**Institution:** German International University (GIU Cairo)  
**Thesis:** *Severity-Aware Adaptive Response and Autonomous Safe Recovery for Robotic Systems under Cyberattack*  
**Target:** Unitree Go2 Quadruped Robot / ROS 2 Humble Ecosystem  

---

## 1. Architectural Role & Cyber-Physical Threat Model

In the HOROS framework architecture, [`AttackInjectorNode`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_attack_injector/horos_attack_injector/attack_injector_node.py) acts as an independent adversarial orchestrator executing within the robot's onboard communication fabric. It manages ROS 2 topic/service wiring, deterministic episode timing, and ground-truth alert synchronization, while delegating each threat vector's perturbation and auxiliary exploit logic to a dedicated [`BaseAttack`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_attack_injector/horos_attack_injector/attacks/base.py) strategy module under `horos_attack_injector.attacks`.

Situated directly between the high-level mission planner ([`nominal_driver`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_attack_injector/horos_attack_injector/nominal_driver.py)) and downstream defense layers ([`horos_mitigation_engine`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_mitigation_engine/src/mitigation_engine_node.cpp) and [`horos_recovery_engine`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_recovery_engine/src/recovery_engine_node.cpp)), it intercepts clean nominal trajectories and injects controlled cyber-physical perturbations onto the compromised topic `/cmd_vel_raw`.

```
+---------------------+
|   nominal_driver    |  (High-level mission path planning)
+---------------------+
           |  /cmd_vel_nominal (20 Hz clean Twist)
           v
+-------------------------------------------------------------------------+
|                          attack_injector_node                           |
|                                                                         |
|  TIER I: Classic MITRE ATT&CK Robotic Vectors (V1a - V5)                |
|    * V1a: Velocity Surge Spike (+3.0 m/s)  | V1b: Steering Bias Drift   |
|    * V2:  High-Frequency Flooding DoS      | V3:  Rogue Node Injection  |
|    * V4:  Unauthorized Service Bypass      | V5:  DDS Packet Disruption |
|                                                                         |
|  TIER II: Zero-Day CBF & Sensory Tampering Vectors (V6 - V8)            |
|    * V6:  CBF Boundary Grazing Probing     | V7:  CBF Resonant Chatter  |
|    * V8:  Sensory Blackout & Context Spoofing Tampering                 |
|                                                                         |
|  TIER III: Immersive & Adaptive Adversary Vectors (V9 - V12)            |
|    * V9:  LiDAR Beam Corruption & 1.5 Hz Flicker Injection              |
|    * V10: Strategic Recovery Flapping / Pulsing (AA-2a Duty Cycle)      |
|    * V11: Compound Multi-Vector Stealth Synergy (Tests Eq. 2 t-Conorm)  |
|    * V12: Postural ZMP Toppling & 10 rad/s Pitch/Yaw Rocking Reversals  |
+-------------------------------------------------------------------------+
     |                       |                          |
     | /cmd_vel_raw          | /horos/attack_alert      | /horos/ground_truth_attack
     v                       v                          v
+--------------------------------+          +------------------------+
|    horos_mitigation_engine     |          | benchmark_tracer_node  |
| (Domain 1: Inline Protection)  |          | (Independent Telemetry)|
+--------------------------------+          +------------------------+
```

---

## 2. MITRE ATT&CK for Robotics & Three-Tier Threat Taxonomy

The node implements **13 canonical cyber-physical threat vectors** organized across three progressive adversarial tiers:

### Tier I — Classic MITRE ATT&CK Robotic Threat Vectors (V1a–V5)
1. **Threat 1a & 1b: Unauthorized Velocity Injection (`unauthorized_velocity` / `spike` & `bias_drift` — MITRE T1565.002):**
   * Corrupts velocity command vectors on `/cmd_vel_raw` to force kinematic instability, motor saturation, or wall collisions.
   * Divided into **Velocity Spike Surge** (`unauthorized_velocity`, sudden longitudinal acceleration up to $+3.0\text{ m/s}$) and **Steering Bias Drift** (`bias_drift`, stealth lateral angular veering).
2. **Threat 2: High-Frequency Flooding DoS (`flooding_dos` / `flood` — MITRE T1499.002):**
   * Saturates DDS communication queues with $100\text{--}400\text{ Hz}$ bursts of spoofed commands, exhausting CPU threads and testing pre-bucket kinematic plausibility filtering (`mitigation_engine_node.cpp`).
3. **Threat 3: Rogue Node Injection (`rogue_node` / `rogue` — MITRE T1078):**
   * Simulates an unauthorized secondary ROS 2 publisher injecting conflicting asynchronous trajectory commands at $40\text{ Hz}$ directly onto the actuator bus.
4. **Threat 4: Unauthorized Service Invocation (`unauthorized_service` / `service_abuse` — MITRE T1059):**
   * An unauthorized client attempts runtime service reconfiguration of defensive parameters, specifically attempting to force `/horos/set_mitigation_mode` $\to$ `BYPASS` to disarm defenses during an active velocity perturbation.
5. **Threat 5: DDS Communication Disruption (`dds_disruption` / `denial_freeze` — MITRE T1498):**
   * Induces transport-level packet loss ($30\% + 70\% \cdot S$) or complete publisher topic freezes, evaluating the downstream **Clearance-Bounded Predictive Coasting Watchdog** ($\tau_{\text{grace}} = 120\text{ ms}$) and terminal hold ($500\text{ ms}$).

### Tier II — Zero-Day Control Barrier & Sensory Tampering Vectors (V6–V8)
6. **Threat 6: Zero-Day CBF Boundary Grazing (`cbf_boundary_grazing` / `grazing`):**
   * Probes the boundary of the safe set $\mathcal{C} = \{x : h(x) \ge 0\}$ by injecting subtle forward velocities that stay beneath naive static anomaly thresholds while pushing the chassis toward $d_{\min} \to d_{\text{crit}}$.
7. **Threat 7: Zero-Day CBF Resonant Chattering (`cbf_resonant_chattering` / `chattering`):**
   * Injects high-frequency ($25\text{ rad/s}$) sinusoidal linear and angular velocity oscillations near the Control Barrier Function boundary to test filter smoothness and actuator chattering suppression.
8. **Threat 8: Sensory Blackout & Context Tampering (`sensor_disruption` / `sensor_tampering`):**
   * Simulates perception blackout or corrupted spatial context while maintaining forward drift, testing the **5-Tripwire Zero-Trust Sensory Architecture** and Tier-4/Tier-2 fallback ladder.

### Tier III — Immersive & Adaptive Adversary Vectors (V9–V12)
9. **Threat 9: LiDAR Beam Corruption & Flicker Injection (`lidar_flicker_injection` / `lidar_flicker`):**
   * Injects intermittent $1.5\text{ Hz}$ sensory flicker and phase-alternating drift. In naive boolean verification architectures, a single corrupt tick flips the verification gate to `false` and causes permanent verification livelock; HOROS counters this via a **10-tick leaky gate integrator** and **Tier-2 Dynamic Matrix Clamping**.
10. **Threat 10: Strategic Recovery Flapping / Pulsing Exploitation (`strategic_pulsing` / `aa2_pulsing` — Adaptive Adversary `AA-2a`):**
    * Alternates between a $1.2\text{ s}$ high-severity ON attack burst and a $1.0\text{ s}$ calm OFF window ($T_{\text{pulse}} = 2.2\text{ s}$ duty cycle) within a single episode. During the OFF window, the adversary entices the Recovery Engine into `VERIFICATION` / `PHASED_RECOVERY` and then strikes again to induce motor thrashing. HOROS neutralizes this via **Split-Authority AIMD** (Equation 6) and ramp time-dilation $(1 + 0.5\,N_{\text{flap}})$.
11. **Threat 11: Compound Multi-Vector Stealth Synergy (`compound_multi_vector` / `stealth_compound`):**
    * Simultaneously injects moderate kinematic velocity divergence (linear + angular), moderate message-rate elevation ($\sim 55\text{ Hz}$), and timing jitter so each individual indicator remains sub-critical ($\Phi_{\text{kin}}, \Phi_{\text{rate}}, \Phi_{\text{jit}} \approx 0.50$). Directly validates the **Bounded Dominant-Residual $t$-Conorm (Equation 2)**, which fuses the corroborating residuals into $S_{\text{raw}} \ge 0.65$ instead of suffering from convexity collapse.
12. **Threat 12: Postural ZMP Toppling & Pitch/Yaw Rocking (`postural_toppling_rocking` / `zmp_rocking`):**
    * Injects $10\text{ rad/s}$ bidirectional longitudinal surge/reverse pulses coupled with out-of-phase yaw torque oscillations to excite inverted-pendulum resonance and destabilize the Zero-Moment Point (ZMP) on bipedal (`UBTech YanShee`) and quadruped (`Unitree Go2`) platforms.

### Tier IV — Cryptographic Authentication, Replay, Exfiltration & Attestation Probes (`V13`–`V16` + Enhanced `V3`)
13. **Threat 13 (`V13` / `AA-5b`): Forged Spatial Context Injection (`spoofed_context` — [`spoofed_context.py`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_attack_injector/horos_attack_injector/attacks/spoofed_context.py), MITRE T1565.001 / T0832):**
    * Broadcasts forged `RobotContext` packets at $20\text{ Hz}$ claiming `obstacle_distance = 5.0 m` (`CONTEXT_OPEN_FIELD`) with an unauthenticated/random HMAC tag while commanding a forward velocity surge ($v_x = 0.75\,S\text{ m/s}$). Directly tests `HOROS-Sec` HMAC-SHA256 verification on `/horos/context` (Reviewer Issue 2.3), verifying that forged context packets are rejected in $O(1)$ time and trigger Zero-Trust Sensory Disruption Fallback (`obstacle_distance = -1.0`).
14. **Threat 14 (`V14`): Packet Capture Replay & Forged MAC Bit-Flip (`replay_and_mac_spoof` — [`replay_and_mac_spoof.py`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_attack_injector/horos_attack_injector/attacks/replay_and_mac_spoof.py), MITRE T0830 / T1557):**
    * Captures legitimate signed `RobotContext` messages observed when the robot was in open space and replays them verbatim (valid HMAC tag, duplicate/stale `seq_num` and `monotonic_ns`), alternating with payload mutations (`obstacle_distance = 5.0 m`) and forged `AuthenticatedTwist` frames on `/yanshee/safe_cmd_vel_sec`. Tests the 64-bit sliding anti-replay window (`SeqReplayWindow`) and constant-time tag verification.
15. **Threat 15 (`V15`): Camera Stream Exfiltration & Wiretapping Probe (`camera_exfiltration_probe` — [`camera_exfiltration_probe.py`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_attack_injector/horos_attack_injector/attacks/camera_exfiltration_probe.py), MITRE T1041 / T0882):**
    * Subscribes to `/yanshee/camera/encrypted` (`EncryptedCameraFrame`) during an active attack and attempts unauthorized ChaCha20-Poly1305 decryption without `KeyStore('camera_aead')`, while auditing `raw_rgb_shed` and ciphertext length. Verifies both AEAD authentication failure and attack-time semantic RGB pixel shedding (`0 B` pixel leakage).
16. **Threat 16 (`V16`): Runtime Node Binary/Config Integrity Tampering Probe (`integrity_tamper_probe` — [`integrity_tamper_probe.py`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_attack_injector/horos_attack_injector/attacks/integrity_tamper_probe.py), MITRE T1565 / T0839):**
    * Injects tampered `HealthResponse` messages on `/horos/health_response` carrying altered SHA-256 digests (`deadbeef...`) to test `IntegrityVerifier` (`Gate G5: check_node_integrity`) and verify immediate fail-closed lockout into `STATE_FAILED_HOLD` ($v_{\text{ceiling}} = 0.0\text{ m/s}$).
17. **Enhanced Threat 3 (`V3`): Unauthenticated Direct Actuator Bypass (`rogue_node` — [`rogue_node.py`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_attack_injector/horos_attack_injector/attacks/rogue_node.py)):**
    * Extended to simultaneously inject unauthenticated `AuthenticatedTwist` packets with forged MAC tags (`sender_id = 999`) onto `/yanshee/safe_cmd_vel_sec`, testing actuator-bridge cryptographic rejection.

---

## 3. Node Interface Specifications

### 3.1 Subscribed Topics
* `/cmd_vel_nominal` ([`geometry_msgs/msg/Twist`](https://docs.ros.org/en/humble/p/geometry_msgs/interfaces/msg/Twist.html), QoS: Reliable, Depth 10): Clean velocity stream produced by the high-level patrol planner.

### 3.2 Published Topics
* `/cmd_vel_raw` ([`geometry_msgs/msg/Twist`](https://docs.ros.org/en/humble/p/geometry_msgs/interfaces/msg/Twist.html), QoS: Reliable, Depth 10): Compromised (or nominal passthrough) command stream routed to Domain 1 [`horos_mitigation_engine`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_mitigation_engine/src/mitigation_engine_node.cpp).
* `/horos/attack_alert` ([`horos_interfaces/msg/AttackAlert`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_interfaces/msg/AttackAlert.msg), QoS: 10): Notification stream indicating threat active status, canonical attack type, and severity $S \in [0.0, 1.0]$.
* `/horos/ground_truth_attack` ([`horos_interfaces/msg/AttackAlert`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_interfaces/msg/AttackAlert.msg), QoS: 10): Unfiltered ground-truth telemetry consumed by [`benchmark_tracer_node`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_attack_injector/horos_attack_injector/benchmark_tracer_node.py) to independently calculate true positive rates, detection latencies, and mitigation effectiveness.

### 3.3 Services Hosted
* `/horos/trigger_attack` ([`horos_interfaces/srv/TriggerAttack`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_interfaces/srv/TriggerAttack.srv)): Deterministic runtime interface utilized by automated benchmarking harnesses and human operators.
  * **Request:** `string attack_type`, `float64 severity`, `float64 duration_sec`.
  * **Response:** `bool success`, `string message`.

### 3.4 Service Clients
* `/horos/set_mitigation_mode` ([`horos_interfaces/srv/SetMitigationMode`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_interfaces/srv/SetMitigationMode.srv)): Used during Threat Vector 4 (`unauthorized_service`) to verify whether the downstream mitigation engine's state-gated authorization barrier correctly blocks unauthorized mode modifications.

### 3.5 Node Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `active` | bool | `False` | Global adversary enable flag. |
| `attack_type` | string | `'none'` | Active canonical threat identifier (13 supported vectors; see Section 4). |
| `severity` | float | `0.0` | Continuous scalar cyber severity $S \in [0.0, 1.0]$. |
| `default_output_rate` | float | `20.0` | Nominal execution frequency of the primary injection timer (Hz). |
| `flood_rate` | float | `200.0` | Baseline frequency for the high-rate DoS flooding timer (Hz). |
| `oracle_publish_alerts` | bool | `True` | Publishes alerts to `/horos/attack_alert` when `True`, or strictly ground-truth when evaluating passive detection. |

---

## 4. Mathematical Attack Injection Models (All 13 Threat Vectors)

The node delegates command perturbation, packet-drop decisions, auxiliary exploit timers, and alert duty-cycle modulation from [`apply_attack_profile()`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_attack_injector/horos_attack_injector/attack_injector_node.py) to individual strategy modules in [`horos_attack_injector/attacks/`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_attack_injector/horos_attack_injector/attacks/__init__.py) that scale dynamically with cyber severity $S \in [0.0, 1.0]$:

### 4.1 Threat 1a: Longitudinal Velocity Spike Surge (`unauthorized_velocity` / `spike`)
Injects a high-magnitude longitudinal forward surge while keeping angular velocity equal to the nominal planner command (isolating longitudinal surge evaluation from lateral steering attacks):

$$v_{x,\text{out}} = v_{x,\text{nom}} + 3.0 \cdot S, \qquad \omega_{z,\text{out}} = \omega_{z,\text{nom}}$$

* **Objective:** Exceed physical kinematic stopping limits and test whether severity-aware CBF clamping preserves safe forward task continuity.

### 4.2 Threat 1b: Stealth Lateral Steering Bias Drift (`bias_drift` / `steering_bias`)
Simulates stealthy sensor bias or actuator steering tampering:

$$v_{x,\text{out}} = v_{x,\text{nom}} + 0.25 \cdot S, \qquad \omega_{z,\text{out}} = \omega_{z,\text{nom}} + 0.35 \cdot S$$

* **Objective:** Stay beneath crude 1D linear-velocity anomaly thresholds while steadily forcing the robot to veer off its corridor centerline into side walls.

### 4.3 Threat 2: High-Frequency Flooding DoS (`flooding_dos` / `flood`)
Dynamically provisions a secondary high-frequency timer executing at:

$$f_{\text{flood}} = 100.0 + 300.0 \cdot S \quad [\text{Hz}]$$

During each flood tick, spoofed command packets are flooded onto `/cmd_vel_raw`:

$$v_{x,\text{flood}} = 1.5 \cdot S, \qquad \omega_{z,\text{flood}} = 2.5 \cdot S$$

Simultaneously, the main loop injects payload noise:

$$v_{x,\text{out}} = v_{x,\text{nom}} + 0.4 \cdot S, \qquad \omega_{z,\text{out}} = \omega_{z,\text{nom}} - 0.4 \cdot S$$

* **Objective:** Overwhelm ROS 2 DDS message queues, test token-bucket rate limiting, and validate pre-bucket kinematic plausibility filtering.

### 4.4 Threat 3: Rogue Node Injection (`rogue_node` / `rogue`)
Instantiates a $40\text{ Hz}$ ($25\text{ ms}$ period) asynchronous competing publisher dispatching randomized hostile maneuvers:

$$v_{x,\text{rogue}} = 0.70 \cdot S, \qquad \omega_{z,\text{rogue}} = \pm 1.20 \cdot S$$

Concurrently, the primary timer overrides nominal commands:

$$v_{x,\text{out}} = 0.60 \cdot S, \qquad \omega_{z,\text{out}} = -1.50 \cdot S$$

* **Objective:** Cause rapid contradictory command alternation, actuator chatter, and yaw disorientation.

### 4.5 Threat 4: Unauthorized Service Invocation (`unauthorized_service` / `service_abuse`)
Asynchronously calls `/horos/set_mitigation_mode` with payload `target_mode = "BYPASS"`, attempting to disarm defensive shields while injecting moderate physical perturbations:

$$v_{x,\text{out}} = v_{x,\text{nom}} + 1.2 \cdot S, \qquad \omega_{z,\text{out}} = \omega_{z,\text{nom}} + 1.0 \cdot S$$

* **Objective:** Verify that the State-Gated Authorization Barrier in `MitigationEngineNode` rejects runtime downgrade requests while under active attack.

### 4.6 Threat 5: DDS Communication Disruption (`dds_disruption` / `denial_freeze`)
Simulates severe transport-level packet drops and frozen DDS publishers. At every cycle of the $20\text{ Hz}$ loop:

$$P(\text{drop}) = 0.30 + 0.70 \cdot S$$

* **Objective:** Test the **Clearance-Bounded Predictive Coasting Watchdog** ($\tau_{\text{grace}} = 0.12\text{ s}$) and terminal watchdog hold ($\tau_{\text{wd}} = 0.50\text{ s}$).

### 4.7 Threat 6: Zero-Day CBF Boundary Grazing (`cbf_boundary_grazing` / `grazing`)
Injects a persistent forward creep that probes the safe barrier boundary $h(x) = d_{\min} - d_{\text{crit}} \to 0^+$:

$$v_{x,\text{out}} = \max(v_{x,\text{nom}}, 0.20) + 0.35 \cdot S, \qquad \omega_{z,\text{out}} = 0.50 \cdot \omega_{z,\text{nom}}$$

* **Objective:** Evaluate continuous Nagumo-Ames Control Barrier projection $v_{\text{clamp}}(d_{\min})$ against stealthy boundary-probing crawls.

### 4.8 Threat 7: Zero-Day CBF Resonant Chattering (`cbf_resonant_chattering` / `chattering`)
Injects $25\text{ rad/s}$ harmonic oscillations on both linear and angular velocity channels:

$$v_{x,\text{out}} = v_{x,\text{nom}} + 0.35\,S\,\sin(25\,t), \qquad \omega_{z,\text{out}} = \omega_{z,\text{nom}} + 0.50\,S\,\cos(25\,t)$$

* **Objective:** Excite high-frequency limit-cycle chattering near the barrier boundary and verify smooth clamping stability.

### 4.9 Threat 8: Sensory Blackout & Context Tampering (`sensor_disruption` / `sensor_tampering`)
Forces explicit perception tampering alerts while accelerating forward and veering laterally:

$$v_{x,\text{out}} = \max(v_{x,\text{nom}}, 0.15)(1 + 0.50\,S), \qquad \omega_{z,\text{out}} = \omega_{z,\text{nom}} + 0.25\,S$$

* **Objective:** Validate the Zero-Trust Sensory Architecture's Tier-4 Latched Protective Hold (`ADAPTIVE_ZERO_TRUST_SENSORY_HALT`).

### 4.10 Threat 9: LiDAR Beam Corruption & Flicker Injection (`lidar_flicker_injection` / `lidar_flicker`)
Alternates perturbation polarity at a $1.5\text{ Hz}$ flicker frequency ($\phi(t) = \sin(2\pi \cdot 1.5\,t)$):

$$(v_{x,\text{out}}, \omega_{z,\text{out}}) = \begin{cases}
\bigl(\max(v_{x,\text{nom}}, 0.18) + 0.45\,S,\; \omega_{z,\text{nom}} + 0.30\,S\bigr), & \text{if } \sin(3\pi t) \ge 0 \\[4pt]
\bigl(v_{x,\text{nom}} + 0.15\,S,\; \omega_{z,\text{nom}} - 0.15\,S\bigr), & \text{if } \sin(3\pi t) < 0
\end{cases}$$

* **Objective:** Test Tier-2 Perception Quarantine (`ADAPTIVE_SENSORY_FALLBACK_DYNAMIC_CLAMP`) and verify that the 10-tick leaky integrator in `VERIFICATION_STATE` prevents verification livelock under intermittent $1.5\text{ Hz}$ sensor glitches.

### 4.11 Threat 10: Strategic Recovery Flapping / Pulsing Exploitation (`strategic_pulsing` / `aa2_pulsing`)
Implements Adaptive Adversary `AA-2a` via a periodic $T_{\text{pulse}} = 2.20\text{ s}$ square-wave duty cycle ($1.20\text{ s}$ ON burst / $1.00\text{ s}$ OFF calm window). Let $\tau_p = t \bmod 2.20$:

$$(v_{x,\text{out}}, \omega_{z,\text{out}}, \text{alert}) = \begin{cases}
\bigl(v_{x,\text{nom}} + 2.20\,S,\; \omega_{z,\text{nom}} + 0.85\,S,\; \text{True}\bigr), & \text{if } \tau_p < 1.20\text{ s (ON Burst)} \\[4pt]
\bigl(v_{x,\text{nom}},\; \omega_{z,\text{nom}},\; \text{False}\bigr), & \text{if } 1.20\text{ s} \le \tau_p < 2.20\text{ s (Calm Window)}
\end{cases}$$

* **Objective:** Entice the Recovery Engine into `VERIFICATION` and `PHASED_RECOVERY` during the $1.0\text{ s}$ calm window, then strike with the subsequent ON burst to test **Split-Authority AIMD Anti-Flapping** (Equation 6), continuous relapse memory $k_{\text{eff}}(t)$, and ramp time-dilation.

### 4.12 Threat 11: Compound Multi-Vector Stealth Synergy (`compound_multi_vector` / `stealth_compound`)
Excites all three anomaly channels ($\Phi_{\text{kin}}, \Phi_{\text{rate}}, \Phi_{\text{jit}}$) simultaneously at moderate sub-critical amplitudes by combining a primary kinematic perturbation with an asynchronous $f_{\text{comp}} = 35 + 30\,S\text{ Hz}$ jittered auxiliary timer ($\zeta(t) = 1 + 0.25\sin(17\,t)$):

$$v_{x,\text{comp}}(t) = v_{x,\text{nom}} + 0.85\,S\,\zeta(t), \qquad \omega_{z,\text{comp}}(t) = \omega_{z,\text{nom}} + 0.65\,S\,\zeta(t)$$

* **Objective:** Directly validate **Equation 2 (Bounded Dominant-Residual $t$-Conorm)**:
  
$$S_{\text{raw}}(t) = \Phi_{i^{\star}}(t) + \bigl(1 - \Phi_{i^{\star}}(t)\bigr)\sum_{j \ne i^{\star}} w_j \Phi_j(t)$$

  proving that HOROS escalates compound multi-vector stealth anomalies ($S_{\text{raw}} \ge 0.65$) where a naive max-operator stalls at $0.50$.

### 4.13 Threat 12: Postural ZMP Toppling & Pitch/Yaw Rocking (`postural_toppling_rocking` / `zmp_rocking`)
Injects $10\text{ rad/s}$ bidirectional surge reversals coupled with out-of-phase yaw oscillations:

$$v_{x,\text{out}}(t) = v_{x,\text{nom}} + 1.10\,S\,\sin(10\,t), \qquad \omega_{z,\text{out}}(t) = \omega_{z,\text{nom}} + 1.35\,S\,\cos(10\,t)$$

* **Objective:** Excite chassis pitch/roll resonance and test the **Linear Inverted Pendulum Model (LIPM) Zero-Moment Point (ZMP) Postural Guard** (`ADAPTIVE_POSTURAL_BALANCE_STABILIZATION`) and $C^2$ Quintic Hermite zero-jerk recovery.

### 4.14 Threat 13 (V13 / AA-5b): Forged Spatial Context Injection (`spoofed_context`)
Broadcasts unauthenticated or forged `RobotContext` telemetry at $20\text{ Hz}$ on `/horos/context` claiming an obstacle-free open corridor ($d_{\min} = 5.0\text{ m}$, `CONTEXT_OPEN_FIELD`) with random or invalid HMAC tags, while concurrently injecting forward velocity surges:

$$v_{x,\text{out}} = v_{x,\text{nom}} + 0.75\,S, \qquad \omega_{z,\text{out}} = \omega_{z,\text{nom}}$$

* **Mathematical Attack Objective:** Exploit unauthenticated context topics to blind the downstream 1D Sampled-Data Control Barrier Function (SD-CBF):
  $$h(d_{\min}) = d_{\min} - d_{\text{crit}} - v_{\text{obs,closing}} T_s \ge 0$$
  by replacing physical proximity ($d_{\min} \le 0.45\text{ m}$) with an artificial $5.0\text{ m}$ reading.
* **HOROS-Sec Defense:** The C++ mitigation engine inspects `/horos/context` using `HMAC-SHA256` key verification (`KeyStore('context')`). Forged packets fail constant-time MAC verification (`CRYPTO_memcmp`), are immediately discarded in $3.10\,\mu\text{s}$, and trigger the Zero-Trust Sensory Fallback tripwire ($d_{\min} \leftarrow -1.0\text{ m}$), enforcing safe predictive stopping.

### 4.15 Threat 14 (V14): Packet Capture Replay & Forged MAC Bit-Flip (`replay_and_mac_spoof`)
Captures authentic, signed `RobotContext` and `AuthenticatedTwist` messages transmitted during benign open-field operation, then re-injects them verbatim during confined corridor transit. Alternates between duplicate sequence replaying and single-bit tag tampering:

$$\text{Replay: } (\text{payload}_k, \text{seq}_k, t_k, \text{tag}_k) \quad \text{where } t_{\text{current}} - t_k > T_{\text{max\_age}} \lor \text{seq}_k \in \mathcal{W}_{\text{seen}}$$
$$\text{MAC Tamper: } \text{tag}' = \text{tag} \oplus \mathbf{e}_i, \quad \mathbf{e}_i \in \{0, 1\}^{256}, \; \|\mathbf{e}_i\|_1 \ge 1$$

* **Objective:** Circumvent static cryptographic signature checks that lack sequence tracking or freshness verification.
* **HOROS-Sec Defense:** Evaluated via the zero-allocation $O(1)$ 64-bit sliding replay window (`SeqReplayWindow`). Packets with duplicate sequence indices ($\text{seq}_k \le \text{seq}_{\max}$ and bit already set in `window_mask`) or stale timestamps ($\Delta t > 500\text{ ms}$, or future clock skew $> 50\text{ ms}$) are rejected in $0.60\,\mu\text{s}$ without decrypting or processing.

### 4.16 Threat 15 (V15): Camera Stream Exfiltration & Passive Wiretapping Probe (`camera_exfiltration_probe`)
Acts as an unauthorized eavesdropping subscriber on `/yanshee/camera/encrypted` (`EncryptedCameraFrame.msg`) and attempts unauthenticated ChaCha20-Poly1305 decryption without the companion computer's derived shared secret `KeyStore('camera_aead')`. Simultaneously monitors network data leakage during active attacks:

$$\text{Ciphertext Audit: } C = \operatorname{ChaCha20-Poly1305}_{\mathcal{K}}(P, N, \text{AAD}) \quad \text{vs.} \quad P_{\text{shed}} = \emptyset \quad (|P| = 0\text{ B})$$

* **Objective:** Wiretap visual operational environment data and evaluate whether crypto overhead introduces actuator control latency.
* **HOROS-Sec Defense:** Unauthenticated subscribers cannot forge the Poly1305 MAC tag and fail AEAD authentication. Furthermore, during active cyberattack states (`SUSPECTED_ATTACK`, `PROTECTIVE_RESPONSE`, or `FAILED_HOLD`), `CameraPrivacyGuard` enforces **Semantic RGB Pixel Shedding** ($0\text{ B}$ payload, `raw_rgb_shed = True`), dropping raw pixel leakage to zero while reducing cryptographic latency by $31.4\times$ ($124.43\,\mu\text{s} \to 3.96\,\mu\text{s}$, $0.019\%$ of the $50\text{ Hz}$ control budget).

### 4.17 Threat 16 (V16): Runtime Node Binary & Configuration Tampering Probe (`integrity_tamper_probe`)
Simulates an adversary modifying an on-disk binary, Python script, or YAML configuration profile during an active incident. Injects corrupt `HealthResponse` messages on `/horos/health_response` with forged or mutated SHA-256 digests (`deadbeef...`):

$$\mathcal{H}_{\text{reported}} \ne \mathcal{H}_{\text{golden}} = \operatorname{SHA256}(\text{manifest entry})$$

* **Objective:** Bypass post-attack verification and force an unsafe return to `STATE_NORMAL_OPERATION` while executing compromised code.
* **HOROS-Sec Defense:** `IntegrityVerifier` executes asynchronous $1\text{ Hz}$ audits and performs an immediate synchronous evaluation upon entering `STATE_VERIFICATION`. Detecting digest mismatch or failed HMAC challenge response causes **Gate G5 failure**, immediately transitioning the recovery state machine into unyielding `STATE_FAILED_HOLD` ($v_{\text{ceiling}} = 0.0\text{ m/s}$).

---

## 5. Modular Strategy Architecture & Extending with New Threat Vectors

To keep each adversarial model isolated, testable offline, and easy to maintain, `attack_injector_node.py` uses a **Strategy + Registry** pattern inside `src/horos_attack_injector/horos_attack_injector/attacks/`.

### 5.1 Package Structure & Module Mapping
```text
src/horos_attack_injector/
├── setup.py                                  # Uses find_packages(exclude=['test']) so subpackages install
└── horos_attack_injector/
    ├── attack_injector_node.py               # Slim ROS 2 orchestrator & AttackHost implementation
    └── attacks/
        ├── __init__.py                       # ATTACK_CLASSES registry, build_attack_registry(), resolve_attack()
        ├── base.py                           # BaseAttack ABC, AttackHost protocol, copy_planar_twist()
        ├── unauthorized_velocity.py          # V1a: UnauthorizedVelocityAttack
        ├── bias_drift.py                     # V1b: BiasDriftAttack
        ├── flooding_dos.py                   # V2:  FloodingDosAttack (auxiliary 100-400 Hz timer)
        ├── rogue_node.py                     # V3:  RogueNodeAttack (auxiliary 40 Hz timer + HMAC spoof)
        ├── unauthorized_service.py           # V4:  UnauthorizedServiceAttack (/horos/set_mitigation_mode)
        ├── dds_disruption.py                 # V5:  DdsDisruptionAttack (packet-drop hook)
        ├── cbf_boundary_grazing.py           # V6:  CbfBoundaryGrazingAttack
        ├── cbf_resonant_chattering.py        # V7:  CbfResonantChatteringAttack
        ├── sensor_disruption.py              # V8:  SensorDisruptionAttack
        ├── lidar_flicker_injection.py        # V9:  LidarFlickerInjectionAttack
        ├── strategic_pulsing.py              # V10: StrategicPulsingAttack (modulate_alert_state hook)
        ├── compound_multi_vector.py          # V11: CompoundMultiVectorAttack (auxiliary 35-65 Hz jitter timer)
        ├── postural_toppling_rocking.py      # V12: PosturalTopplingRockingAttack
        ├── spoofed_context.py                # V13: SpoofedContextAttack (forged 20 Hz /horos/context)
        ├── replay_and_mac_spoof.py           # V14: ReplayAndMacSpoofAttack (replay window + tag tamper)
        ├── camera_exfiltration_probe.py      # V15: CameraExfiltrationProbeAttack (AEAD wiretap audit)
        └── integrity_tamper_probe.py         # V16: IntegrityTamperProbeAttack (Gate G5 challenge tamper)
```

### 5.2 `BaseAttack` & `AttackHost` Contract
Every threat vector subclasses [`BaseAttack`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_attack_injector/horos_attack_injector/attacks/base.py) and interacts with `AttackInjectorNode` exclusively through the narrow `AttackHost` protocol:

| Hook / Attribute | Purpose | Default / Guarantee |
| :--- | :--- | :--- |
| `canonical_name`, `aliases`, `mitre_id`, `description` | Metadata and `/horos/trigger_attack` lookup keys. | Validated for uniqueness at startup by `build_attack_registry()`. |
| `apply_command_perturbation(nominal, host)` | Pure-math `Twist` transform executed at 20 Hz. | Required (`@abstractmethod`); must **never** log (Rule 3). |
| `on_activate(host)` | One-shot setup (auxiliary timers, exploit service calls). | Invoked synchronously **after** the initial ground-truth `AttackAlert` is published. |
| `on_deactivate(host)` | Optional vector-specific cleanup on stop or preemption. | Host-registered timers via `host.create_auxiliary_timer()` are torn down automatically. |
| `should_drop_main_packet(host)` | Return `True` to suppress the 20 Hz `/cmd_vel_raw` publish. | Returns `False` by default (overridden by V5 `dds_disruption`). |
| `modulate_alert_state(host)` | Return `(under_attack, severity)` for ground-truth alerts. | Returns `(host.is_active, host.severity)` by default (overridden by V10 `strategic_pulsing`). |

### 5.3 Step-by-Step Guide: Adding a New Threat Vector
Adding a new threat vector (e.g., `V13`) requires four self-contained steps without modifying `attack_injector_node.py`:

1. **Create the attack module:** Add `src/horos_attack_injector/horos_attack_injector/attacks/<canonical_name>.py` implementing a `BaseAttack` subclass:
   ```python
   from geometry_msgs.msg import Twist
   from .base import AttackHost, BaseAttack, copy_planar_twist

   class CustomThreatAttack(BaseAttack):
       canonical_name = 'custom_threat'
       aliases = ('custom_threat', 'custom_alias')
       mitre_id = 'T0855'
       description = 'Concise description of the cyber-physical perturbation.'

       def on_activate(self, host: AttackHost) -> None:
           # Optional: register an auxiliary timer or invoke a service via host.
           # Ground-truth AttackAlert is already published before this runs.
           pass

       def apply_command_perturbation(self, nominal: Twist, host: AttackHost) -> Twist:
           compromised = copy_planar_twist(nominal)
           compromised.linear.x += 0.50 * host.severity
           return compromised
   ```
2. **Register the class:** Import the new class in [`attacks/__init__.py`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_attack_injector/horos_attack_injector/attacks/__init__.py) and append it to `ATTACK_CLASSES`. `build_attack_registry()` automatically validates that `canonical_name` and all `aliases` are collision-free and exposes them to `/horos/trigger_attack`.
3. **Add unit tests:** Add deterministic test cases for the new vector's alias resolution, perturbation math, and any lifecycle hooks in [`tests/test_attack_vectors.py`](file:///e:/Giu%20%20files/semster%207/horos_framework/tests/test_attack_vectors.py).
4. **Rebuild and verify:**
   ```bash
   colcon build --packages-select horos_attack_injector
   source install/setup.bash
   python3 -m unittest tests/test_attack_vectors.py -v
   ```

---

## 6. Physical Manifestation: Why the Robot Surges vs. Stalls

A critical question addressed in oral thesis defenses is understanding **why the robot exhibits surging speed in some attacks while stalling/freezing in others**:

```
+-----------------------------------------------------------------------------------------+
|                                PHYSICAL BEHAVIOR BREAKDOWN                               |
+------------------------------------+----------------------------------------------------+
| SURGING / DRIFTING BEHAVIOR        | STALLING / FREEZING BEHAVIOR                       |
+------------------------------------+----------------------------------------------------+
| 1. Velocity Spike (Threat 1a):     | 1. DDS Watchdog Safe Hold (Threat 5):              |
|    Attacker injects massive +vx    |    If no command arrives for dt > 1.0s, watchdog   |
|    causing rapid forward surge.    |    dispatches intentional safe stop (vx=0, wz=0).  |
|                                    |                                                    |
| 2. Steering Bias (Threat 1b):      | 2. Static E-Stop Mode Active:                      |
|    Attacker injects yaw bias wz    |    Any alert under STATIC mitigation triggers      |
|    causing continuous lateral veering. | an unconditional freeze (ESTOP_ZERO).          |
|                                    |                                                    |
| 3. Rogue Node Fishtail (Threat 3): | 3. LiDAR Proximity Invariant (d_min < 0.45m):      |
|    Alternating +/- wz causes rapid |    In ADAPTIVE mode, if proximity threatens safe   |
|    chattering, wobbling, and sway. |    clearance, robot halts to prevent collision.    |
|                                    |                                                    |
| 4. Flooding DoS Lag (Threat 2):    | 4. Post-Attack Verification Hold:                  |
|    Queue buffer overflow causes    |    Robot holds/reduces speed for 0.25s to verify   |
|    jerky stuttering and delayed stop.| sensor health before phased S-curve recovery.    |
+------------------------------------+----------------------------------------------------+
```

---

## 7. Deterministic Service Control, Immersive All-Attacks Suite & Automated Mode-Cycling Resilience Benchmark

The attack injector can be triggered manually via the command line or automatically via the [`scripts/run_abusive_stress_benchmark.py`](file:///e:/Giu%20%20files/semster%207/horos_framework/scripts/run_abusive_stress_benchmark.py) benchmarking harness.

### 7.1 Manual CLI Invocations (All 13 Canonical Vectors)
```bash
# 1. V1a: Longitudinal velocity spike for 5 seconds
ros2 service call /horos/trigger_attack horos_interfaces/srv/TriggerAttack \
  "{attack_type: 'unauthorized_velocity', severity: 0.85, duration_sec: 5.0}"

# 2. V1b: Stealth steering bias drift for 8 seconds
ros2 service call /horos/trigger_attack horos_interfaces/srv/TriggerAttack \
  "{attack_type: 'bias_drift', severity: 0.70, duration_sec: 8.0}"

# 3. V2: 340 Hz flooding DoS for 6 seconds
ros2 service call /horos/trigger_attack horos_interfaces/srv/TriggerAttack \
  "{attack_type: 'flooding_dos', severity: 0.80, duration_sec: 6.0}"

# 4. V3: Rogue node injection for 5 seconds
ros2 service call /horos/trigger_attack horos_interfaces/srv/TriggerAttack \
  "{attack_type: 'rogue_node', severity: 0.75, duration_sec: 5.0}"

# 5. V4: Unauthorized service invocation bypass attempt
ros2 service call /horos/trigger_attack horos_interfaces/srv/TriggerAttack \
  "{attack_type: 'unauthorized_service', severity: 1.00, duration_sec: 3.5}"

# 6. V5: DDS disruption packet loss / freeze for 7 seconds
ros2 service call /horos/trigger_attack horos_interfaces/srv/TriggerAttack \
  "{attack_type: 'dds_disruption', severity: 0.90, duration_sec: 7.0}"

# 7. V6: Zero-day CBF boundary grazing crawl
ros2 service call /horos/trigger_attack horos_interfaces/srv/TriggerAttack \
  "{attack_type: 'cbf_boundary_grazing', severity: 0.85, duration_sec: 4.0}"

# 8. V7: Zero-day CBF resonant chattering (25 rad/s)
ros2 service call /horos/trigger_attack horos_interfaces/srv/TriggerAttack \
  "{attack_type: 'cbf_resonant_chattering', severity: 0.90, duration_sec: 4.0}"

# 9. V8: Sensory blackout & context tampering
ros2 service call /horos/trigger_attack horos_interfaces/srv/TriggerAttack \
  "{attack_type: 'sensor_disruption', severity: 0.95, duration_sec: 4.0}"

# 10. V9: LiDAR beam corruption & 1.5 Hz flicker injection
ros2 service call /horos/trigger_attack horos_interfaces/srv/TriggerAttack \
  "{attack_type: 'lidar_flicker_injection', severity: 0.85, duration_sec: 4.0}"

# 11. V10: Strategic recovery flapping / pulsing (Adaptive Adversary AA-2a)
ros2 service call /horos/trigger_attack horos_interfaces/srv/TriggerAttack \
  "{attack_type: 'strategic_pulsing', severity: 0.90, duration_sec: 4.4}"

# 12. V11: Compound multi-vector stealth synergy (Tests Eq. 2 t-Conorm)
ros2 service call /horos/trigger_attack horos_interfaces/srv/TriggerAttack \
  "{attack_type: 'compound_multi_vector', severity: 0.85, duration_sec: 4.0}"

# 13. V12: Postural ZMP toppling & 10 rad/s pitch/yaw rocking reversals
ros2 service call /horos/trigger_attack horos_interfaces/srv/TriggerAttack \
  "{attack_type: 'postural_toppling_rocking', severity: 0.90, duration_sec: 4.0}"

# Halt any active attack and return to nominal passthrough
ros2 service call /horos/trigger_attack horos_interfaces/srv/TriggerAttack \
  "{attack_type: 'stop', severity: 0.0, duration_sec: 0.0}"
```

### 7.2 Immersive All-13-Attacks Suites (`--all-attacks` / Menu `[8]` & `--all-attacks-sweep` / Menu `[8b]`)
In [`scripts/run_abusive_stress_benchmark.py`](file:///e:/Giu%20%20files/semster%207/horos_framework/scripts/run_abusive_stress_benchmark.py), the 13-attack test is split into two specialized modes:
1. **Option `[8]` (`--all-attacks`): Single-Mode 13-Vector Resilience Suite**  
   Executes all 13 canonical attacks sequentially under whichever defense configuration is currently active, without changing modes.
   ```bash
   python3 scripts/run_abusive_stress_benchmark.py --all-attacks --pause 3.0
   ```
2. **Option `[8b]` (`--all-attacks-sweep`): 4-Mode Comparative 13-Vector Sweep**  
   Systematically runs the complete 13-attack battery while switching the robot's posture across all 4 canonical defense paradigms:
   $$\text{ADAPTIVE} \longrightarrow \text{DYNAMIC} \longrightarrow \text{STATIC} \longrightarrow \text{BYPASS}$$
   and exports a complete cross-mode comparative matrix comparing Task Continuity, worst-case obstacle clearance, algorithmic latency, and survival rates across all $4 \times 13 = 52$ episodes.
   ```bash
   python3 scripts/run_abusive_stress_benchmark.py --all-attacks-sweep --pause 3.0
   ```

### 7.3 Automated Multi-Attack & Simultaneous Mitigation+Recovery Mode-Cycling Resilience Benchmark (`--resilience-cycle` / Menu `[9]`)
To evaluate coupled cross-domain resilience automatically across $\ge 6$ (default $8$, up to all $13$) distinct attack vectors while dynamically reconfiguring **both** the Inline Mitigation Engine (`/horos/set_mitigation_mode`) and the Autonomous Safe Recovery Engine (`/horos/set_recovery_strategy`) simultaneously, `run_automated_resilience_mode_cycling_benchmark()` cycles across **5 Coordinated Multi-Domain Presets**:

| Preset # | Preset ID | Inline Mitigation Mode | Safe Recovery Strategy | Architectural Role Evaluated |
| :---: | :--- | :--- | :--- | :--- |
| **1** | `HOROS_FULL_DEFENSE` | `ADAPTIVE` | `ADAPTIVE` | Full HOROS framework: CBF + spatial-cyber pre-attenuation + dual-tier $C^1/C^2$ S-curve & Split-Authority AIMD. |
| **2** | `STATIC_BASELINE` | `STATIC` | `FIXED_TIME` | Traditional industrial safety: binary E-Stop ($v=0$) with blind $3.0\text{ s}$ timer cooldown. |
| **3** | `DYNAMIC_BASELINE` | `DYNAMIC` | `CONDITION_BASED` | Context-blind severity scaling with instantaneous un-ramped restoration. |
| **4** | `PURE_VULNERABILITY` | `BYPASS` | `FIXED_TIME` | Unmitigated baseline: cyberattacks pass unhindered to actuators. |
| **5** | `HYBRID_C1_DEFENSE` | `ADAPTIVE` | `PHASED_RESTORE` | Adaptive CBF mitigation paired with deterministic $C^1$ Cubic Hermite phased restoration. |

#### Empirical Resilience Telemetry Measurements Collected per Episode
Every episode records strictly observed ROS 2 telemetry (reporting `N/A` if a topic is inactive, in strict compliance with Rule 5):
1. **Mean & Minimum Task Continuity ($\overline{TC}\%$, $TC_{\min}\%$):** Sampled from `MitigationStatus.task_continuity`.
2. **Minimum Obstacle Clearance ($d_{\min}$):** Sampled from `RobotContext.obstacle_distance` (collision flagged if $d_{\min} \le d_{\text{impact}}$).
3. **Algorithmic Selection Latency ($t_{\text{select}}$ in $\mu\text{s}$):** Sampled from `MitigationStatus.algo_latency_ns`.
4. **Measured Recovery Time ($t_{\text{recover}}$ in $\text{s}$):** Elapsed time from attack termination until `RecoveryStatus.current_state == 0` (`NORMAL_OPERATION`) or `recovery_progress_pct >= 90%`.
5. **Relapse Count ($\Delta N_{\text{flap}}$):** State machine rollbacks triggered during the recovery window.
6. **Empirical Composite Resilience Score ($R_{\text{emp}} \in [0, 100]\%$):**

$$R_{\text{emp}} = \mathbb{I}(\text{survived}) \cdot \left(0.45 \cdot \frac{\overline{TC}}{100} + 0.30 \cdot \min\left(1.0, \frac{d_{\min}}{0.60}\right) + 0.25 \cdot \max\left(0.0, 1.0 - \frac{t_{\text{recover}}}{1.5\,T_{\text{window}}}\right)\right) \times 100\%$$

All episode measurements are printed in comparative console matrices and exported to `abusive_resilience_benchmark_<robot>.csv`:
```bash
# Run automated mode-cycling benchmark with 8 distinct attacks across all 5 coupled (Mitigation + Recovery) presets
python3 scripts/run_abusive_stress_benchmark.py --resilience-cycle --num-attacks 8 --pause 3.0

# Run full 13-attack sweep across all 5 coupled (Mitigation + Recovery) presets
python3 scripts/run_abusive_stress_benchmark.py --resilience-cycle --num-attacks 13 --pause 3.0
```

---

## 8. Bachelor Thesis Oral Defense Reference

When questioned about this node during your defense examination:

* **Question:** *"How does your attack injection maintain scientific independence from your defense engines?"*  
  **Answer:** *"The attack injector node operates as an isolated ROS 2 process publishing to `/cmd_vel_raw` and broadcasting an independent `/horos/ground_truth_attack` stream. When passive anomaly detection is evaluated (`oracle_publish_alerts:=False`), the defense engines receive zero oracle hints and must infer $\hat{S}(t)$ strictly from observable kinematic, rate, and timing residuals using Equation 2's Bounded Dominant-Residual $t$-Conorm."*

* **Question:** *"Why did you add `compound_multi_vector` (V11) and `strategic_pulsing` (V10) to the benchmark suite?"*  
  **Answer:** *"`compound_multi_vector` simultaneously excites kinematic divergence, message-rate elevation, and timing jitter at moderate sub-critical levels ($\Phi_i \approx 0.50$), directly demonstrating why Equation 2's Bounded Dominant-Residual $t$-Conorm outperforms a naive max-operator. Meanwhile, `strategic_pulsing` implements Adaptive Adversary `AA-2a` ($1.2\text{ s}$ ON / $1.0\text{ s}$ OFF duty cycle) to entice premature recovery and empirically validate our Split-Authority AIMD Anti-Flapping envelope (Equation 6)."*

* **Question:** *"Why did the robot stall during some attacks instead of speeding up?"*  
  **Answer:** *"Surging speeds occur in data manipulation vectors (`unauthorized_velocity`), where the adversary deliberately injects positive linear velocity. Under `dds_disruption`, packet drops trigger our Clearance-Bounded Predictive Coasting Watchdog ($\tau_{\text{grace}} = 120\text{ ms}$) for smooth decay before engaging a terminal hold at $500\text{ ms}$. Under `STATIC` defense or when LiDAR clearance drops below $d_{\text{crit}}$, physical safety invariants mandate an immediate defensive arrest to guarantee zero collisions."*

---

## 9. Empirical Findings and Multi-Platform Evaluation (657 Simulation Episodes + 22 Physical Trials)

The 13-attack taxonomy was evaluated across two distinct robotic morphologies and real embedded hardware:
* **Unitree Go2 EDU Quadruped Simulation ($N=428$ closed-loop trials):** Evaluated across 4 environments (`OPEN_SPACE`, `CONFINED_SPACE`, `NEAR_HUMAN`, `TIGHT_ROOM`) across all 13 canonical vectors ($n=98$ Bypass, $n=98$ Static, $n=98$ Dynamic, $n=134$ Adaptive).
* **UBTech YanShee Biped Humanoid Simulation ($N=229$ closed-loop trials):** Evaluated across the same 4 environments and 13 vectors ($n=56$ Bypass, $n=56$ Static, $n=56$ Dynamic, $n=61$ Adaptive).
* **UBTech YanShee Live Hardware Evaluation ($N=22$ episodes):** Executed in an embedded single-session patrol run on Raspberry Pi 3 Model B (1.0 GB RAM) with 17 bus servos across 6 threat-vector clusters.

### 9.1 Empirical Summary Matrix Across Both Robotic Morphologies

*(Historical early pilot summary — Go2 $N=428$ / YanShee $N=229$. For final thesis and IEEE paper cohorts see [`master_experiment_manifest.yaml`](file:///e:/Giu%20%20files/semster%207/horos_framework/config/master_experiment_manifest.yaml): Go2 $N=363$, YanShee $N=700$, and $84$ physical YanShee episodes.)*

| Platform / Metric | BYPASS ($\mathbf{K}=\emptyset$) | STATIC (E-Stop) | DYNAMIC (RIPS-Inspired) | ADAPTIVE (HOROS) |
| :--- | :---: | :---: | :---: | :---: |
| **Unitree Go2 ($N=428$ Trials)** | | | | |
| Task Continuity ($\text{TC}_{\text{policy}}$) | $68.3\% \pm 42.4\%$ | $2.1\% \pm 6.5\%$ | $29.1\% \pm 20.7\%$ | **40.6% $\pm$ 26.5%** ($35.1\%$ in corridors) |
| Collision Rate ($k/N$) | $37.8\%$ (37/98) | $32.7\%$ (32/98 avatar) | $37.8\%$ (37/98, $46.2\%$ corridors) | **20.1% (27/134, 0.0% in corridors)** |
| Minimum Obstacle Clearance ($d_{\min}$) | $0.78\text{ m}$ | $0.97\text{ m}$ | $0.80\text{ m}$ | **0.94 m (safely $> 0.45\text{ m}$ buffer)** |
| Attack Containment Rate | $62.2\%$ (61/98) | $67.3\%$ (66/98) | $62.2\%$ (61/98) | **79.9% (107/134)** |
| Algorithmic Selection Latency ($t_{\text{select}}$) | $0.00\text{ ms}$ | $0.05\text{ ms}$ | $0.05\text{ ms}$ | **$<0.05$ ms ($4.28\,\mu\text{s}$ C++ inline)** |
| Time to Safe State ($t_{\text{safe}}$) | N/A | $0.10\text{ s}$ | $0.04\text{ s}$ | **0.16 s (smooth deceleration)** |
| Autonomous Recovery Time ($t_{\text{recover}}$) | N/A | Manual Reset ($18/18$) | $0.83\text{ s}$ | **0.95 s (zero resets)** |
| **UBTech YanShee ($N=229$ Trials)** | | | | |
| Task Continuity ($\text{TC}_{\text{policy}}$) | $35.5\% \pm 30.0\%$ | $2.3\% \pm 7.9\%$ | $36.1\% \pm 28.2\%$ | **13.3% $\pm$ 10.6%** ($5.5\%$ in corridors) |
| Collision Rate ($k/N$) | $10.7\%$ (6/56) | $0.0\%$ (0/56) | $0.0\%$ (0/56) | **1.6% (1/61, avatar crossing only)** |
| Topple Fall Rate ($k/N$) | $0.0\%$ (0/56) | $0.0\%$ (0/56) | $0.0\%$ (0/56) | **0.0% (0/61, upright equilibrium)** |
| Peak Body Tilt Angle ($\theta_{\max}$) | $12.0^\circ$ ($76.5^\circ$ raw) | $2.6^\circ$ ($9.6^\circ$) | $3.1^\circ$ ($10.3^\circ$) | **2.9$^\circ$ (bounded $< 10.7^\circ$)** |
| Minimum Obstacle Clearance ($d_{\min}$) | $1.06\text{ m}$ | $1.39\text{ m}$ | $0.90\text{ m}$ | **2.17 m** |
| Attack Containment Rate | $89.3\%$ (50/56) | $100.0\%$ (56/56) | $100.0\%$ (56/56) | **98.4% (60/61)** |
| C++ Decision Latency ($t_{\text{alg}}$) | $3.0\,\mu\text{s}$ | $2.0\,\mu\text{s}$ | $10.0\,\mu\text{s}$ | **10.0 $\mu$s ($< 500\,\mu$s deadline)** |

### 9.2 Key Findings by Adversarial Tier

#### Tier I (Classic MITRE ATT&CK Robotic Vectors, V1a–V5)
1. **Longitudinal Surge vs. Stealth Bias Drift (V1a/V1b):** Unmitigated `BYPASS` commands drove the robots into obstacles at full velocity ($100\%$ collisions in balanced sets). Under `DYNAMIC` severity scaling, the robot reduced forward speed proportionally to cyber severity ($S$), but because it lacked spatial awareness, it collided with corridor walls in $46.2\%$ of Go2 corridor trials and $66.7\%$ of YanShee tight-space trials. HOROS `ADAPTIVE` eliminated corridor collisions ($0.0\%$) by combining cyber severity scaling with continuous 1D Ames-Nagumo barrier clamping.
2. **Flooding DoS Saturation (V2):** $100\text{--}400\text{ Hz}$ packet flooding saturated DDS message buffers, generating severe timing jitter ($> 200\text{ ms}$) in unmitigated configurations. The leaky-bucket rate limiter in `mitigation_engine_node.cpp` effectively dropped excess packets above the $25\text{ Hz}$ capacity threshold, preserving deterministic execution without thread exhaustion.
3. **Rogue Node & Conflicting Directives (V3):** An unauthorized publisher injecting contradictory $+1.2\text{ rad/s}$ yaw commands produced severe chassis fishtailing in `BYPASS`. HOROS isolated rogue commands via origin filtering and kinematic consistency checks, maintaining stable straight-line corridor navigation.
4. **Unauthorized Service Downgrade Bypass (V4):** Adversary calls to `/horos/set_mitigation_mode` requesting `target_mode = "BYPASS"` were intercepted and rejected with HTTP-style $403$ Forbidden error codes by the State-Gated Authorization Barrier, preventing defense disarmament under active attack.
5. **DDS Communication Disruption & Watchdog Hold (V5):** Under $30\text{--}100\%$ transport packet loss or topic freezes, the predictive coasting watchdog maintained stable deceleration for $\tau_{\text{grace}} = 120\text{ ms}$ before transitioning to a safe protective stop at $500\text{ ms}$, avoiding violent kinetic snapping.

#### Tier II (Zero-Day CBF & Sensory Tampering Vectors, V6–V8)
6. **CBF Boundary Grazing Probing (V6):** Stealthy low-amplitude forward creep designed to skirt binary detection thresholds was intercepted by the continuous Nagumo barrier projection $v_{\text{clamp}}(d_{\min})$, which smoothly throttled velocity to zero as $d_{\min} \to d_{\text{crit}} = 0.45\text{ m}$ without requiring explicit cyber alarm activation.
7. **CBF Resonant Chattering (V7):** $25\text{ rad/s}$ harmonic oscillations near the barrier boundary failed to induce high-frequency limit cycles; the $C^1$ velocity projection dampened velocity oscillations, ensuring smooth motor actuation.
8. **Sensory Blackout & Tampering (V8):** Perception blackout and corrupted LiDAR ranges were captured by the 5-Tripwire Zero-Trust Sensory Architecture within $500\text{ ms}$ (5 ticks), triggering Tier-4 Latched Protective Hold or the $40\%$ blind crawl fallback mode with zero wall collisions.

#### Tier III (Immersive & Adaptive Adversary Vectors, V9–V12)
9. **LiDAR Beam Corruption & Flicker Injection (V9):** Naive boolean verification architectures suffered from livelock under $1.5\text{ Hz}$ sensor flicker (a single corrupted scan reset the timer to zero). HOROS's 10-tick leaky gate accumulator absorbed intermittent flicker, allowing verified recovery to proceed once sustained spatial clearance was confirmed.
10. **Strategic Recovery Flapping / Pulsing (V10 / AA-2a):** A pulsing adversary alternating $1.2\text{ s}$ ON / $1.0\text{ s}$ OFF bursts induced rapid flapping oscillations (14--16 relapses) in unthrottled baselines. HOROS's Split-Authority AIMD exponential backoff bounded relapses to 5--6, transitioning into protective hold when necessary without requiring manual operator intervention.
11. **Compound Multi-Vector Stealth Synergy (V11):** Sub-critical anomalies across velocity, rate, and jitter channels ($\Phi_i \approx 0.50$) were successfully aggregated by the Bounded Dominant-Residual $t$-Conorm (Equation 2) into an effective severity score of $S_{\text{raw}} \ge 0.65$, triggering prompt mitigation where a standard maximum operator failed.
12. **Postural ZMP Toppling & Rocking (V12):** $10\text{ rad/s}$ bidirectional surge reversals coupled with yaw rocking induced severe tipping in unmitigated biped configurations ($88.9\%$ topples in `BYPASS`, mean peak tilt $68.4^\circ$). HOROS's Zero-Moment Point (ZMP) postural guard bounded peak tilt to $2.9^\circ$ on YanShee ($0/61$ topples) and preserved quadruped stability throughout.

#### Tier IV (Cryptographic Authentication, Replay, Exfiltration & Attestation Vectors, V13–V16)
13. **Forged Context Boundary Spoofing (V13 / AA-5b):** By transmitting fake open-space telemetry ($d_{\min} = 5.0\text{ m}$), an adversary without crypto authentication causes context-blind RTA baselines to crash into obstacles. Under `HOROS-Sec`, HMAC-SHA256 signature verification over `/horos/context` identifies forged messages in $3.10\,\mu\text{s}$, discards every unauthorized packet ($0\text{ bytes}$ processed by RTA), and engages Zero-Trust sensory fallback, yielding $0.0\%$ collisions and maintaining $\text{TC}_{\text{safe}} = 65.4\%$ (Go2) and $64.3\%$ (YanShee).
14. **Packet Replay & MAC Bit-Flipping (V14):** Replaying authentic pre-recorded context and control messages from open areas bypasses static cryptographic checksums. `HOROS-Sec`'s 64-bit sliding replay window (`SeqReplayWindow`) detects duplicate sequence indices and timestamp expiration ($\Delta t > 500\text{ ms}$) in $0.60\,\mu\text{s}$, rejecting $100\%$ of replayed packets ($0/3,359$ drops bypassed) while preserving $\text{TC}_{\text{safe}} = 74.6\%$ (Go2) and $65.4\%$ (YanShee).
15. **Camera Exfiltration & Wiretapping (V15):** Unauthorized eavesdroppers cannot decrypt ChaCha20-Poly1305 video payloads without the companion shared secret. During attack states (`SUSPECTED_ATTACK`, `PROTECTIVE_RESPONSE`, `FAILED_HOLD`), `CameraPrivacyGuard` executes semantic pixel shedding ($0\text{ B}$ payload, `raw_rgb_shed = True`), dropping raw pixel leakage to $0.0\text{ B}$ while reducing crypto encryption overhead by $31.4\times$ ($124.43\,\mu\text{s} \to 3.96\,\mu\text{s}$), achieving $\text{TC}_{\text{safe}} = 69.6\%$ (Go2) and $64.9\%$ (YanShee).
16. **Post-Attack Runtime Node/Config Tampering (V16):** Injecting tampered SHA-256 digests (`deadbeef...`) on `/horos/health_response` causes `IntegrityVerifier` to fail **Gate G5** during `STATE_VERIFICATION`. Rather than resuming motion over compromised code, the recovery engine triggers an unyielding fail-closed latch into `STATE_FAILED_HOLD` ($v_{\text{ceiling}} = 0.0\text{ m/s}$), safely bounding Task Continuity to legitimate pre-tamper operations ($\text{TC}_{\text{safe}} = 4.8\%$ Go2, $1.6\%$ YanShee) with zero collisions or unauthorized gait actuation.

