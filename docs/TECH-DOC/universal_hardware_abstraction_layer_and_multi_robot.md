# HOROS Technical Specification: Universal Hardware Abstraction Layer (U-HAL) & Multi-Robot Portability

**Document ID:** `TECH-DOC-UHAL-01`  
**Classification:** Core System Architecture & Cross-Platform Portability  
**Author:** Youssef Ashraf Khalil  
**Institution:** German International University (GIU Cairo)  
**Academic Degree:** Bachelor of Science in Computer Science  
**Supervisors:** Dr. Marwa Zamzam, Prof. Slim Abdennadher  
**Target Platforms:** Unitree Go2 EDU Quadruped / UBTech Yanshee Humanoid / ROS 2 Humble LTS  

---

## 1. Architectural Motivation & Theoretical Rationale

A critical deficiency in academic robotic cyber-physical defense frameworks is **plant coupling**: defense algorithms are frequently hardcoded to a single robot's kinematic limits, sensor mounting geometry, and motor interface protocols. When deployed on a different robotic morphology (e.g. transitioning from a quadruped to a biped humanoid), the defense fails due to:
1. **Actuator Settling Lag Disparity:** Quadrupeds stabilize continuous 50 Hz velocity streams via four-point stance impedance with a physical settling lag $\tau_{\text{settle}} \approx 0.05\text{ s}$. Biped humanoids execute discrete step-quantized gait cycles ($\tau_{\text{step}} \approx 0.8\text{ s}$); cutting velocity mid-stride causes catastrophic loss of dynamic balance and tipping.
2. **Kinematic Scale Mismatch:** Nominal cruise speed for Unitree Go2 is $0.35\text{ m/s}$ (max $1.20\text{ m/s}$), whereas for UBTech Yanshee it is $0.08\text{ m/s}$ (max $0.15\text{ m/s}$). Clamping attacks using quadruped limits on a humanoid results in physical motor burnout or joint limits tripping.
3. **Sensory Morphology Asymmetry:** Go2 carries 360° LiDAR (`/scan`, 20 Hz, 15 m), while Yanshee carries a frontal 30° ultrasonic/IR rangefinder paired with a head-mounted camera (`65°` FOV / 65 beams on physical hardware; `150°` wide-angle simulated eye scan in Gazebo).

The **HOROS Universal Hardware Abstraction Layer (U-HAL)** decouples the cyber-resilience decision surfaces (Domain 1 Inline Mitigation and Domain 2 Autonomous Safe Recovery) from the physical motor plant, enabling a **Single Unified Codebase** that runs interchangeably across quadrupeds and humanoids (analogous to cross-platform OS design).

```
                             +-------------------------------+
                             | Domain 1: Mitigation Engine   |
                             +---------------+---------------+
                                             | /cmd_vel_mitigated
                                             v
                             +-------------------------------+
                             | Domain 2: Recovery Engine     |
                             +---------------+---------------+
                                             | Verified Safe Cmd
                                             v
                           +-----------------------------------+
                           |   COMMAND SAFETY GATE CHOKE POINT |
                           +-----------------+-----------------+
                                             |
             +-------------------------------+-------------------------------+
             |                                                               |
             v                                                               v
+----------------------------+                                 +----------------------------+
| Go2ActuatorAdapter         |                                 | YansheeActuatorAdapter     |
| - High-freq continuous streaming                              | - Step-quantized gait cycle|
| - 4-limb stance squat halt |                                 | - Crouch balance halt      |
| - Settling lag: 0.05s      |                                 | - Settling lag: 0.60s      |
| - Topic: /go2/safe_cmd_vel |                                 | - Topic: /yanshee/safe_cmd_vel
+----------------------------+                                 +----------------------------+
             |                                                               |
             v                                                               v
[Unitree Go2 Quadruped MCU]                                    [UBTech Yanshee 17-DoF Servos]
```

---

## 2. Package Architecture (`horos_hal`)

The `horos_hal` package is implemented as a high-performance C++ header-only interface library (`ament_cmake`) located at [`src/horos_hal`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_hal):

```
src/horos_hal/
├── CMakeLists.txt
├── package.xml
└── include/
    └── horos_hal/
        ├── actuator_bridge.hpp          # Pure virtual IActuatorBridge interface
        ├── go2_actuator_adapter.hpp     # Quadruped continuous velocity streaming adapter
        ├── yanshee_actuator_adapter.hpp # Humanoid step-quantized gait cycle adapter
        └── robot_detector.hpp           # Native C++ platform identification utility
```

### 2.1 The `IActuatorBridge` Abstract Interface
Defined in [`src/horos_hal/include/horos_hal/actuator_bridge.hpp`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_hal/include/horos_hal/actuator_bridge.hpp):

```cpp
class IActuatorBridge
{
public:
  virtual ~IActuatorBridge() = default;

  // Dispatches verified safe kinematic command to low-level motor drivers
  virtual bool dispatch_velocity(const geometry_msgs::msg::Twist & cmd) = 0;

  // Triggers morphology-aware emergency physical stop
  virtual void emergency_halt() = 0;

  // Returns physical settling time (seconds) required for deceleration dissipation
  virtual double settling_time_sec() const = 0;

  virtual std::string get_platform_name() const = 0;
  virtual double max_linear_velocity() const = 0;
  virtual double max_angular_velocity() const = 0;
};
```

---

## 3. Platform Adapter Implementations

### 3.1 Unitree Go2 Quadruped Adapter (`Go2ActuatorAdapter`)
- **File:** [`src/horos_hal/include/horos_hal/go2_actuator_adapter.hpp`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_hal/include/horos_hal/go2_actuator_adapter.hpp)
- **Locomotion Paradigm:** High-frequency continuous velocity streaming ($20 - 50\text{ Hz}$).
- **Actuator Choke Point Topic:** `/go2/safe_cmd_vel`.
- **Physical Kinematic Envelopes:**
  - $v_{\max} = 1.20\text{ m/s}$
  - $\omega_{\max} = 1.50\text{ rad/s}$
  - Settling lag $\tau_{\text{settle}} = 0.05\text{ s}$
- **Emergency Halt Behavior:** Clamps $(v_x, \omega_z) = (0, 0)$ instantly. Quadruped leg impedance controllers drop body height by $5\text{ cm}$ into a 4-limb low-gravity stable squat stance, preventing rollover.

### 3.2 UBTech Yanshee Humanoid Adapter (`YansheeActuatorAdapter`)
- **File:** [`src/horos_hal/include/horos_hal/yanshee_actuator_adapter.hpp`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_hal/include/horos_hal/yanshee_actuator_adapter.hpp)
- **Locomotion Paradigm:** Step-quantized gait cycle execution. Humanoid bipedal locomotion consists of alternating single-support swing phases and double-support stance phases. Cutting motor torque mid-stride trips the robot.
- **Actuator Choke Point Topic:** `/yanshee/safe_cmd_vel`.
- **Physical Kinematic Envelopes:**
  - $v_{\max} = 0.15\text{ m/s}$
  - $\omega_{\max} = 0.35\text{ rad/s}$
  - Gait period $\tau_{\text{step}} = 0.80\text{ s}$
  - Settling lag $\tau_{\text{settle}} = 0.60\text{ s}$
- **Quantized Step Dispatch:** Tracks elapsed step time ($t - t_{\text{step\_start}}$). If a new command arrives mid-step, it queues the command and completes the current swing phase before committing the new trajectory.
- **Emergency Halt Behavior (Biped Crouch Balance):**
  Commands both feet into a symmetrical double-support stance with knees flexed by $15^\circ$ (`"crouch_balance"`). This lowers the Center of Mass (CoM) inside the support polygon, dissipating forward momentum without forward face-planting.

---

## 4. Declarative Robot Profiles

Rather than compiling separate binaries, robot kinematics, geometry, perception, and topic mappings are declared in external YAML configuration files:

### 4.1 Unitree Go2 Profile ([`config/robots/go2_profile.yaml`](file:///e:/Giu%20%20files/semster%207/horos_framework/config/robots/go2_profile.yaml))
```yaml
robot_profile:
  platform_name: "Unitree_Go2_EDU"
  morphology_type: "QUADRUPED"
  kinematics:
    nominal_cruise_velocity_mps: 0.35
    max_linear_velocity_x_mps: 0.80
    max_angular_velocity_z_radps: 1.20
    max_linear_acceleration_mps2: 2.50
    settling_time_lag_sec: 0.05
  geometry:
    min_obstacle_clearance_m: 0.45
    caution_obstacle_clearance_m: 1.40
    safety_buffer_zone_m: 0.45
  perception:
    primary_sensor: "360_LIDAR"
    fov_degrees: 360.0
    scan_topic: "/scan"
  interfaces:
    safe_output_cmd_topic: "/go2/safe_cmd_vel"
```

### 4.2 UBTech Yanshee Profile ([`config/robots/yanshee_profile.yaml`](file:///e:/Giu%20%20files/semster%207/horos_framework/config/robots/yanshee_profile.yaml))
```yaml
robot_profile:
  platform_name: "UBTech_Yanshee"
  morphology_type: "BIPED_HUMANOID"
  kinematics:
    nominal_cruise_velocity_mps: 0.08
    max_linear_velocity_x_mps: 0.15
    max_angular_velocity_z_radps: 0.35
    max_linear_acceleration_mps2: 0.30
    settling_time_lag_sec: 0.60
    gait_step_period_sec: 0.80
  geometry:
    min_obstacle_clearance_m: 0.25
    caution_obstacle_clearance_m: 0.80
    safety_buffer_zone_m: 0.25
  perception:
    primary_sensor: "VIRTUAL_SCAN_HYBRID"
    fov_degrees: 60.0
    scan_topic: "/scan"
  interfaces:
    safe_output_cmd_topic: "/yanshee/safe_cmd_vel"
```

---

## 5. Thesis Oral Defense Q&A

**Question:** *How does your architecture handle biped tipping during emergency stops without violating real-time mitigation latency?*  
**Defense:** "In bipedal robotics, zeroing velocity instantly while in single-support swing causes dynamic momentum rotation around the stance foot ankle, tipping the robot over. The HOROS U-HAL solves this through the `YansheeActuatorAdapter`: upon receiving an emergency halt, it does not cut motor power arbitrarily. Instead, it completes the active single-support sub-step within bounded time and commands a symmetrical double-support crouch-balance stance that lowers the Center of Mass within the support polygon. The mitigation decision itself is computed in $< 0.18\text{ ms}$, while the HAL executes the morphology-safe mechanical deceleration."
