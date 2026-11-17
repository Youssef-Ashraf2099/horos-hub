# HOROS Technical Specification: Robot Hardware Auto-Detection Engine & Dynamic Launch System

**Document ID:** `TECH-DOC-AUTODETECT-01`  
**Classification:** Core System Architecture & Platform Initialization  
**Author:** Youssef Ashraf Khalil  
**Institution:** German International University (GIU Cairo)  
**Academic Degree:** Bachelor of Science in Computer Science  
**Supervisors:** Dr. Marwa Zamzam, Prof. Slim Abdennadher  
**Target Platforms:** Unitree Go2 EDU Quadruped / UBTech Yanshee Humanoid / ROS 2 Humble LTS  

---

## 1. Architectural Role & Problem Formulation

In heterogeneous robotic deployments, operating systems use platform probing (e.g., `uname -s`, device trees) to select kernel drivers dynamically. Conversely, traditional ROS 2 stacks require users to maintain completely separate launch trees and source forks for each robot:
* Separate launch files (`go2_defense.launch.py` vs. `yanshee_defense.launch.py`).
* Hardcoded topic names and kinematic velocity caps.
* High operational failure rate during field deployments if wrong arguments are supplied.

The **HOROS Robot Auto-Detection Engine** introduces deterministic platform interrogation at startup. When `ros2 launch horos_simulation horos_system.launch.py robot:=auto` executes, the system inspects embedded silicon identity, device trees, network subnets, and environment variables to automatically identify whether it is running on a **Unitree Go2** or a **UBTech Yanshee**, dynamically loading the corresponding declarative profile and configuring node parameters with **zero manual intervention and zero recompilation**.

```
                           [System Startup Trigger]
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │ Tier 1: Environment Probe │
                        │ $ROBOT_TYPE / $HOROS_ROBOT│
                        └─────────────┬─────────────┘
                                      │ (If unset)
                                      ▼
                        ┌───────────────────────────┐
                        │ Tier 2: Linux Device Tree │
                        │ /proc/device-tree/model   │
                        └─────────────┬─────────────┘
                                      │ (If inconclusive)
                                      ▼
                        ┌───────────────────────────┐
                        │ Tier 3: CPU Architecture  │
                        │ Silicon Model in cpuinfo  │
                        └─────────────┬─────────────┘
                                      │ (If inconclusive)
                                      ▼
                        ┌───────────────────────────┐
                        │ Tier 4: Subnet Inspection │
                        │ 192.168.123.x (Unitree)   │
                        └─────────────┬─────────────┘
                                      │ (If inconclusive)
                                      ▼
                        ┌───────────────────────────┐
                        │ Tier 5: Safe Fallback     │
                        │ Defaults to 'go2'         │
                        └─────────────┬─────────────┘
                                      │
                                      ▼ Resolved Platform: 'go2' | 'yanshee'
                        ┌───────────────────────────┐
                        │ Load Declarative Profile  │
                        │ config/robots/*.yaml      │
                        └─────────────┬─────────────┘
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            ▼                                                   ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│ Mitigation Engine Parameters  │               │ Recovery Engine Parameters    │
│ • nominal_cruise_v: 0.35/0.08 │               │ • output_cmd_topic: safe_topic│
│ • min_clearance_emergency     │               │ • kinematic_max_linear        │
│ • lateral_turn_attenuation    │               │ • kinematic_max_angular       │
└───────────────────────────────┘               └───────────────────────────────┘
```

---

## 2. Hierarchical 5-Tier Detection Algorithm

The detection engine is implemented in [`src/horos_simulation/horos_simulation/robot_detector.py`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_simulation/horos_simulation/robot_detector.py):

### Tier 1: Explicit Environment Variable Override
Inspects `$ROBOT_TYPE` and `$HOROS_ROBOT`:
- If value contains `"yanshee"` $\implies$ returns `yanshee`.
- If value contains `"go2"` or `"unitree"` $\implies$ returns `go2`.
*Defensive Rationale:* Allows containerized CI/CD pipelines, Docker tests, and developer simulation sweeps to explicitly force a morphology regardless of host hardware.

### Tier 2: Linux Device Tree Hardware Model Inspection
Reads `/proc/device-tree/model`:
- `"Raspberry Pi"` string match $\implies$ resolves to `yanshee` (runs on onboard Raspberry Pi 3B+/4).
- `"NVIDIA Jetson"`, `"Orin"`, or `"Tegra"` match $\implies$ resolves to `go2` (runs on Jetson Orin NX 8-Core).

### Tier 3: CPU Architecture & Silicon Model Probing
Inspects `/proc/cpuinfo` for ARM silicon part identifiers:
- Broadcom CPU cores (`BCM2835`, `BCM2837`, `BCM2711`) $\implies$ resolves to `yanshee`.
- NVIDIA Tegra Cortex-A78AE silicon part ID (`0x00000000410fd420`) $\implies$ resolves to `go2`.

### Tier 4: Hardware Peripheral & Network Interface Inspection
Unitree Go2 EDU quadruped carries a factory-configured internal subnet `192.168.123.x` on Ethernet port `eth0` for low-level motor MCU communication.
- Probes local network interfaces using `socket.gethostbyname_ex()`:
  - If any IP address belongs to `192.168.123.0/24` $\implies$ resolves to `go2`.

### Tier 5: Safe Default Fallback (Preserving Go2 Invariance)
If running on an uninstrumented developer laptop (e.g., standard x86-64 Intel/AMD CPU), hardware probes are inconclusive.
- Automatically falls back to `go2`.
*Academic Rationale:* Guarantees 100% backward compatibility with all 81 historical thesis benchmark trials on Unitree Go2 without breaking existing test harnesses.

---

## 3. Dynamic Profile Loading Protocol

Once the platform string is resolved (`go2` or `yanshee`), `robot_detector.load_robot_profile()` locates the profile YAML across search paths:
1. `horos_framework/config/robots/`
2. `~/horos_ws/config/robots/`
3. `/etc/horos/robots/`

The profile dictionary is parsed and injected directly into ROS 2 node parameters.

---

## 4. Master Launch System Integration

In [`src/horos_simulation/launch/horos_system.launch.py`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_simulation/launch/horos_system.launch.py), dynamic configuration is executed using `OpaqueFunction`:

```python
def launch_setup(context, *args, **kwargs):
    robot_target = LaunchConfiguration('robot').perform(context).lower().strip()
    if robot_target == 'auto':
        platform_name = detect_robot_platform()
    else:
        platform_name = robot_target

    profile = load_robot_profile(platform_name)
    kinematics = profile.get('kinematics', {})
    geometry = profile.get('geometry', {})
    interfaces = profile.get('interfaces', {})

    # Injected into Mitigation Engine:
    nominal_cruise_v = float(kinematics.get('nominal_cruise_velocity_mps', 0.35))
    min_clearance_emergency = float(geometry.get('min_obstacle_clearance_m', 0.45))
    lateral_turn_attenuation = 0.50 if platform_name == 'yanshee' else 1.0

    # Injected into Recovery Engine:
    safe_output_topic = interfaces.get('safe_output_cmd_topic', '/go2/safe_cmd_vel')
```

### Launch Invocation Modes:
```bash
# 1. Fully Autonomous Mode (auto-detects hardware or defaults to Go2)
ros2 launch horos_simulation horos_system.launch.py

# 2. Explicit Humanoid Deployment Mode
ros2 launch horos_simulation horos_system.launch.py robot:=yanshee

# 3. Explicit Headless Benchmark Sweep Mode
ros2 launch horos_simulation horos_system.launch.py robot:=go2 gui:=false scenario:=confined_space
```

---

## 5. Thesis Oral Defense Q&A

**Question:** *Why not use CMake `#ifdef` preprocessor directives at compile time rather than runtime auto-detection?*  
**Defense:** "Compile-time `#ifdef` directives produce separate binary artifacts for each robot, introducing maintenance drift, doubling deployment packaging overhead, and requiring physical recompilation on target hardware. In edge robotics, field software updates should be distributed as a single unified container or package. By implementing hierarchical runtime auto-detection with declarative YAML profiles, HOROS decouples algorithmic security logic from hardware targets. The same binary image boots on a Jetson Orin NX quadruped or a Raspberry Pi humanoid, interrogates its silicon identity in $< 5\text{ ms}$, and binds the appropriate kinematic decision surface instantaneously."
