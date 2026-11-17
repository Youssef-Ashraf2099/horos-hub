# HOROS Technical Specification: Deterministic Risk Score Engine

**Document ID:** `TECH-DOC-RISK-01`  
**Classification:** Passive Cyber-Physical Risk Scoring, Weight Rationale & False-Positive Suppression  
**Author:** Youssef Ashraf Khalil  
**Institution:** German International University (GIU Cairo)  
**Academic Degree:** Bachelor of Science in Computer Science  
**Implementation Source:** [`src/horos_attack_injector/horos_attack_injector/threat_detector_node.py`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_attack_injector/horos_attack_injector/threat_detector_node.py)  
**Related Specification:** [`observable_autonomous_threat_detector.md`](file:///e:/Giu%20%20files/semster%207/horos_framework/docs/TECH-DOC/observable_autonomous_threat_detector.md)

---

## 1. Overview & Design Philosophy

The HOROS **Risk Score Engine** (`ObservableThreatDetectorNode`) is a deterministic, non-AI, $O(1)$ runtime anomaly scorer that synthesizes a continuous cyber-physical risk score $\hat{S}(t) \in [0.0, 1.0]$ from passive ROS 2 control and telemetry observables (`/cmd_vel_raw` and `/odom`).

Unlike machine-learning intrusion detectors that require offline training datasets, risk opaque classification boundaries, or incur unbounded inference latency, the Risk Score Engine relies on **first-principles physical kinematics, middleware rate bounds, and transport timing invariants**. This guarantees deterministic bounded execution suitable for real-time robotic control loops while eliminating ground-truth oracle dependencies.

---

## 2. The Three Normalized Risk Indicators ($\Phi_{\text{kin}}, \Phi_{\text{rate}}, \Phi_{\text{jitter}}$)

At runtime, the engine continuously normalizes three orthogonal cyber-physical observables into the unit interval $[0.0, 1.0]$:

### 2.1 Kinematic Divergence & Envelope Violation ($\Phi_{\text{kin}}$)
Evaluates incoming `/cmd_vel_raw` commands against the platform's declarative kinematic limits ($v_{\max}, \omega_{\max}$) and sensed physical odometry ($v_{\text{odom}}, \omega_{\text{odom}}$):

1. **Actuator Envelope Excess:**
   $$\text{excess}_v = \frac{\max(0.0, |v_x| - v_{\max})}{v_{\max}}, \qquad \text{excess}_\omega = \frac{\max(0.0, |\omega_z| - \omega_{\max})}{\omega_{\max}}$$
2. **2D Linear-Angular Odometry Discordance:**
   $$\text{div}_{\text{lin}} = \frac{\max(0.0, |v_x - v_{\text{odom}}| - \delta_v)}{0.80}, \qquad \text{div}_{\text{ang}} = \frac{\max(0.0, |\omega_z - \omega_{\text{odom}}| - \delta_\omega)}{1.20}$$
   where $\delta_v = \texttt{divergence\_threshold}$ ($0.40\text{ m/s}$ default) and $\delta_\omega = \max(0.25, 1.25\,\delta_v)$.
3. **Asymmetric Arrival Smoothing:**
   $$\Phi_{\text{kin,inst}} = \min\!\left(1.0,\; \max\bigl(1.5\,\text{excess}_v,\; 1.5\,\text{excess}_\omega,\; \sqrt{\text{div}_{\text{lin}}^2 + \text{div}_{\text{ang}}^2}\bigr)\right)$$
   Filtered on every arriving command using an asymmetric fast-attack ($\alpha_{\text{atk}} = 0.85$) / slow-decay ($\alpha_{\text{dec}} = 0.25$) EWMA to prevent $50\text{ Hz}$ alternating spike/benign packets from aliasing the $20\text{ Hz}$ evaluation timer.

### 2.2 Message Rate Anomaly ($\Phi_{\text{rate}}$)
Tracks a sliding window of the last $N = 25$ command arrival timestamps (`maxlen=25`, minimum $5$ samples) to detect high-frequency flooding DoS ($100\text{--}500\text{ Hz}$):
$$\Phi_{\text{rate}} = \operatorname{clamp}\!\left(\frac{f_{\text{meas}} - f_{\text{thresh}}}{400.0},\; 0.0,\; 1.0\right), \quad f_{\text{thresh}} = 80.0\text{ Hz}$$

### 2.3 Transport Jitter & Silence ($\Phi_{\text{jitter}}$)
Monitors elapsed wall-clock time $\Delta t_{\text{cmd}} = t_{\text{now}} - t_{\text{last\_cmd}}$ since the last valid command arrival to detect DDS freezes, packet drops, and publisher stagnation:
$$\Phi_{\text{jitter}} = \begin{cases} 0.0, & \Delta t_{\text{cmd}} \le \tau_{\text{jit}} \\ \min\!\left(1.0,\; \frac{\Delta t_{\text{cmd}} - \tau_{\text{jit}}}{0.80}\right), & \Delta t_{\text{cmd}} > \tau_{\text{jit}} \end{cases}, \quad \tau_{\text{jit}} = 0.40\text{ s}$$
When command silence exceeds $0.15\text{ s}$, $\Phi_{\text{kin}}$ and $\Phi_{\text{rate}}$ decay multiplicatively by $0.80$ per evaluation tick so stale pre-silence anomalies do not persist indefinitely.

---

## 3. Bounded Dominant-Residual $t$-Conorm Aggregation

A naive max-versus-weighted-sum formula $\max(\max_i \Phi_i, \sum_{i=1}^3 w_i \Phi_i)$ with $\sum_{i=1}^3 w_i = 1.0$ suffers from **convexity collapse**: because $\sum_i w_i \Phi_i \le \max_i \Phi_i$ for all $\Phi \in [0, 1]^3$, the weighted sum is mathematically unreachable dead code and cannot accumulate multi-vector stealth attacks.

To resolve this, HOROS computes the risk score via a **Bounded Dominant-Residual Algebraic $t$-Conorm** (Dempster-Shafer closure):
$$i^* = \arg\max_{i \in \{\text{kin}, \text{rate}, \text{jit}\}} \Phi_i(t)$$
$$S_{\text{raw}}(t) = \Phi_{i^*}(t) + \bigl(1.0 - \Phi_{i^*}(t)\bigr) \sum_{j \neq i^*} w_j \Phi_j(t)$$
with canonical weights:
$$\mathbf{w} = \begin{bmatrix} w_{\text{kin}} \\ w_{\text{rate}} \\ w_{\text{jit}} \end{bmatrix} = \begin{bmatrix} 0.40 \\ 0.35 \\ 0.25 \end{bmatrix}, \qquad \sum_{i=1}^3 w_i = 1.00$$

### Key Mathematical Properties
1. **Strict $[0, 1]$ Invariance:** Since $\Phi_{i^*} \in [0, 1]$ and $\sum_{j \ne i^*} w_j \Phi_j < 1$, $S_{\text{raw}}(t) \in [0, 1]$ by construction.
2. **Single-Vector Weight Invariance:** Whenever only one anomaly channel is active ($\Phi_j = 0$ for $j \ne i^*$), $S_{\text{raw}}(t) = \Phi_{i^*}(t)$ **regardless of the choice of weights**.
3. **Multi-Vector Synergy:** When concurrent sub-threshold anomalies occur across channels (e.g., $\Phi_{\text{kin}} = \Phi_{\text{rate}} = \Phi_{\text{jit}} = 0.50$), the secondary channels fill the residual uncertainty margin $(1.0 - \Phi_{i^*})$ to yield $S_{\text{raw}} = 0.50 + 0.50(0.35 \times 0.50 + 0.25 \times 0.50) = 0.65$.

---

## 4. Principled Weight Selection: Use-Case & Physical-Risk Rationale

The weights $(w_{\text{kin}} = 0.40,\; w_{\text{rate}} = 0.35,\; w_{\text{jit}} = 0.25)$ are **not** arbitrary trial-and-error constants; they follow a **consequence-ordered, use-case-driven hierarchy** grounded in cyber-physical risk and channel signal-to-noise characteristics:

1. **Physical Hazard Priority ($w_{\text{kin}} = 0.40$, Highest):**
   Kinematic envelope violations and odometry divergence directly translate into kinetic energy, obstacle collisions, and postural instability (ISO 3691-4 hazard domain). Consequently, kinematic anomalies carry the highest corroboration authority.
2. **Control-Loop Availability Priority ($w_{\text{rate}} = 0.35$, Middle):**
   High-frequency command flooding ($100\text{--}500\text{ Hz}$) threatens ROS 2 executor starvation and actuator buffer thrashing, degrading control authority even when individual command amplitudes remain within nominal bounds.
3. **Channel Noise Immunity ($w_{\text{jit}} = 0.25$, Lowest):**
   In real wireless ROS 2 / DDS deployments (e.g., Wi-Fi links to physical robots), transient transport jitter and micro-dropouts are the **noisiest** observable channel. Assigning $w_{\text{jit}}$ the lowest weight prevents benign network jitter from disproportionately inflating compound risk scores, while preserving its ability to corroborate genuine multi-vector disruptions.

### Use-Case Parameterization (Avoiding Exhaustive Trial-and-Error)
Because single-vector anomalies are mathematically **weight-invariant** under the dominant-residual $t$-conorm, exhaustive per-scenario trial-and-error tuning is unnecessary. Instead, the weight vector $\mathbf{w}$ serves as a **declarative mission-profile parameter** that can be adapted to the robot's deployment environment:

| Deployment Use Case | Dominant Operational Risk | Weighting Guidance |
| :--- | :--- | :--- |
| **Indoor / Near-Human Patrol** (Default HOROS) | Physical collision / ISO 3691-4 safety | $w_{\text{kin}} > w_{\text{rate}} > w_{\text{jit}}$ (`0.40 / 0.35 / 0.25`) |
| **Noisy Wireless / Outdoor Field** | Transient RF/DDS packet jitter causing false alarms | Lower $w_{\text{jit}}$ relative to $w_{\text{kin}}, w_{\text{rate}}$ |
| **Resource-Constrained Embedded MCU** | Executor/CPU saturation from message floods | Elevate $w_{\text{rate}}$ closer to $w_{\text{kin}}$ |

---

## 5. Multi-Layered False-Positive Handling

HOROS prevents false positives from halting or destabilizing nominal missions through **four complementary mechanisms** rather than relying on weight tuning alone:

1. **Channel Deadbands & Physical Tolerance Baselines:**
   Legitimate aggressive maneuvers within configured kinematic bounds ($|v_x| \le v_{\max}$, $|\omega_z| \le \omega_{\max}$), nominal planner frequencies ($\le 80\text{ Hz}$), and normal DDS inter-arrival gaps ($\Delta t \le 0.40\text{ s}$) produce $\Phi_i = 0.0$.
2. **Asymmetric EWMA Temporal Filtering:**
   Transient single-tick spikes are damped by the asymmetric EWMA filter on $\Phi_{\text{kin}}$, preventing isolated sensor or scheduling glitches from immediately latching a high-severity state.
3. **Dual-Threshold Schmitt-Trigger Hysteresis & Adaptive Debouncing:**
   - **Asymmetric Trigger/Clear Bounds:** An alert latches only when $\hat{S}(t) \ge 0.20$ (`severity_threshold`) and clears only when $\hat{S}(t) < 0.10$ (`clear_thresh`), eliminating boundary chattering.
   - **Adaptive Clear-Persistence Window:** Clearance requires $\hat{S}(t) < 0.10$ to persist for:
     $$\tau_{\text{clear}} = \operatorname{clamp}\!\left(0.40 + 1.20\,S_{\text{peak}} + 0.50\,k_{\text{relapse}},\; 0.40\text{ s},\; 2.00\text{ s}\right)$$
     Mild isolated glitches ($S_{\text{peak}} \approx 0.20, k_{\text{relapse}} = 0$) clear rapidly ($\approx 0.64\text{ s}$), whereas severe or flapping attacks extend the persistence window up to $2.00\text{ s}$.
4. **Proportional (Non-Binary) Downstream Mitigation:**
   Because $\hat{S}(t) \in [0.0, 1.0]$ drives continuous velocity scaling ($\alpha(S, d_{\min})$) rather than a binary Emergency Stop, a minor borderline false positive (e.g., $\hat{S} = 0.20$) only induces a gentle, temporary speed reduction rather than a mission-halting stop.

