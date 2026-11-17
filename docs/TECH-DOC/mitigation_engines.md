# Technical Reference: HOROS Unified Mitigation Engine

**Package:** `horos_mitigation_engine`  
**Language:** C++17 (Modern ROS 2 `rclcpp`)  
**Executable:** `mitigation_engine_node`  
**Author:** Youssef Ashraf Khalil  
**Institution:** German International University (GIU Cairo)  
**Academic Degree:** Bachelor of Science in Computer Science  

---

## 1. Architectural Role & Design Pattern

The **HOROS Mitigation Engine** ([`mitigation_engine_node.cpp`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_mitigation_engine/src/mitigation_engine_node.cpp)) acts as the inline cyber-physical choke point (Domain 1: Threat Suppression) situated directly between the adversarial ingress surface (`/cmd_vel_raw`) and the downstream Autonomous Safe Recovery Engine (`/cmd_vel_mitigated`).

### Modern Strategy Pattern Architecture
Rather than maintaining fragmented, competing binaries, the mitigation subsystem is architected using the **C++ Polymorphic Strategy Pattern** ([`MitigationStrategy`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_mitigation_engine/include/horos_mitigation_engine/mitigation_strategy.hpp)):

```
┌────────────────────────────────────────────────────────────────────────┐
│                   HOROS Mitigation Engine Node                         │
│                    (mitigation_engine_node.cpp)                        │
│                                                                        │
│   • MutuallyExclusive Callback Group (Control Loop: /cmd_vel_raw)      │
│   • Reentrant Callback Group (Telemetry: /horos/context, Alert)       │
│   • Leaky-Bucket Rate Limiter (Flooding DoS Protection)                │
│   • State-Gated Authorization (Service Protection)                     │
│   • DDS Deadman Watchdog Timer (Freeze / Drop Protection)              │
│                                                                        │
│                    std::unique_ptr<MitigationStrategy>                 │
│                                     │                                  │
│             ┌───────────────────────┼───────────────────────┐          │
│             ▼                       ▼                       ▼          ▼
│      StaticStrategy          DynamicStrategy         AdaptiveStrategy  BypassStrategy
│     (Binary E-Stop)         (Policy Matrix)         (Severity + Context) (Raw Baseline)
│                                                             │
│                                                    [Ablation Suite]
│                                                    • FULL (5D Vector)
│                                                    • NO_LIDAR
│                                                    • NO_LOCALIZATION
│                                                    • NO_VELOCITY
│                                                    • SEVERITY_ONLY
└────────────────────────────────────────────────────────────────────────┘
```

This polymorphism enables instantaneous runtime switching between mitigation baselines via:
1. **ROS 2 Parameter:** `ros2 run horos_mitigation_engine mitigation_engine_node --ros-args -p mode:=adaptive`
2. **ROS 2 Service Interface:** Call `/horos/set_mitigation_mode` with request `target_mode: "STATIC" | "DYNAMIC" | "ADAPTIVE" | "BYPASS" | "ADAPTIVE_NO_LIDAR" | ...`

---

## 2. Inline Defense Matrix: Five Threat Vectors Under Evaluation

The node natively implements defenses across all five threat vectors evaluated in the bachelor thesis:

| Threat Vector | Attack Mechanism | HOROS Mitigation Engine Defense | Source Implementation |
| :--- | :--- | :--- | :--- |
| **Vector 1: Unauthorized Velocity Injection** | Malicious injection of velocity spikes or steering bias drift on `/cmd_vel_raw`. | **Inline Kinematic Clamping & Continuous Spatial Scaling:** Hard ingress bounds enforce kinematic caps alongside continuous severity- and clearance-aware envelope scaling. | [`mitigation_engine_node.cpp`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_mitigation_engine/src/mitigation_engine_node.cpp) |
| **Vector 2: High-Frequency Flooding DoS** | Adversary floods the middleware with 100–500 Hz messages, causing queue exhaustion and latency jitter. | **Token-Bucket Rate Limiter:** Runtime launch configures $C_{\text{burst}} = 15.0\text{ tokens}$, refill rate $r_{\text{fill}} = 50.0\text{ tokens/s}$ (unlaunched legacy YAML fallback retains `25.0 / 5.0`), dropping excess bursts in $\mathcal{O}(1)$ time. | [`mitigation_engine_node.cpp`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_mitigation_engine/src/mitigation_engine_node.cpp) |
| **Vector 3: Rogue Node Injection** | Unauthorized publisher masquerading as legitimate navigation node injecting erratic commands. | **Autonomous Kinematic Anomaly Tripwire:** If incoming commands exceed physical velocity/rate envelopes, the node raises an internal threat alert with severity proportional to excess deviation. | [`mitigation_engine_node.cpp`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_mitigation_engine/src/mitigation_engine_node.cpp) |
| **Vector 4: Unauthorized Service Invocation** | Attacker invokes `/horos/set_mitigation_mode` to disable defenses (`target_mode: "BYPASS"`) during an active attack. | **State-Gated Authorization Barrier:** Validates the system operational security state. Any service call attempting to downgrade mitigation to `BYPASS` / `NONE` while `alert.under_attack == true` is rejected immediately. | [`mitigation_engine_node.cpp`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_mitigation_engine/src/mitigation_engine_node.cpp) |
| **Vector 5: DDS Communication Disruption** | Transport-level packet loss, jitter, or frozen publishers freezing velocity feed. | **Deadman Watchdog Timer:** Launched `mitigation_engine_node` uses $t_{\text{timeout}} = 500\text{ ms}$ (Go2) / $850\text{ ms}$ (YanShee) (`1000 ms` node default; `250 ms` unlaunched YAML; `200 ms` in `recovery_engine_node`; `650 ms` in `yanshee_physical_bridge.py`). | [`mitigation_engine_node.cpp`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_mitigation_engine/src/mitigation_engine_node.cpp) |

---

## 3. Mathematical Models & Defense Strategies

### 3.1 Strategy 1: Static Mitigation (`StaticMitigationStrategy`)
* **Source:** [`static_strategy.hpp`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_mitigation_engine/include/horos_mitigation_engine/static_strategy.hpp)
* **Literature Grounding:** Reflects traditional industrial safety mechanisms (e.g., hardware E-Stops and binary fail-safe policies).
* **Mathematical Formulation:**
  $$\mathbf{v}_{\text{safe}} = \begin{cases} [0, 0]^T & \text{if } \text{alert.under\_attack} = \text{true} \\ \mathbf{v}_{\text{raw}} & \text{otherwise} \end{cases}$$
* **Limitation:** Destroys availability (Safe TC collapses to $0.1\%$ Go2, $0.3\%$ YanShee, $0.0\%$ median).

---

### 3.2 Strategy 2: Dynamic Mitigation (`DynamicMitigationStrategy`)
* **Source:** [`dynamic_strategy.hpp`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_mitigation_engine/include/horos_mitigation_engine/dynamic_strategy.hpp)
* **Compiled Runtime Implementation:** Maps the reported `AttackCategory` enum (`switch (alert.category)`) to discrete category-indexed velocity caps without consulting proximity clearance (`d_min`), posture, or localization confidence (`config/params.yaml` contains an unused discrete tier block `0.60 / 0.30 / 0.00` that is bypassed by `dynamic_strategy.hpp`):
  - `VELOCITY_SPIKE`: clamps $v_x \in [-0.25, +0.25]\text{ m/s}$, $\omega_z \in [-0.40, +0.40]\text{ rad/s}$.
  - `STEERING_BIAS`: clamps $v_x \in [-0.30, +0.30]\text{ m/s}$, $\omega_z \in [-0.18, +0.18]\text{ rad/s}$.
  - `FLOODING_DOS`: scales $\mathbf{v}_{\text{safe}} = 0.50 \cdot \mathbf{v}_{\text{raw}}$ (clamped $|v_x| \le 0.25\text{ m/s}$, $|\omega_z| \le 0.35\text{ rad/s}$).
  - `ROGUE_NODE`: clamps $|v_x| \le 0.20\text{ m/s}$, $|\omega_z| \le 0.25\text{ rad/s}$.
  - `SERVICE_TAMPERING`: clamps $|v_x| \le 0.22\text{ m/s}$, $|\omega_z| \le 0.30\text{ rad/s}$.
  - `DDS_DISRUPTION`: clamps $|v_x| \le \min(v_{\text{nom}} \cdot 0.40, \dots)$ / $+0.40\,v_{\text{nom}}$ fallback envelope, $\omega_z \le 0.25\text{ rad/s}$; default fallback $\pm 0.15\text{ m/s}, \pm 0.20\text{ rad/s}$.
* **The Context-Blindness Vulnerability (RQ2):** Because `dynamic_strategy.hpp` ignores real-time LiDAR clearance ($d_{\min}$) and localization confidence ($\gamma_{\text{loc}}$), a category-capped forward command drives the Go2 into confined/tight-room obstacles ($14.3\%$ [$6/42$] overall Go2 collisions; $28.6\%$ in `TIGHT_ROOM`).

---

### 3.3 Strategy 3: HOROS Adaptive Mitigation (`AdaptiveMitigationStrategy`)
* **Source:** [`adaptive_strategy.hpp`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_mitigation_engine/include/horos_mitigation_engine/adaptive_strategy.hpp)
* **Literature Grounding:** Thesis Core Contribution (RQ1 & RQ2). Parameterized by the augmented context vector $\mathbf{C} = [d_{\min}, v_{\text{act}}, M, \gamma_{\text{loc}}, S, \theta_{\text{tilt}}, v_{\text{obs,closing}}]^T$.

#### Mathematical Control Pipeline:

1. **Unconditional Ingress Actuation Capping (M1):**
   Regardless of whether the cyber threat detector flags an active attack (`under_attack == false`), all incoming velocity requests are unconditionally capped to platform-safe kinematic bounds:
   $$v_{x,\text{in}} = \operatorname{clamp}(v_{x,\text{raw}},\; -v_{\text{nom}},\; +v_{\text{nom}}), \qquad \omega_{z,\text{in}} = \operatorname{clamp}(\omega_{z,\text{raw}},\; -\omega_{\text{max}},\; +\omega_{\text{max}})$$
   This structural defense-in-depth ensures that an unauthenticated high-magnitude actuator surge (e.g. $v_x = 3.0\text{ m/s}$) cannot violate physical actuation limits even during detection delays ($\tau_{\text{detect}} \le 250\text{ ms}$).

2. **Closing-Rate Compensated 1D Sampled-Data Control Barrier Function (M2 SD-CBF):**
   Guarantees forward invariance of the safe spatial set $\mathcal{C} = \{x \in \mathcal{X} \mid h(x) \ge 0\}$ under discrete zero-order-hold actuator sampling period $T_s = 0.100\text{ s}$:
   $$h(d_{\min}) = d_{\min} - d_{\text{crit}} - v_{\text{obs,closing}} T_s \ge 0$$
   Solving the continuous braking dynamics under maximum physical deceleration $a_{\text{phys}}$ gives the closed-form SD-CBF velocity ceiling:
   $$v_{\text{cbf\_ceiling}} = \sqrt{2\,a_{\text{phys}}\,\max\big(0.0,\; d_{\min} - d_{\text{crit}} - v_{\text{obs,closing}} T_s\big)}$$
   Any commanded velocity $v_{x} > 0$ is clamped via $v_x \leftarrow \min(v_x, v_{\text{cbf\_ceiling}})$, guaranteeing zero physical collisions regardless of adversary intent.

3. **Priority 0 Cliff-Edge Reverse Extrication & Turnaround Authority:**
   When downward IR sensors detect an edge or cliff distance $d_{\text{cliff}} \le 0.48\text{ m}$:
   - **Forward motion is strictly arrested:** $v_x \le 0.0\text{ m/s}$.
   - **Safe backward translation is authorized:** If raw command requests reverse motion ($v_{x,\text{raw}} < -0.005\text{ m/s}$), the engine permits retreat up to $v_x \in [-v_{\text{nom}}, 0.0\text{ m/s}]$, preventing tabletop entrapment.
   - **In-place yaw rotation authority is preserved:**
     $$\omega_z = \operatorname{sign}(\omega_{z,\text{raw}}) \cdot \operatorname{clamp}\big(|\omega_{z,\text{raw}}|,\; 0.15,\; 0.50 \cdot \omega_{\text{max}}\big)$$
     allowing the robot to pivot away from drop-offs and recover nominal patrol path.

4. **In-Place Turnaround Authority at Zero/Creep Speed (Step E):**
   In obstacle-dense corridors (`CONFINED_SPACE`) or human vicinity (`NEAR_HUMAN`), linear translation may be completely throttled by proximity ($|v_x| < \text{idle\_thresh} = 0.02\text{ m/s}$). Rather than freezing all degrees of freedom, the engine explicitly preserves steering yaw authority:
   $$\text{If } |v_x| < \text{idle\_thresh} \land |\omega_z| \ge 0.03\text{ rad/s} \implies \omega_z \leftarrow \operatorname{clamp}(\omega_{z,\text{raw}},\; -0.35,\; +0.35)\text{ rad/s}$$
   preventing robot deadlock and empowering autonomous obstacle avoidance.

5. **Operational Proximity Decision Surface:**
   - **Critical Stopping Zone ($d_{\min} \le d_{\text{crit}}$):**
     Immediate forward translational arrest ($v_x \le 0$), maintaining minimum buffer $d_{\text{crit}} = 0.45\text{ m}$ (Go2) or $0.25\text{ m}$ (YanShee).
   - **Human Proximity Zone (`NEAR_HUMAN`):**
     $$\alpha = \min\Bigl(\alpha_{\text{sev}}(S)\,\gamma_{\text{loc}}\,\gamma_{\text{posture}}\,\frac{0.08 + 0.07\eta}{v_{\text{nom}}},\; 0.15\Bigr)$$
   - **Caution Corridor ($d_{\text{crit}} < d_{\min} < d_{\text{caution}}$):**
     $$\alpha = \alpha_{\text{sev}}(S)\,(0.70 + 0.30\,\eta)\,\gamma_{\text{loc}}\,\gamma_{\text{posture}}$$
     where $\eta = \operatorname{clip}\left(\frac{d_{\min} - d_{\text{crit}}}{d_{\text{caution}} - d_{\text{crit}}},\; 0,\; 1\right)$ and $\alpha_{\text{sev}}(S) = \max(\text{floor},\; 1 - k_S S)$.
   - **Open Space ($d_{\min} \ge d_{\text{caution}}$):**
     $$\alpha = \gamma_{\text{loc}}\,\gamma_{\text{posture}}$$
     where $\gamma_{\text{posture}} = \operatorname{clip}(\psi_{\text{posture}}, 0.50, 1.0)$ enforces gyroscopic tilt damping ($\text{emergency stop if } \theta_{\text{tilt}} > 16.0^\circ$).

6. **Clearance-Bounded Predictive Coasting Watchdog:**
   Under communication blackout or transport freeze (`V5 DDS Disruption`), the watchdog decelerates smoothly over $\tau_{\text{grace}} = 120\text{ ms}$ before executing a fail-safe hold at $500\text{ ms}$, avoiding kinetic snapping.

7. **5-Tripwire Zero-Trust Sensory Architecture:**
   Monitors LiDAR, IMU, and odometry telemetry for: (1) Range boundary violations, (2) Temporal stall ($> 500\text{ ms}$), (3) NaN/Inf corruption, (4) Variance collapse (stuck sensor), and (5) Phantom close-range readings, dynamically engaging safe degraded crawl or latched protective hold.

---

### 3.4 Context Feature Vector Ablation Suite

To scientifically evaluate the marginal contribution of each dimension in $\mathbf{C}$ for the thesis defense (RQ2), `AdaptiveMitigationStrategy` provides 5 formal ablation operating modes:

| Mode Identifier | Active Vector | Neutralized Fallback | Academic Purpose |
| :--- | :--- | :--- | :--- |
| **`ADAPTIVE` (Full)** | $[d_{\min}, v_{\text{act}}, M, \gamma_{\text{loc}}, S]$ | None (Full multi-sensor awareness) | Evaluates complete HOROS defense performance. |
| **`ADAPTIVE_NO_LIDAR`** | $[5.0\text{m}, v_{\text{act}}, M, \gamma_{\text{loc}}, S]$ | $d_{\min} \leftarrow 5.0\text{m}$ (Simulates spatial blindness) | Proves that ignoring spatial proximity causes collisions in confined corridors. |
| **`ADAPTIVE_NO_LOC`** | $[d_{\min}, v_{\text{act}}, M, 1.0, S]$ | $\gamma_{\text{loc}} \leftarrow 1.0$ (Assumes perfect pose) | Proves that ignoring odometry degradation allows high-speed drift into obstacles. |
| **`ADAPTIVE_NO_VEL`** | $[d_{\min}, 0.35, M, \gamma_{\text{loc}}, S]$ | $v_{\text{act}} \leftarrow 0.35\text{ m/s}$ (Fixed deceleration) | Evaluates the effect of kinetic momentum damping on quadruped pitch stability. |
| **`ADAPTIVE_SEVERITY_ONLY`** | $[5.0\text{m}, 0.35, M, 1.0, S]$ | All spatial/inertial features neutralized | Evaluates performance when reacting purely to severity score $S$ (similar to dynamic policy). |

---

### 3.5 Strategy 4: Bypass Baseline (`BypassStrategy`)
* **Source:** [`bypass_strategy.hpp`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_mitigation_engine/include/horos_mitigation_engine/bypass_strategy.hpp)
* **Mechanisms:**
  - Directly forwards `/cmd_vel_raw` to `/cmd_vel_mitigated` with zero filtering, zero clamping, and zero halts.
  - Generates ground-truth baseline telemetry for the thesis to document what occurs physically (wheel slipping, violent tip-overs, high-speed collisions) when cyberattacks are unmitigated.

---

## 4. Real-Time Determinism & Schedulability (RQ3)

To ensure strict compliance with RQ3 ($< 2.0\text{ ms}$ latency budget for 20–50 Hz quadruped control loops):

1. **Callback Group Priority Separation:**
   - **`control_callback_group_`:** MutuallyExclusive group assigned exclusively to `/cmd_vel_raw` and the DDS watchdog timer. Ensures control loop execution is never preempted or delayed by lower-priority telemetry.
   - **`telemetry_callback_group_`:** Reentrant group assigned to `/horos/context`, `/horos/attack_alert`, and `/horos/set_mitigation_mode`.
2. **Lock Duration Boundedness:** Mutex locks (`state_mutex_`) protect atomic state copies only (`< 5.0\ \mu\text{s}`). Computation of decision surfaces is performed unlocked on local stack copies.
3. **Execution Latency:** Total policy evaluation latency across all strategies:
   $$t_{\text{select}} < 0.15\text{ ms}$$
   well within the $0.5\text{ ms}$ real-time boundary.
4. **Zero Console Spam at High Frequencies (Rule 3):**
   - Telemetry logging is dispatched silently to `/horos/mitigation_status`.
   - Threat alert transitions are printed exclusively on discrete edge changes (`msg->under_attack != prev_under_attack_`).
   - Active mitigation logging is throttled to $1\text{ Hz}$ via `RCLCPP_WARN_THROTTLE`.
