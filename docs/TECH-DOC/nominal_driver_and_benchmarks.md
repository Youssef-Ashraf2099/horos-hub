# Technical Reference: Nominal Navigation & Benchmark Telemetry

**Package:** `horos_attack_injector`  
**Language:** Python 3 (ROS 2 `rclpy`)  
**Author:** Youssef Ashraf Khalil (GIU Cairo)  
**Academic Degree:** Bachelor of Science in Computer Science  

---

## 1. Autonomous Nominal Patrol Planner

**Node File:** [`src/horos_attack_injector/horos_attack_injector/nominal_driver.py`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_attack_injector/horos_attack_injector/nominal_driver.py)  
**Executable:** `nominal_driver`  

### 1.1 Architectural Purpose & Operational Regime
Simulates a legitimate, high-level autonomous navigation controller for the Unitree Go2. It uses closed-loop sensor feedback (360° LiDAR and planar odometry) to patrol the corridor indefinitely without collisions under nominal, unattacked conditions.

### 1.2 State Machine Structure
The node implements a 5-state finite state machine (FSM):
1. **`STATE_FORWARD` ($0$):** Patrolling forward down corridor ($+X$). Tracks corridor centerline or predictive bypass lane. Far-end turnaround triggers at $x \ge 14.50\text{ m}$ (open street) or $x \ge 11.20\text{ m}$ (confined corridor).
2. **`STATE_TURNAROUND_REVERSE` ($1$):** Rotates in-place at $\omega_z = +0.45\text{ rad/s}$ until facing backward ($\cos(\psi) < -0.90$), pausing if obstacles are within safety perimeter ($d < 0.65\text{ m}$), then transitions to `STATE_REVERSE`.
3. **`STATE_REVERSE` ($2$):** Patrolling backward toward corridor origin ($-X$). Near-start turnaround triggers at $x \le 0.50\text{ m}$ (open street) or $x \le 0.80\text{ m}$ (confined corridor).
4. **`STATE_TURNAROUND_FORWARD` ($3$):** Rotates in-place at $\omega_z = +0.45\text{ rad/s}$ until facing forward ($\cos(\psi) > 0.90$), then resumes `STATE_FORWARD`.
5. **`STATE_STUCK_RECOVERY` ($4$):** Autonomous physical disengagement triggered if the robot is pinned for $\ge 2.5\text{ s}$ against an obstacle. Executes a 3-phase maneuver: (1) linear reverse step ($1.8\text{ s}$ at $-0.15\text{ m/s}$ without rotation), (2) pivot toward corridor centerline, and (3) smooth forward rejoinder.

### 1.3 Human-Aware Predictive Routing & Corridor-Aligned Steering
* **Dynamic Pedestrian Tracking:** Integrates `DynamicObstacleTracker` to cluster 360° LiDAR returns into human-sized obstacles ($0.30\text{ m} \le \text{span} \le 0.90\text{ m}$) and track their world velocities $(v_x, v_y)$ via Exponential Moving Average (EMA).
* **Spatiotemporal Deconfliction:**
  * **Oncoming Pedestrians:** Proactively shifts target lateral reference to the **Left Lane ($y_{\text{ref}} = +0.70\text{ m}$)** up to $5.5\text{ m}$ in advance, guaranteeing $\ge 1.40\text{ m}$ lateral clearance without stopping.
  * **Lateral Crossers:** Routes behind the pedestrian's velocity vector, ensuring the quadruped traverses space only after the human vacates it.
  * **Roadway Clamping:** $y_{\text{ref}}$ is bounded strictly within $[-1.0\text{ m}, +1.0\text{ m}]$, ensuring the robot stays on the asphalt roadway with $> 2.5\text{ m}$ buffer from curbs.
* **Corridor-Aligned Stanley / PD Steering Controller:**
  $$w_{\text{track}} = \text{clamp}\left(0.45 \cdot e_y + 1.20 \cdot e_{\psi}, \ -0.25, \ +0.25\right)\text{ rad/s}$$
  Strong heading damping ($1.20$) and bounded turning rate ($\pm 0.25\text{ rad/s}$) mathematically guarantee body yaw deviation remains $< 12^\circ$, completely eliminating off-axis 25° drift into walls.
* **ISO 3691-4 Standstill Yield & Active Deadlock Breaker:**
  * Banned all blind reversing during nominal cruise (preventing collisions with following pedestrians).
  * If forward travel swath is blocked ($d_{\text{eval}} < 1.10\text{ m}$), executes a standstill yield ($v = 0.0, \omega = 0.0$).
  * If blocked for $> 2.5\text{ s}$, activates **Lateral Creep Bypass**: creeps at $v = 0.08\text{ m/s}$ along $w_{\text{track}}$ towards the open bypass lane, clearing the deadlock without freezing.

---

## 2. Quantitative Benchmark Tracer Node

**Node File:** [`src/horos_attack_injector/horos_attack_injector/benchmark_tracer_node.py`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_attack_injector/horos_attack_injector/benchmark_tracer_node.py)  
**Executable:** `benchmark_tracer`  

### 2.1 Multi-Metric Telemetry Collection

1. **Task Continuity Under Attack ($TC_{\text{attack}}$):**
   Aggregates continuous mitigation status reports and calculates mean continuity during the attack episode:
   $$\overline{TC} = \frac{1}{N} \sum_{k=1}^N TC_k \times 100\%$$

2. **Post-Attack Recovery Continuity ($TC_{\text{post}}$):**
   Evaluates task continuity across a $5.0\text{ s}$ window following threat subsidence, quantifying availability preservation during the recovery phase.

3. **Distinct Temporal Evaluation Metrics (Mandatory Thesis Requirement):**
   The tracer distinguishes three separate temporal metrics:
   * **Response-Selection Latency ($t_{\text{select}}$):** Algorithmic policy selection latency from threat alert to first modified command ($< 0.5\text{ ms}$). *(See Performance Spike Investigation [`docs/TECH/spike_latency_investigation_and_optimization.md`](file:///e:/Giu%20%20files/semster%207/horos_framework/docs/TECH/spike_latency_investigation_and_optimization.md) for detailed deconstruction of graph roundtrip delays vs pure algorithmic execution).*
   * **Time to Reach Safe State ($t_{\text{safe}}$):** Physical deceleration duration required for the robot to reach a bounded safe velocity envelope ($|v| \le v_{\text{bound}}$).
   * **Actual Recovery Time ($t_{\text{recover}}$):** Elapsed time from threat subsidence until the robot successfully re-attains $\ge 90\%$ of nominal cruise speed ($v \ge 0.315\text{ m/s}$).

4. **Multi-Modal Physical Safety & Collision Monitoring:**
   Monitors `/scan` and `/horos/context` at $50\text{ Hz}$ combined with ground-truth model states (`/gazebo/model_states`). Flags collisions strictly on discrete obstacles (pedestrians and pillars) when surface gap $\le 0.00\text{ m}$ or LiDAR clearance $\le 0.38\text{ m}$.

5. **Resource Profiling:**
   Utilizes `psutil` to inspect CPU percentage and resident memory (RSS in MB) of the active mitigation process.

### 2.2 Output Deliverables
* **Event-Driven Terminal Cards:** Generates formatted ASCII summary cards upon episode completion (Rule 3: zero continuous spam during nominal patrol).
* **Silent CSV Logging:** Appends complete rows to `~/horos_ws/benchmark_results.csv` at $10\text{ Hz}$.

---

## 3. Automated Attack Benchmark Runner

**Script File:** [`scripts/run_attack_benchmark.py`](file:///e:/Giu%20%20files/semster%207/horos_framework/scripts/run_attack_benchmark.py)  

### 3.1 Five MITRE ATT&CK Threat Vectors Evaluated:
1. **Vector 1 (Velocity Spikes & Steering Bias):** Adversary injects malicious velocity offsets onto `/cmd_vel_raw` ($v_x = 0.8\text{ m/s}, \omega_z = \pm 1.2\text{ rad/s}$).
2. **Vector 2 (High-Frequency Flooding DoS):** Injects 200–500 Hz message bursts onto the command topic to exhaust subscriber queues.
3. **Vector 3 (Rogue Node Injection):** Spawns an unauthorized publisher node attempting to hijack the locomotion stream.
4. **Vector 4 (Unauthorized Service Invocation):** Attempts to disable mitigation engines by calling `/horos/set_mitigation_mode` with `target_mode: "BYPASS"`.
5. **Vector 5 (DDS Transport Disruption):** Freezes the command stream or introduces latency jitter, triggering the DDS deadman watchdog.

### 3.2 Evaluation Sweeps:
* Provides an interactive CLI menu to trigger individual attack profiles.
* Supports an automated multi-trial evaluation sweep executing matched attempts ($N \ge 5$) across all 4 defensive postures (`BYPASS`, `STATIC`, `DYNAMIC`, `ADAPTIVE`) with automated cooldowns between episodes.
