# HOROS Technical Specification: Yanshee Virtual LaserScan Perception Bridge

**Document ID:** `TECH-DOC-VSCAN-01`  
**Classification:** Perception Architecture & Cross-Platform Sensor Emulation  
**Author:** Youssef Ashraf Khalil  
**Institution:** German International University (GIU Cairo)  
**Academic Degree:** Bachelor of Science in Computer Science  
**Supervisors:** Dr. Marwa Zamzam, Prof. Slim Abdennadher  
**Target Platforms:** UBTech Yanshee Humanoid / Unitree Go2 EDU / ROS 2 Humble LTS  

---

## 1. Perceptual Asymmetry & Problem Formulation

The HOROS Adaptive Mitigation Engine and Recovery Attestation Gate rely fundamentally on continuous 360° obstacle clearance $d_{\min}$ provided by the standard `sensor_msgs/msg/LaserScan` topic (`/scan`).
* **Unitree Go2:** Carries an onboard Unitree 2D/3D LiDAR delivering authentic 360° planar ray returns ($360$ samples at $20\text{ Hz}$, calibrated range $[0.08\text{m}, 16.0\text{m}]$).
* **UBTech Yanshee Humanoid:** Carries only an HC-SR04 ultrasonic rangefinder mounted on the chest ($60^\circ$ conical FOV, range $[0.02\text{m}, 2.50\text{m}]$) and a monocular head camera. It lacks physical LiDAR hardware.

**The Architectural Dilemma:**
If the defense engine had to be modified to handle different message types (`sensor_msgs/msg/Range` vs `sensor_msgs/msg/LaserScan`), the core C++ mitigation engine (`horos_mitigation_engine`) would suffer from branching complexity, code duplication, and verification divergence.

**The Solution:**
The **Yanshee Virtual LaserScan Node** (`yanshee_virtual_scan_node.py`) acts as a transparent perceptual bridge. It synthesizes a high-fidelity synthetic `sensor_msgs/msg/LaserScan` message onto `/scan` by fusing:
1. Active frontal ultrasonic cone measurements ($[-30^\circ, +30^\circ]$).
2. Monocular vision depth estimation.
3. Egocentric short-term polar memory buffer rotated via IMU odometry yaw.

Downstream HOROS components ([`context_awareness_node`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_simulation/horos_simulation/context_awareness_node.py), [`mitigation_engine_node`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_mitigation_engine/src/mitigation_engine_node.cpp), and [`recovery_engine_node`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_recovery_engine/src/recovery_engine_node.cpp)) execute with **zero code modifications and zero performance overhead**.

```
  [Chest Ultrasonic Cone]            [Visual Eye / Camera Scan]          [Odometry IMU Yaw]
  (30° FOV, 0.04m - 3.50m)        (150° Gazebo / 65° Real Camera)       (/odom twist.angular.z)
             │                                   │                                   │
             └─────────────────┬─────────────────┘                                   │
                               │                                                     │
                               ▼                                                     ▼
    ┌────────────────────────────────────────────────────────────────────────────────────────┐
    │ YansheeVirtualScanNode (20 Hz Synthetic Scan Synthesizer)                              │
    │                                                                                        │
    │ 1. Direct Frontal Mapping ([-75°, +75°] eyes, [-15°, +15°] sonar fusion):              │
    │    Fuses closest verified forward range into virtual 360° planar scan                  │
    │                                                                                        │
    │ 2. Polar Memory Buffer (Persistent Obstacle Tracking):                                 │
    │    Maintains up to 400 world-coordinate points projected back as robot turns           │
    │    Lifetime decay: points older than 4.0s expire to max_range (3.50m)                  │
    │                                                                                        │
    │ 3. Unobserved Sector Default:                                                          │
    │    Unobserved rear sectors default to max_range (3.50m) to avoid phantom corner lock   │
    └──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                               │
                                               ▼ /scan (sensor_msgs/msg/LaserScan, 360 rays)
    ┌────────────────────────────────────────────────────────────────────────────────────────┐
    │ Downstream HOROS Perception: context_awareness_node (Universal Context C Vector)       │
    └────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Mathematical Synthesis Model

The synthetic scan message is configured with 360 angular samples over $[-\pi, +\pi]$ radians ($1^\circ$ resolution, $0.01745\text{ rad/sample}$):

### 2.1 Direct Frontal Projection ($-\frac{\pi}{6} \le \theta \le +\frac{\pi}{6}$)
The ultrasonic transducer emits a spherical wave front. When an obstacle is detected at acoustic distance $d_{\text{us}}$, the radial distance $r(\theta)$ for ray index $i$ corresponding to angle $\theta_i$ is computed via planar projection:
$$r(\theta_i) = \min\left(d_{\max},\ \frac{d_{\text{us}}}{\max\left(\cos(\theta_i),\ 0.50\right)}\right)$$

### 2.2 Egocentric Polar Memory Buffer
Humanoids frequently turn during obstacle avoidance. If the robot sights a wall directly ahead at $0.5\text{ m}$ and pivots $90^\circ$ right, the wall moves into its left blind flank. Without spatial memory, clearance would instantly jump to $5.0\text{ m}$, leading to false open-space classification.

The virtual scan node maintains an egocentric spatial memory ring (up to $400$ world-coordinate obstacle points):
1. **Yaw Rotation Update:** Observed obstacle coordinates $(x_w, y_w)$ are projected into the robot's current odometry pose $(x_r, y_r, \psi_r)$ as the humanoid turns.
2. **Temporal Decay:** Each recorded obstacle carries an observation timestamp $t_{\text{obs}}$ and expires after $\tau_{\text{decay}} = 4.0\text{ s}$ (reverting to `max_range_m = 3.50 m`).
3. **Blind-Zone Attenuation Defense:**
   In addition to memory, the Adaptive Strategy incorporates `lateral_turn_attenuation_ = 0.50` (`0.35` on physical hardware) for Yanshee, restricting aggressive angular yaw into unmapped sectors.

---

## 3. Implementation Details

Located at [`src/horos_simulation/horos_simulation/yanshee_virtual_scan_node.py`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_simulation/horos_simulation/yanshee_virtual_scan_node.py):

* **Input Subscriptions:**
  - `/yanshee/eyes_scan` (`sensor_msgs/msg/LaserScan`, $150^\circ$ wide-angle Gazebo eyes or $65^\circ$ physical camera)
  - `/sonar` (`sensor_msgs/msg/Range`, $30^\circ$ ultrasonic/IR cone)
  - `/odom` (`nav_msgs/msg/Odometry`)
* **Output Publisher:**
  - `/scan` (`sensor_msgs/msg/LaserScan`) at $20\text{ Hz}$
* **Parameters:**
  - `num_rays`: $360$
  - `ultrasonic_cone_deg`: $30.0$
  - `min_range_m`: $0.04\text{ m}$
  - `max_range_m`: $3.50\text{ m}$
  - `memory_decay_sec`: $4.0\text{ s}$

---

## 4. Thesis Oral Defense Q&A

**Question:** *Doesn't synthesizing a virtual 360° scan from forward-facing sensors introduce dangerous blind spots that could allow collisions?*  
**Defense:** "Synthesizing the virtual scan is accompanied by three defense-in-depth safeguards:
1. **Spatial Polar Memory:** Obstacles sighted within the active frontal sector are held in an egocentric world-coordinate memory ring (up to 400 points) and re-projected using IMU yaw odometry for up to 4.0 seconds as the robot turns.
2. **Conservative Blind-Zone Ceiling:** Unobserved sectors default to bounded values and trigger the Zero-Trust Sensory Tripwires (Patch 7) if sudden discontinuities occur.
3. **Kinematic Lateral Attenuation:** For the Yanshee platform, the Adaptive Decision Surface applies a $50\%$ lateral turn attenuation factor (`lateral_turn_attenuation_ = 0.50`), preventing rapid angular rotation into unmapped space. This guarantees that the humanoid maneuvers within verified forward corridors."
