# HOROS Technical Specification: Gyroscopic Postural Balance Awareness & Anti-Toppling Stabilization for Biped Humanoids

**Document ID:** `TECH-DOC-GYRO-01`  
**Classification:** Morphology-Aware Cyber-Physical Defense & Postural Stability  
**Author:** Youssef Ashraf Khalil  
**Institution:** German International University (GIU Cairo)  
**Academic Degree:** Bachelor of Science in Computer Science  
**Supervisors:** Dr. Marwa Zamzam, Prof. Slim Abdennadher  
**Target Platforms:** UBTech Yanshee Humanoid / Unitree Go2 EDU / ROS 2 Humble LTS  

---

## 1. Executive Summary & Morphology Specialization

A foundational contribution of the HOROS framework is its **morphology-aware cyber-physical defense architecture**. Rather than treating all robotic plants identically, HOROS adapts its multi-modal context surface $\mathbf{C}$ to the physical failure modes and native sensory superpowers of each robot:

1. **Unitree Go2 Quadruped:**  
   - **Physical Morphology:** 4 low-center-of-mass legs providing high static stability.
   - **Primary Cyberattack Failure Mode:** Physical horizontal collision with obstacles ($d_{\min} \to 0$) during high-speed cruise ($0.35 - 1.20\text{ m/s}$).
   - **Primary Sensory Superpower:** **360° Horizontal LiDAR** (`/scan`).
   - **Defense Invariant:** Spatial Clearance Invariant ($d_{\min} \ge 0.45\text{ m}$).

2. **UBTech Yanshee Humanoid:**  
   - **Physical Morphology:** Bipedal inverted pendulum with 17 servomotors and narrow foot support polygons.
   - **Primary Cyberattack Failure Mode:** **Dynamic loss of balance, Zero-Moment Point (ZMP) divergence, and catastrophic toppling over (falling to the ground).**
   - **Primary Sensory Superpower:** **Built-in 6-Axis Gyroscope & IMU** (`/imu/data` or 40-pin GPIO bus).
   - **Defense Invariant:** **Dynamic Postural Balance Invariant ($\gamma_{\text{posture}} \ge 0.60$, $\beta_{\text{tilt}} \le 8^\circ$).**

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      HOROS DUAL-SENSOR CYBER-PHYSICAL PARADIGM                         │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│ Unitree Go2 Quadruped                     │ UBTech Yanshee Biped Humanoid              │
├───────────────────────────────────────────┼────────────────────────────────────────────┤
│   360° LiDAR Ray Cloud                    │   Built-in 6-Axis Gyroscope / IMU          │
│   Clearance: d_min ∈ [0.08m, 16.0m]       │   Tilt: β_tilt = sqrt(roll² + pitch²)      │
│   Prevents: Horizontal Wall Collisions    │   Prevents: Dynamic Toppling & Fall Impact │
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

---

## 2. Theoretical Mechanics: Biped Inverted Pendulum & Zero-Moment Point (ZMP)

Bipedal locomotion is governed by Linear Inverted Pendulum Dynamics (LIPM):
$$\ddot{x}_{\text{CoM}} = \frac{g}{z_c} \left(x_{\text{CoM}} - x_{\text{ZMP}}\right)$$

Where $x_{\text{CoM}}$ is the center of mass position, $z_c$ is the constant pendulum height, $g$ is gravity, and $x_{\text{ZMP}}$ is the Zero-Moment Point.

### 2.1 The Resonance / Frequency Pulse Cyberattack
A sophisticated attacker targeting a biped humanoid does not need to violate kinematic bounds ($|v| \le 0.15\text{ m/s}$). By injecting cyclic alternating commands oscillating at the robot's natural pendulum frequency:
$$f_{\text{res}} = \frac{1}{2\pi}\sqrt{\frac{g}{z_c}} \approx 1.15 - 1.30\text{ Hz}$$
The attacker induces resonant dynamic rocking. At each stride cycle, $x_{\text{ZMP}}$ shifts outside the narrow foot support polygon ($S_{\text{foot}}$). 

* **Without Gyroscopic Feedback:** Sensed obstacle distance $d_{\min}$ remains safe ($> 2.0\text{m}$) and velocity magnitude is within bounds. The robot tips over and smashes into the floor.
* **With Gyroscopic Feedback:** The onboard gyroscope instantly detects anomalous angular pitch/roll velocity ($\omega_{\text{gyro}} > 0.40\text{ rad/s}$) and tilt exceedance ($\beta_{\text{tilt}} > 8^\circ$), engaging **Active Postural Balance Stabilization** before toppling occurs.

---

## 3. Mathematical Formulations

### 3.1 Gyroscopic Postural Tilt Metric ($\beta_{\text{tilt}}$)
Extracted from onboard 6-axis gyroscope angular velocities and orientation quaternions:
$$\beta_{\text{tilt}} = \sqrt{\theta_{\text{roll}}^2 + \theta_{\text{pitch}}^2} \quad [\text{radians}]$$
$$\omega_{\text{tilt}} = \sqrt{\omega_x^2 + \omega_y^2} \quad [\text{rad/s}]$$

### 3.2 Normalized Postural Stability Index ($\gamma_{\text{posture}}$)
Extracted in the perception bridge and consumed by Step `B_gyro` in [`adaptive_strategy.hpp`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_mitigation_engine/include/horos_mitigation_engine/adaptive_strategy.hpp):
$$\gamma_{\text{posture}} \in [0.0, 1.0], \qquad \theta_{\text{crit}} = 0.28\text{ rad } (16.0^\circ)$$
(with physical bridge emergency stop at $25.0^\circ$ and logged simulation topple evaluation threshold $20.0^\circ$). Inside `adaptive_strategy.hpp`, $\gamma_{\text{posture}}$ is bounded to $[0.50, 1.0]$ for nominal monitoring so normal bipedal gait oscillations ($4^\circ\text{--}10^\circ$) never trigger spurious emergency stops.

### 3.3 Dynamic Balance Guard in the Adaptive Decision Surface
Embedded at Step `B_gyro` in `adaptive_strategy.hpp`:
* **Nominal Gait State ($\theta_{\text{tilt}} \le 0.28\text{ rad}$ and $\gamma_{\text{posture}} \ge 0.20$):** Normal bipedal stride velocity regulation proceeds without unnecessary halts.
* **Imminent Topple Emergency ($\gamma_{\text{posture}} > 0$ AND $[\theta_{\text{tilt}} > 0.28\text{ rad } (16.0^\circ) \lor (\gamma_{\text{posture}} < 0.20 \land \theta_{\text{tilt}} > 0.20\text{ rad } [11.5^\circ])]$):**  
  Engages `ADAPTIVE_POSTURAL_BALANCE_STABILIZATION`:
  1. $v_{\text{safe}, x} = 0.0\text{ m/s}$ (eliminates longitudinal inertia pushing the CoM further past the ZMP boundary).
  2. $\omega_{\text{safe}, z} = \text{clamp}(\omega_{\text{raw}, z}, -0.05 \cdot \lambda_{\text{lat}}, +0.05 \cdot \lambda_{\text{lat}})$ (damps rotational torsion on the single-support leg).
  3. Downstream HAL (`YansheeActuatorAdapter` / `yanshee_postural_animator_node.py`) stabilizes double-support stance while forward momentum arrests.

```
                      [Inbound Ingress Stream: /cmd_vel_raw]
                                        │
                                        ▼
    ┌───────────────────────────────────────────────────────────────────────┐
    │ Observability & Context Engine:                                       │
    │ Fuses LiDAR / Virtual Scan d_min AND Gyroscope Tilt θ_tilt / γ_posture│
    └───────────────────────────────────┬───────────────────────────────────┘
                                        │
                                        ▼ C = [d_min, v_act, M, γ_loc, S, θ_tilt]
    ┌───────────────────────────────────────────────────────────────────────┐
    │ Adaptive Mitigation Strategy:                                         │
    │                                                                       │
    │ Step B_gyro: Dynamic Balance Guard (θ_tilt > 0.28 rad or γ_p < 0.20)  │
    │   ├── Engages ADAPTIVE_POSTURAL_BALANCE_STABILIZATION                 │
    │   └── v_safe = 0.0 m/s, |ω_safe| <= 0.05 * λ_lat (Nullifies topple)   │
    │                                                                       │
    │ Check 2: Spatial LiDAR Clearance Guard (d_min < 0.45m or TTC < 1.0s)  │
    │   ├── Halts forward motion                                            │
    │   └── Permits reverse deadlock extrication (v_x < -0.05 m/s)          │
    └───────────────────────────────────────────────────────────────────────┘
```

---

## 4. Architectural Dataflow & Interface Definition

### 4.1 Interface Update: `RobotContext.msg`
The canonical ROS 2 message [`src/horos_interfaces/msg/RobotContext.msg`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_interfaces/msg/RobotContext.msg) is augmented with:
```protobuf
# ------------------------------------------------------------------------------
# 5. Dynamic Postural & Gyroscopic Stability (IMU / Gyroscope Feedback)
# ------------------------------------------------------------------------------
float64 tilt_angle_rad            # Combined inclination: sqrt(roll^2 + pitch^2)
float64 angular_tilt_rate_radps   # Angular velocity magnitude from gyroscope (rad/s)
float64 postural_stability_index  # gamma_posture in [0.0, 1.0] (1.0 = upright, 0.0 = toppling)
```

### 4.2 Actuator Execution: Crouch-Balance Stance
When postural stabilization engages, [`YansheeActuatorAdapter`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_hal/include/horos_hal/yanshee_actuator_adapter.hpp) executes:
```cpp
void execute_crouch_balance()
{
  // 1. Lower Center of Mass (CoM) height h_CoM by flexing hip and knee servos
  // 2. Widen bilateral foot spacing to maximize support polygon S_foot
  // 3. Shift Zero-Moment Point (ZMP) to geometric center of double support
}
```

---

## 5. Thesis Oral Defense Q&A

**Question:** *Why did you introduce gyroscopic postural context for the Yanshee instead of relying exclusively on LiDAR clearance like you did with the Go2?*  
**Defense:** "In cyber-physical security, defense mechanisms must align with the physical vulnerability of the robot's morphology. The Unitree Go2 quadruped has four legs and a wide stance; its primary vulnerability under cyberattack is colliding horizontally with walls, which is best detected by 360° LiDAR. Conversely, the UBTech Yanshee is a bipedal humanoid with high center of mass and narrow feet; an attacker injecting subtle oscillatory commands can easily cause it to lose dynamic balance and topple over without ever hitting a wall. By leveraging Yanshee's built-in 6-axis gyroscope, HOROS detects dynamic tilt ($\beta_{\text{tilt}}$) and angular velocity ($\omega_{\text{gyro}}$) in real-time, executing an active crouch-balance stance that lowers the Center of Mass and prevents toppling. This demonstrates that HOROS is a truly morphology-aware resilience framework."
