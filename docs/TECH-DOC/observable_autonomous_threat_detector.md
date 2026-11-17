# HOROS Technical Specification: Observable-Based Autonomous Threat Detector (Patch 2)

**Document ID:** `TECH-DOC-DETECTOR-01`  
**Classification:** Threat Detection Architecture & Passive Telemetry Scoring  
**Author:** Youssef Ashraf Khalil  
**Institution:** German International University (GIU Cairo)  
**Academic Degree:** Bachelor of Science in Computer Science  
**Supervisors:** Dr. Marwa Zamzam, Prof. Slim Abdennadher  
**Target Platforms:** Unitree Go2 EDU Quadruped / UBTech Yanshee Humanoid / ROS 2 Humble LTS  

---

## 1. Architectural Motivation: Eliminating the "Oracle" Dependency

In academic cyber-physical security simulations, intrusion prevention systems frequently suffer from **Oracle Dependency**: the attack injection harness (`attack_injector_node`) broadcasts an alert topic (`/horos/attack_alert`) announcing `under_attack = True` along with the ground-truth severity $S_{\text{true}} \in [0.0, 1.0]$.

In real-world deployments, an adversarial attacker will never announce their presence or transmit their attack intensity.

**Remediation (Patch 2):**  
HOROS deploys an **Autonomous Observable Threat Detector** ([`src/horos_attack_injector/horos_attack_injector/threat_detector_node.py`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_attack_injector/horos_attack_injector/threat_detector_node.py)). It operates strictly on **passive cyber-physical observables** extracted from incoming ingress commands (`/cmd_vel_raw`) and physical wheel/joint odometry (`/odom`), synthesizing an estimated threat severity $\hat{S} \in [0.0, 1.0]$ in real-time ($O(1)$ complexity, $< 0.15\text{ ms}$ latency).

```
   /cmd_vel_raw (Ingress Commands)                     /odom (Physical Ground State)
                 │                                                   │
                 ├───────────────────────┐                           │
                 │                       │                           │
                 ▼                       ▼                           ▼
  ┌─────────────────────────────┐ ┌──────────────────────────────────────────────┐
  │ 1. Rate Anomaly Tracker     │ │ 2. Kinematic Divergence Engine               │
  │ • Measures message arrival  │ │ • Audits actuator velocity limits            │
  │   frequency f_cmd (Hz)      │ │   |v_cmd| > v_max or |w_cmd| > w_max         │
  │ • Detects Flooding DoS      │ │ • Audits odometric discordance:              │
  │   (100 - 500 Hz)            │ │   |v_cmd - v_odom| > divergence_threshold    │
  │   Φ_rate ∈ [0.0, 1.0]       │ │   Φ_kin ∈ [0.0, 1.0]                         │
  └──────────────┬──────────────┘ └──────────────────────┬───────────────────────┘
                 │                                       │
                 │        ┌──────────────────────────────┘
                 │        │
                 │        │        ┌─────────────────────────────────────────────┐
                 │        │        │ 3. DDS Transport Jitter & Silence Tracker   │
                 │        │        │ • Monitors inter-arrival delta: Δt_arrival  │
                 │        │        │ • Detects DDS packet drop & transport freeze│
                 │        │        │   Δt > 0.40s -> Φ_jitter ∈ [0.0, 1.0]       │
                 │        │        └─────────────────────┬───────────────────────┘
                 │        │                              │
                 ▼        ▼                              ▼
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │ Multi-Dimensional Threat Synthesizer:                                        │
  │ Ŝ = min(1.0, 0.40 · Φ_kin + 0.35 · Φ_rate + 0.25 · Φ_jitter)                 │
  └──────────────────────────────────────┬───────────────────────────────────────┘
                                         │ (If Ŝ ≥ threshold = 0.20)
                                         ▼
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │ Broadcasts Autonomous /horos/attack_alert:                                   │
  │ • under_attack = True                                                        │
  │ • severity = Ŝ                                                               │
  │ • attack_type = HIGH_FREQUENCY_FLOOD | DDS_DISRUPTION | CMD_VEL_SPIKE        │
  └──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Mathematical Observable Formulations

### 2.1 Rate Anomaly Metric ($\Phi_{\text{rate}}$)
Mitigates Threat Vector 2 (High-Frequency Flooding DoS, $100 - 500\text{ Hz}$).
A sliding window of recent message arrival times $T = [t_1, t_2, \dots, t_N]$ ($N = 25$) computes instantaneous arrival frequency:
$$f_{\text{meas}} = \frac{N - 1}{t_N - t_1}$$
When $f_{\text{meas}}$ exceeds the nominal control loop frequency threshold ($f_{\text{thresh}} = 80.0\text{ Hz}$):
$$\Phi_{\text{rate}} = \min\left(1.0,\ \max\left(0.0,\ \frac{f_{\text{meas}} - f_{\text{thresh}}}{400.0}\right)\right)$$

### 2.2 Kinematic Divergence Metric ($\Phi_{\text{kin}}$)
Mitigates Threat Vector 1 (Unauthorized Velocity Injection) and Rogue Publisher Steering Bias.
1. **Actuator Envelope Violations:** Compares commanded velocities against declarative robot profile limits ($v_{\max}, \omega_{\max}$):
   $$\text{excess}_v = \frac{\max(0.0,\ |v_{\text{cmd}}| - v_{\max})}{v_{\max}}, \quad \text{excess}_\omega = \frac{\max(0.0,\ |\omega_{\text{cmd}}| - \omega_{\max})}{\omega_{\max}}$$
2. **Odometry Discordance:** Compares commanded forward velocity against sensed ground odometry velocity ($v_{\text{odom}}$):
   $$\Delta v = |v_{\text{cmd}} - v_{\text{odom}}|$$
   $$\text{div}_v = \min\left(1.0,\ \frac{\max(0.0,\ \Delta v - \Delta v_{\text{thresh}})}{0.80}\right) \quad (\text{where } \Delta v_{\text{thresh}} = 0.40\text{ m/s})$$
3. **Composite Metric:**
   $$\Phi_{\text{kin}} = \min\left(1.0,\ \max\left(1.5 \cdot \text{excess}_v,\ 1.5 \cdot \text{excess}_\omega,\ \text{div}_v\right)\right)$$

### 2.3 Transport Jitter & Silence Metric ($\Phi_{\text{jitter}}$)
Mitigates Threat Vector 5 (DDS Transport Disruption & Packet Freeze).
Monitors elapsed wall-clock duration since the last valid command arrival ($\Delta t = t_{\text{now}} - t_{\text{last\_cmd}}$):
$$\Phi_{\text{jitter}} = \begin{cases}
0.0 & \text{if } \Delta t \le \tau_{\text{jitter}} \\
\min\left(1.0,\ \frac{\Delta t - \tau_{\text{jitter}}}{0.80}\right) & \text{if } \Delta t > \tau_{\text{jitter}}
\end{cases} \quad (\text{where } \tau_{\text{jitter}} = 0.40\text{ s})$$

---

## 3. Threat Severity Synthesis & Classification

The synthesized estimated severity $\hat{S}$ is computed at $20\text{ Hz}$:
$$\hat{S} = \min\left(1.0,\ 0.40 \cdot \Phi_{\text{kin}} + 0.35 \cdot \Phi_{\text{rate}} + 0.25 \cdot \Phi_{\text{jitter}}\right)$$

### State Machine & Classification Logic:
* **Trigger Threshold ($\hat{S} \ge 0.20$):**
  Sets `under_attack = True` and classifies the attack based on the dominant contributing observable:
  - If $\Phi_{\text{rate}} \ge \Phi_{\text{kin}} \land \Phi_{\text{rate}} \ge \Phi_{\text{jitter}} \implies \texttt{"HIGH\_FREQUENCY\_FLOOD"}$
  - If $\Phi_{\text{jitter}} \ge \Phi_{\text{kin}} \land \Phi_{\text{jitter}} \ge \Phi_{\text{rate}} \implies \texttt{"DDS\_DISRUPTION"}$
  - If $\Phi_{\text{kin}} \ge \Phi_{\text{rate}} \implies \texttt{"CMD\_VEL\_SPIKE"}$
  - Else $\implies \texttt{"ANOMALOUS\_VELOCITY\_DRIFT"}$
* **Threat Subsidence Debouncing (Dynamic Adaptive Hysteresis):**
  When $\hat{S}$ drops below $0.20$, an attack is not dropped immediately. The detector applies dual-threshold Schmitt trigger hysteresis: the alert is triggered at $\hat{S} \ge 0.20$ but clears only when $\hat{S} < 0.10$ to prevent boundary flapping. Furthermore, rather than a rigid $1.50\text{ s}$ delay, the debounce persistence window $\tau_{\text{clear}}$ is dynamically calculated as a function of peak attack severity and relapse history:
  $$\tau_{\text{clear}} = \operatorname{clamp}\left(0.40 + 1.20 \cdot S_{\text{peak}} + 0.50 \cdot k_{\text{relapse}},\; 0.40\,\text{s},\; 2.00\,\text{s}\right)$$
  - Mild, isolated probes ($S_{\text{peak}} \le 0.25, k = 0$) drop the alert within $\approx 0.40\text{ s} - 0.70\text{ s}$, dramatically reducing idle latency and accelerating motion onset ($< 0.5\text{ s}$).
  - Severe attacks ($S_{\text{peak}} \ge 0.80$) or repeated pulsing attacks ($k \ge 1$) expand $\tau_{\text{clear}}$ up to $2.00\text{ s}$, ensuring complete physical and communication subsidence before downstream recovery engages.

---

## 4. Master Launch System Integration

In [`src/horos_simulation/launch/horos_system.launch.py`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_simulation/launch/horos_system.launch.py), the detector can be activated autonomously via the launch argument:
```bash
ros2 launch horos_simulation horos_system.launch.py autonomous_detector:=true
```

When enabled, the node subscribes to `/cmd_vel_raw` and `/odom`, publishing alerts to `/horos/attack_alert` that seamlessly feed the downstream mitigation engine without requiring any simulated attack injector ground truth.

---

## 5. Thesis Oral Defense Q&A

**Question:** *How does your threat detector distinguish between legitimate aggressive operator maneuvers and an actual cyberattack?*  
**Defense:** "The threat detector uses multi-dimensional fusion rather than a single tripwire. If an operator commands a rapid turn within physical limits, $\Phi_{\text{rate}}$ remains zero (50 Hz nominal) and $\Phi_{\text{jitter}}$ remains zero, producing an $\hat{S} < 0.20$, which does not trip an alert. An alert trips only if commands physically violate the robot's configured kinematic envelope ($\Phi_{\text{kin}}$), if message rates surge into flooding levels ($\Phi_{\text{rate}}$), or if DDS transport freezes ($\Phi_{\text{jitter}}$). Furthermore, in borderline cases, the Adaptive Decision Surface scales velocity proportionally to $\hat{S}$ rather than performing an abrupt emergency stop, preserving task continuity."
