# HOROS Technical Specification: Actuator Choke Point & Hardware Remapping (Patch 3)

**Document ID:** `TECH-DOC-CHOKEPOINT-01`  
**Classification:** Actuation Security Architecture & SROS2 Enclave Governance  
**Author:** Youssef Ashraf Khalil  
**Institution:** German International University (GIU Cairo)  
**Academic Degree:** Bachelor of Science in Computer Science  
**Supervisors:** Dr. Marwa Zamzam, Prof. Slim Abdennadher  
**Target Platforms:** Unitree Go2 EDU Quadruped / UBTech Yanshee Humanoid / ROS 2 Humble LTS  

---

## 1. Vulnerability Analysis: The Unenforced Actuator Bypass

In standard ROS 2 mobile robot navigation stacks (including standard Nav2 installations and manufacturer SDKs), physical actuators, low-level MCU bridges, and Gazebo simulation plugins subscribe directly to the public velocity topic `/cmd_vel`.

**The Fatal Bypass Flaw:**
If an adversary gains DDS participant access, they do not need to attack `/cmd_vel_raw` or compromise the mitigation engine. They can simply publish malicious commands directly onto `/cmd_vel`. In a standard architecture, the robot motors execute these commands immediately, rendering all inline defenses completely impotent.

```
[VULNERABLE BASELINE ARCHITECTURE]
Adversary ====> /cmd_vel ====> [Physical Motors]  <-- COMPLETE DEFENSIVE BYPASS!
                  ▲
                  │
[Mitigation Engine]

---------------------------------------------------------------------------------

[HOROS ENFORCED ACTUATOR CHOKE POINT ARCHITECTURE]
Adversary ====> /cmd_vel_raw (Trap)
                     │
                     ▼
       ┌───────────────────────────┐
       │ Mitigation Engine         │
       └─────────────┬─────────────┘
                     │ /cmd_vel_mitigated
                     ▼
       ┌───────────────────────────┐
       │ Recovery Engine Gate      │
       └─────────────┬─────────────┘
                     │ Verified Safe Command ONLY
                     ▼
          [COMMAND SAFETY GATE]
                     │
                     ▼ /go2/safe_cmd_vel (PRIVATE CHOKE POINT TOPIC)
       ┌───────────────────────────┐
       │ Physical Motor MCU /      │
       │ Gazebo planar_move Plugin │
       └───────────────────────────┘
```

---

## 2. Engineering Remediation & Implementation

### 2.1 Simulation Actuator Plugin Remapping
In the Unitree Go2 URDF ([`src/horos_simulation/urdf/go2_robot.urdf`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_simulation/urdf/go2_robot.urdf#L687-L693)) and the procedural generator script ([`src/horos_simulation/urdf/generate_go2_urdf.py`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_simulation/urdf/generate_go2_urdf.py#L107-L114)), the Gazebo planar locomotion plugin is remapped:

```xml
<gazebo>
  <plugin name="go2_planar_drive" filename="libgazebo_ros_planar_move.so">
    <ros>
      <namespace>/</namespace>
      <!-- Actuator Choke Point (Patch 3): Physical actuators listen strictly to safe_cmd_vel -->
      <remapping>cmd_vel:=/go2/safe_cmd_vel</remapping>
      <remapping>odom:=odom</remapping>
    </ros>
    <update_rate>50</update_rate>
    <publish_rate>50</publish_rate>
  </plugin>
</gazebo>
```

### 2.2 Physical Actuator Bridge Remapping
In the Universal Hardware Abstraction Layer:
* **Unitree Go2:** [`Go2ActuatorAdapter`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_hal/include/horos_hal/go2_actuator_adapter.hpp) binds its publisher strictly to `/go2/safe_cmd_vel` to dispatch low-level UDP packets to the Unitree SDK2 Sport port (`192.168.123.161:8082`).
* **UBTech Yanshee:** [`YansheeActuatorAdapter`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_hal/include/horos_hal/yanshee_actuator_adapter.hpp) binds its subscriber strictly to `/yanshee/safe_cmd_vel` to dispatch servo serial gait commands.

### 2.3 Recovery Engine Integration
The Recovery Engine Domain node ([`recovery_engine_node.cpp`](file:///e:/Giu%20%20files/semster%207/horos_framework/src/horos_recovery_engine/src/recovery_engine_node.cpp)) declares the safe output topic dynamically from the declarative robot profile:
* Default parameter: `'output_cmd_topic': '/go2/safe_cmd_vel'`
* All verified velocity commands from the Phase S-Curve ramp exit solely through this choked topic.

---

## 3. SROS2 Security Governance & Enclave Isolation

To make the Choke Point cryptographically impenetrable in production edge deployments, HOROS specifies an **SROS2 (Secure ROS 2) Enclave Policy**:
1. **DDS Security Permissions:** Public participants on the DDS network are granted `READ`/`WRITE` on `/cmd_vel_raw` only.
2. **Exclusive Publish Authorization:** Publishing rights on `/go2/safe_cmd_vel` are restricted exclusively to the `recovery_engine_node` certificate enclave (`/horos/recovery_engine`).
3. **Hardware Isolation:** Even if an adversary injects millions of packets on `/cmd_vel`, DDS middleware drops the packets at the network transport layer before they reach motor drivers.

---

## 4. Thesis Oral Defense Q&A

**Question:** *How does your architecture guarantee that an attacker cannot simply bypass all your defensive nodes and send commands directly to the robot's physical motors?*  
**Defense:** "In HOROS, an attacker cannot bypass defenses because the physical motor MCU and simulation planar drive plugin have been completely severed from standard public topics like `/cmd_vel`. They listen exclusively on a private, isolated actuator topic: `/go2/safe_cmd_vel`. The only entity granted permission to publish to this topic is the Command Safety Gate at the terminal stage of our Recovery Engine. Any rogue participant transmitting on public topics is trapped upstream and evaluated by our mitigation and attestation gates."
