# Technical Reference: Simulation Environment, URDF, & Perception

**Package:** `horos_simulation`  
**Platform:** Gazebo Classic 11 / ROS 2 Humble  
**Author:** Youssef Ashraf Khalil (GIU Cairo)  

---

## 1. Unitree Go2 URDF Model & Physics Optimization

**Generator Script:** [`src/horos_simulation/urdf/generate_go2_urdf.py`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_simulation/urdf/generate_go2_urdf.py)  
**Generated URDF:** [`src/horos_simulation/urdf/go2_robot.urdf`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_simulation/urdf/go2_robot.urdf)  

### Key Adaptations:
1. **ODE Physics Stability:**
   - Real-world quadruped leg dynamics under open-loop torque controllers frequently collapse or jitter in simulation. All 12 revolute joint connections were locked into a rigid standing stance (`type="fixed"`) with foot contact height $z = 0.43\text{ m}$.
   - All links with near-zero mass ($< 1\text{ mg}$) or degenerate inertias were patched to positive definite values ($m \ge 0.05\text{ kg}$, $I_{xx,yy,zz} \ge 10^{-5}\text{ kg}\cdot\text{m}^2$) to satisfy ODE physics solver stability.
2. **Local Mesh Resolution:**
   - Swapped `package://go2_description/...` URIs to absolute `file:///home/joe/horos_ws/...` filesystem paths, eliminating Gazebo OGRE mesh resolution freezes.
3. **Planar Locomotion Plugin:**
   - Loaded `libgazebo_ros_planar_move.so` on `base_footprint`.
   - Subscribes to `/cmd_vel` at $50\text{ Hz}$ and publishes ground-truth `/odom` and `odom -> base_footprint` TF.
4. **Horizontal 360° LiDAR Sensor Mount:**
   - Mount link: `lidar_link` with visual puck geometry mounted to `base` at `xyz="0.25 0 0.16"`.
   - Elevation: $z \approx 0.60\text{ m}$ off the ground.
   - Sensor plugin: `libgazebo_ros_ray_sensor.so` publishing to `/scan` at $20\text{ Hz}$.
   - Visual Raycast: `<visualize>true</visualize>` renders the 360° blue laser rays in the Gazebo GUI.
   - Minimum Range: `<min>0.28</min>` (prevents self-detection of the robot's own head or chassis).

---

## 2. Multi-Scenario Environmental Benchmark Suite

The HOROS Framework provides 4 distinct Gazebo simulation worlds located in [`src/horos_simulation/worlds/`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_simulation/worlds):

### 1. `obstacle_corridor.world` (Alias: `confined_space`)
* **Geometry:** $14.0\text{ m} \times 3.6\text{ m}$ enclosed corridor with containment walls and staggered slalom obstacles:
  * Obstacle 1: Red barrier ($x=3.5\text{ m}, y=-0.75\text{ m}$, width $1.3\text{ m}$).
  * Obstacle 2: Yellow column ($x=6.5\text{ m}, y=+0.75\text{ m}$, radius $0.35\text{ m}$).
  * Obstacle 3: Blue barrier ($x=9.5\text{ m}, y=-0.75\text{ m}$, width $1.3\text{ m}$).
* **Thesis Rationale (RQ2):** High obstacle density ($0.35\text{ m} \le d_{\min} < 1.40\text{ m}$). Proves context blindness of state-of-the-art dynamic policy matrices (which crash into barriers at $0.12\text{ m}$) compared to HOROS LiDAR-aware adaptive mitigation ($d_{\min} \ge 0.48\text{ m}$).

### 2. `open_space.world`
* **Geometry:** Wide unobstructed open hall ($20.0\text{ m} \times 20.0\text{ m}$) with boundary perimeter walls at $d_{\min} > 5.0\text{ m}$.
* **Thesis Rationale (RQ1):** Evaluates mission availability preservation. Proves that HOROS does not unnecessarily throttle nominal cruise speed ($0.35\text{ m/s}$) when cyberattacks are detected in safe, barrier-free environments.

### 3. `near_human.world`
* **Geometry:** Corridor populated with dynamic/static human pedestrian models within the robot's immediate safety perimeter ($d_{\min} < 1.0\text{ m}$).
* **Thesis Rationale (RQ2):** Evaluates ISO 3691-4 industrial cobot human-protection compliance: adaptive engine immediately drops into zero-turn protective stop and yields a wide safety buffer.

### 4. `tight_room.world`
* **Geometry:** Confined rectangular room ($4.0\text{ m} \times 4.0\text{ m}$) with narrow entrance doorway ($d_{\min} < 0.60\text{ m}$).
* **Thesis Rationale (RQ2 & RQ3):** High entrapment and collision hazard. Validates autonomous safe recovery from tight corners and avoids oscillation or wall sticking under attack.

---

## 3. Context Awareness & Perception Node

**Node File:** [`src/horos_simulation/horos_simulation/context_awareness_node.py`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_simulation/horos_simulation/context_awareness_node.py)  
**Executable:** `context_awareness_node`  

### Algorithm Walkthrough:
1. **LiDAR Beam Filtering:**
   - Subscribes to `/scan` (`sensor_msgs/msg/LaserScan`).
   - Slices rays within the forward field of view ($[-45^\circ, +45^\circ]$).
   - Rejects any beam where $r < 0.28\text{ m}$ (chassis self-collision guard).
   - Computes minimum forward distance $d_{\text{min}}$.
2. **Odometry Covariance & Localization Confidence:**
   - Extracts position variance $\sigma_x^2, \sigma_y^2$ from `Odometry.pose.covariance`.
   - Computes normalized localization confidence $\gamma_{\text{loc}} = \frac{1.0}{1.0 + 2.0 \cdot \sigma_{\text{pos}}} \in [0.0, 1.0]$.
3. **Context Categorization & Risk Computation:**
   - $d_{\text{min}} < 0.60\text{ m}$: `CONTEXT_NEAR_HUMAN` (Risk $0.95$). If $d_{\text{min}} \le 0.32\text{ m}$, logs `COLLISION DETECTED`.
   - $0.60\text{ m} \le d_{\text{min}} < 1.30\text{ m}$: `CONTEXT_CONFINED_SPACE` (Risk smoothly interpolated from $0.70$ to $0.90$).
   - $1.30\text{ m} \le d_{\text{min}} < 3.00\text{ m}$: `CONTEXT_NORMAL` (Risk $0.35$).
   - $d_{\text{min}} \ge 3.00\text{ m}$: `CONTEXT_OPEN_FIELD` (Risk $0.10$).
4. **Broadcasting:**
   - Publishes `horos_interfaces/msg/RobotContext` onto `/horos/context` at $10\text{ Hz}$ with Reliable QoS.

---

## 4. Multi-Scenario Terminal Launcher Reference

The launch architecture supports unified terminal configuration across all 4 environments and defense modes:

```bash
# 1. Confined Obstacle Slalom (Default)
ros2 launch horos_simulation horos_system.launch.py scenario:=confined_space mode:=adaptive recovery_strategy:=adaptive

# 2. Open Space Hallway
ros2 launch horos_simulation horos_system.launch.py scenario:=open_space mode:=adaptive recovery_strategy:=adaptive

# 3. Dynamic Human Encounter
ros2 launch horos_simulation horos_system.launch.py scenario:=near_human mode:=adaptive recovery_strategy:=adaptive

# 4. Enclosed Tight Room
ros2 launch horos_simulation horos_system.launch.py scenario:=tight_room mode:=adaptive recovery_strategy:=adaptive
```

### Supported Launch Arguments:
* `scenario`: `'confined_space'` (or `'obstacle_corridor'`), `'open_space'`, `'near_human'`, `'tight_room'`.
* `mode`: `'adaptive'` (default), `'dynamic'`, `'static'`, `'bypass'`.
* `recovery_strategy`: `'adaptive'` (default), `'phased'`, `'condition_based'`, `'fixed_time'`.
* `gui`: `'true'` (default) or `'false'` (for headless automated benchmark sweeps).
* `world`: Optional explicit path to a custom `.world` file (overrides `scenario`).
