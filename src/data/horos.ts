export interface BadgeItem {
  label: string;
  value: string;
  tone: 'blue' | 'amber' | 'slate' | 'emerald' | 'orange';
  href?: string;
}

export interface ThreatVector {
  id: string;
  code: string;
  title: string;
  tier: 'I' | 'II' | 'III';
  tierLabel: string;
  severity: 'High' | 'Critical' | 'Extreme';
  mitreTag: string;
  attackMechanism: string;
  horosDefense: string;
  metricImpact: string;
}

export interface BenchmarkRow {
  dimension: string;
  bypass: string;
  staticMode: string;
  dynamicMode: string;
  adaptiveHoros: string;
}

export const SITE_META = {
  title: 'HOROS Framework | Autonomous Robot Cyber-Resilience & Safe Recovery',
  shortTitle: 'HOROS',
  tagline: 'Smart Cyber-Defense & Autonomous Safe Recovery for Autonomous Robots',
  description:
    'HOROS (v1.1.1.1 Anubis) is an open-source ROS 2 Humble, C++, and Python cyber-resilience framework providing microsecond-fast Control Barrier Function mitigation and autonomous 6-state safe recovery for quadruped and biped robots.',
  keywords: [
    'ROS 2 cybersecurity',
    'robot intrusion prevention',
    'HOROS framework',
    'autonomous robot cyber resilience',
    'Sampled-Data Control Barrier Functions',
    'SD-CBF',
    'Unitree Go2',
    'UBTech YanShee',
    'robotics security',
    'safe recovery',
  ],
  repoUrl: 'https://github.com/Youssef-Ashraf2099/horos_framework',
  hubUrl: 'https://github.com/Youssef-Ashraf2099/horos-hub',
  releasesUrl: 'https://github.com/Youssef-Ashraf2099/horos_framework/releases',
  authorGithub: 'https://github.com/Youssef-Ashraf2099',
  authorPortfolio: 'https://youssef-ashraf.vercel.app/',
  authorLinkedin: 'https://www.linkedin.com/in/youssef-ashraf-5a3167261/',
  authorName: 'Youssef Ashraf Khalil',
  authorHeadline: 'Computer Science (Cybersecurity Major) · Software & Systems Engineer · Tech Enthusiast',
  authorBio:
    'Computer Science student majoring in Cybersecurity at the German International University (GIU Cairo), with hands-on experience in software and systems engineering. A tech enthusiast passionate about building resilient, low-latency software where cybersecurity, systems architecture, and real-world hardware meet.',
  institution: 'German International University (GIU Cairo)',
  faculty: 'Faculty of Computer Science',
  supervisors: ['Dr. Marwa Zamzam', 'Prof. Slim Abdennadher'],
  version: 'v1.1.1.1',
  codename: 'Anubis',
  license: 'Apache 2.0',
  quote:
    "What if your robot didn't freeze or crash when attacked, but stayed calm, stayed on its feet, and safely carried on?",
};

export const HERO_BADGES: BadgeItem[] = [
  { label: 'Version', value: 'v1.1.1.1', tone: 'blue', href: `${SITE_META.releasesUrl}` },
  { label: 'Milestone', value: 'Anubis', tone: 'amber', href: `${SITE_META.repoUrl}/blob/main/VERSION_HISTORY.md` },
  { label: 'ROS 2', value: 'Humble', tone: 'slate' },
  { label: 'OS', value: 'Ubuntu 22.04 LTS', tone: 'orange' },
  { label: 'Morphology', value: 'Quadruped | Biped', tone: 'emerald' },
  { label: 'License', value: 'Apache 2.0', tone: 'blue', href: `${SITE_META.repoUrl}/blob/main/LICENSE` },
];

export const KEY_HIGHLIGHTS = [
  {
    metric: '100%',
    title: 'Collision-Free',
    detail: '0 crashes across physical hardware & matched simulation benchmarks',
    accent: 'emerald',
  },
  {
    metric: '50–60%',
    title: 'Preserved Mission Flow',
    detail: 'Maintains walking task continuity even under active cyberattack',
    accent: 'blue',
  },
  {
    metric: 'Zero',
    title: 'Biped Topples',
    detail: 'Active ZMP gyroscopic damping prevents humanoid pitch/roll falls',
    accent: 'amber',
  },
  {
    metric: '< 10 µs',
    title: 'Microsecond Fast',
    detail: 'C++ inline mitigation decisions in 4.28 µs (sim) / 8.95 µs (RPi 3)',
    accent: 'cyan',
  },
  {
    metric: '~1.2 s',
    title: 'Self-Healing Autopilot',
    detail: '6-state autonomous recovery smoothly ramps back to cruising speed',
    accent: 'emerald',
  },
  {
    metric: '1 GB RAM',
    title: 'Ultra-Lightweight',
    detail: 'Zero-copy C++ node composition runs comfortably on Raspberry Pi 3',
    accent: 'blue',
  },
];

export const COMPARISON_PARADIGMS = [
  {
    badge: 'Traditional Approach',
    title: 'The "Panic Button" (Binary E-Stop)',
    verdict: 'Safe, but 0% Mission Progress',
    tone: 'red' as const,
    summary: 'Slams the brakes immediately on any anomaly.',
    points: [
      'Freezes dead in its tracks (0% task continuity).',
      'Requires manual human reset to move again.',
      'For walking bipeds or quadrupeds, sudden locking induces inertia shock and falls.',
    ],
  },
  {
    badge: 'Naive Heuristic',
    title: 'The "Software Throttler"',
    verdict: '72–100% Collision Rate',
    tone: 'amber' as const,
    summary: 'Slows velocity down by a fixed severity percentage.',
    points: [
      'Completely blind to physical walls and dynamic obstacles.',
      'If an obstacle is 30 cm ahead, a fixed throttle still slams right into it.',
      'Vulnerable to boundary grazing, sensor flicker, and strategic flapping.',
    ],
  },
  {
    badge: 'The HOROS Way',
    title: 'Adaptive & Context-Aware RTA',
    verdict: '0 Collisions + 50–60% Continuity',
    tone: 'emerald' as const,
    summary: 'Blends cyber threat telemetry with live 360° sensor clearance in real time.',
    points: [
      'Enforces exact discrete-time SD-CBF stopping envelopes in microseconds.',
      'Preserves dynamic bipedal balance with ZMP gyroscopic damping.',
      'Self-heals autonomously via anti-replay purge & jerk-free S-curve ramp.',
    ],
  },
];

export const HARDWARE_TESTBEDS = [
  {
    name: 'Unitree Go2 EDU',
    subtitle: '12-DOF Quadruped Platform',
    tag: 'High-Speed Agile Navigation',
    compute: 'NVIDIA Jetson Orin NX (16 GB RAM)',
    sensors: '360° Omnidirectional 2D LiDAR + IMU',
    stance: 'Inherently stable 4-point trotting stance',
    criticalDist: '0.45 m (d_crit) / 0.32 m (d_impact)',
    challenge: 'High-speed traversal through tight confined mazes under velocity surge & steering bias attacks.',
    metrics: [
      { label: 'Sim Trials', value: 'N = 79 (N = 18 balanced)' },
      { label: 'C++ Inline Latency', value: '4.28 ± 1.71 µs' },
      { label: 'Mean Clearance', value: '0.71 ± 0.42 m' },
      { label: 'Auto Recovery', value: '1.98 ± 1.28 s' },
    ],
  },
  {
    name: 'UBTech YanShee',
    subtitle: '17-DOF Dynamic Biped Humanoid',
    tag: 'Posture-Critical Inverted Pendulum',
    compute: 'Raspberry Pi 3 Model B (1 GB RAM)',
    sensors: 'External Chest IR Sensor + 6-Axis Gyroscopic IMU',
    stance: 'Unstable dynamic inverted pendulum (single-support phases)',
    criticalDist: '0.25 m (d_crit) / 0.12 m (d_impact)',
    challenge: 'Extreme balance sensitivity on 1 GB embedded ARM compute—any sudden E-Stop or resonant rocking causes toppling.',
    metrics: [
      { label: 'Sim / Hardware Runs', value: 'N = 72 Sim / N = 22 Live' },
      { label: 'Physical Collisions', value: '0.0% (0 / 22 runs)' },
      { label: 'Physical Falls', value: '0.0% (0 / 22 runs)' },
      { label: 'Live Task Continuity', value: '58.4% ± 25.8%' },
    ],
  },
];

export const THREAT_VECTORS: ThreatVector[] = [
  {
    id: 'v1a',
    code: 'V1a',
    title: 'Velocity Surge Spikes (+3.0 m/s)',
    tier: 'I',
    tierLabel: 'Tier I: Classic Robotic Threats',
    severity: 'Critical',
    mitreTag: 'T0836 · Modify Parameter',
    attackMechanism:
      'Malicious forward linear velocity spikes (+3.0 m/s) injected onto /cmd_vel to force high-speed head-on collisions with walls.',
    horosDefense:
      'Smoothly clamped at ingress by the Sampled-Data Control Barrier Function (SD-CBF) quadratic stopping envelope.',
    metricImpact: '0% collisions vs 100% unmitigated',
  },
  {
    id: 'v1b',
    code: 'V1b',
    title: 'Stealth Steering Bias Drift',
    tier: 'I',
    tierLabel: 'Tier I: Classic Robotic Threats',
    severity: 'High',
    mitreTag: 'T0831 · Manipulation of Control',
    attackMechanism:
      'Subtle lateral angular steering offsets engineered to gradually veer the robot into corridor walls without tripping naive speed caps.',
    horosDefense:
      'Counteracted by spatial 360° clearance damping and directional obstacle-proximity angular attenuation.',
    metricImpact: 'Preserves corridor centering',
  },
  {
    id: 'v2',
    code: 'V2',
    title: 'High-Frequency Flooding DoS (100–400 Hz)',
    tier: 'I',
    tierLabel: 'Tier I: Classic Robotic Threats',
    severity: 'Critical',
    mitreTag: 'T0814 · Denial of Service',
    attackMechanism:
      'Message saturation attack flooding ROS 2 DDS executor queues with 100–400+ cmd/sec to starve legitimate callbacks and lock actuation.',
    horosDefense:
      'Leaky-bucket ingress rate limiter drops redundant flood frames in O(1) while preserving bounded control cadence.',
    metricImpact: '< 2% CPU budget on RPi 3',
  },
  {
    id: 'v3',
    code: 'V3',
    title: 'Rogue Node Injection (40 Hz)',
    tier: 'I',
    tierLabel: 'Tier I: Classic Robotic Threats',
    severity: 'Critical',
    mitreTag: 'T0855 · Unauthorized Command Message',
    attackMechanism:
      'Unauthorized competing ROS 2 publisher node injecting hostile conflicting maneuvers directly onto the actuator topic.',
    horosDefense:
      'Quarantined via publisher origin attestation and gateway topic isolation separating untrusted navigation from safe motor output.',
    metricImpact: '100% rogue publisher isolation',
  },
  {
    id: 'v4',
    code: 'V4',
    title: 'Unauthorized Service Abuse',
    tier: 'I',
    tierLabel: 'Tier I: Classic Robotic Threats',
    severity: 'High',
    mitreTag: 'T0858 · Change Operating Mode',
    attackMechanism:
      'Malicious client attempting to invoke /horos/set_mitigation_mode to force defenses into BYPASS mode.',
    horosDefense:
      'Blocked by state-gated authorization checks preventing unauthenticated disarming during active or guarded states.',
    metricImpact: 'Zero unauthorized state downgrades',
  },
  {
    id: 'v5',
    code: 'V5',
    title: 'DDS Communication Disruption',
    tier: 'I',
    tierLabel: 'Tier I: Classic Robotic Threats',
    severity: 'High',
    mitreTag: 'T0826 · Loss of Availability',
    attackMechanism:
      'Simulated DDS network packet loss (up to 100%) or upstream navigation publisher freezes causing stale velocity hold.',
    horosDefense:
      'Caught within 120 ms by predictive coasting watchdog that decays commands safely to zero before drift occurs.',
    metricImpact: '120 ms deterministic fail-safe',
  },
  {
    id: 'v6',
    code: 'V6',
    title: 'CBF Boundary Grazing',
    tier: 'II',
    tierLabel: 'Tier II: Zero-Day Barrier & Sensory Tampering',
    severity: 'Critical',
    mitreTag: 'T0856 · Spoof Reporting Message',
    attackMechanism:
      'Stealthy adversary creeping forward right along the edge of the safe zone (d_min -> d_crit) just below anomaly thresholds.',
    horosDefense:
      'Contained by continuous Nagumo barrier projection that smoothly drives forward velocity to zero exactly at d_crit.',
    metricImpact: 'Zero boundary breaches',
  },
  {
    id: 'v7',
    code: 'V7',
    title: 'Resonant Chattering (25 rad/s)',
    tier: 'II',
    tierLabel: 'Tier II: Zero-Day Barrier & Sensory Tampering',
    severity: 'Critical',
    mitreTag: 'T0831 · Actuator Stress Manipulation',
    attackMechanism:
      'High-frequency sinusoidal command oscillations (25 rad/s) designed to induce violent motor chattering and mechanical wear.',
    horosDefense:
      'Smoothed via continuous barrier damping and rate-of-change slewing inside the inline mitigation core.',
    metricImpact: 'Eliminates high-freq oscillation',
  },
  {
    id: 'v8',
    code: 'V8',
    title: 'Sensory Blackout & Context Tampering',
    tier: 'II',
    tierLabel: 'Tier II: Zero-Day Barrier & Sensory Tampering',
    severity: 'Extreme',
    mitreTag: 'T0879 · Damage to Property / Blind Control',
    attackMechanism:
      'Blinding LiDAR/IR distance feeds or spoofing artificially large clearance values while commanding high forward speed.',
    horosDefense:
      'Contained by 5-tripwire Zero-Trust fallback ladder and odometry dead-reckoned clearance decay d_DR(t).',
    metricImpact: 'Never drives blind on stale sensors',
  },
  {
    id: 'v9',
    code: 'V9',
    title: 'LiDAR Flicker Injection (1.5 Hz)',
    tier: 'III',
    tierLabel: 'Tier III: Adaptive Adversaries & Postural Attacks',
    severity: 'Extreme',
    mitreTag: 'T0832 · Manipulation of View',
    attackMechanism:
      'Intermittent 1.5 Hz sensor dropouts engineered to trap naive watchdogs in endless verification/reset oscillation loops.',
    horosDefense:
      'Handled via 10-tick leaky-gate integrator combined with Zero-Trust dead-reckoned clearance decay over quarantine.',
    metricImpact: 'Stable quarantine without livelock',
  },
  {
    id: 'v10',
    code: 'V10',
    title: 'Strategic Recovery Flapping (AA-2a)',
    tier: 'III',
    tierLabel: 'Tier III: Adaptive Adversaries & Postural Attacks',
    severity: 'Extreme',
    mitreTag: 'T0806 · Brute Force / Repetitive Trigger',
    attackMechanism:
      'Adversary cycles 1.2 s ON and 1.0 s OFF to trick the recovery engine into resuming full speed right before striking again.',
    horosDefense:
      'Neutralized by split-authority anti-flapping backoff inside the 6-state recovery FSM that extends hold until truly quiet.',
    metricImpact: '100% flapping attack containment',
  },
  {
    id: 'v11',
    code: 'V11',
    title: 'Compound Multi-Vector Stealth Synergy',
    tier: 'III',
    tierLabel: 'Tier III: Adaptive Adversaries & Postural Attacks',
    severity: 'Extreme',
    mitreTag: 'T0849 · Masquerading Multi-Vector',
    attackMechanism:
      'Simultaneously injects subtle speed drift, slight rate elevation (55 Hz), and timing jitter so no single threshold detector trips.',
    horosDefense:
      'Fused via Bounded Dominant-Residual t-Conorm aggregating sub-threshold anomalies into unified severity.',
    metricImpact: 'Detects sub-threshold synergy',
  },
  {
    id: 'v12',
    code: 'V12',
    title: 'Postural ZMP Toppling & Pitch/Yaw Rocking (10 rad/s)',
    tier: 'III',
    tierLabel: 'Tier III: Adaptive Adversaries & Postural Attacks',
    severity: 'Extreme',
    mitreTag: 'T0878 · Suppression of Safety System / Topple',
    attackMechanism:
      'Violent resonant surge reversals (10 rad/s) tuned to the inverted-pendulum natural frequency of walking bipeds and quadrupeds.',
    horosDefense:
      'Neutralized by dynamic ZMP gyroscopic balance guard monitoring IMU tilt and damping destabilizing reversals.',
    metricImpact: '0% falls (vs 88.9% unmitigated)',
  },
];

export const PRESENTATION_HIGHLIGHTS = [
  {
    metric: 'Collision Rate',
    withoutDefense: '100% (Crashes)',
    standardEStop: '0%',
    withHoros: '0% (Fully Safe)',
  },
  {
    metric: 'Mission Progress (TC)',
    withoutDefense: '0% (Terminated)',
    standardEStop: '0% (Frozen)',
    withHoros: '~50% – 60% Kept',
  },
  {
    metric: 'Biped Fall / Topple Rate',
    withoutDefense: '88.9% (Falls)',
    standardEStop: '0%',
    withHoros: '0% (Always Stands)',
  },
  {
    metric: 'Safety Decision Time',
    withoutDefense: 'N/A',
    standardEStop: '~3.0 µs',
    withHoros: '~4.3 µs (Instant)',
  },
  {
    metric: 'Autonomous Recovery',
    withoutDefense: 'None',
    standardEStop: 'Manual reset',
    withHoros: '~1.2 s (Hands-off)',
  },
];

export const GO2_BENCHMARK_ROWS: BenchmarkRow[] = [
  {
    dimension: 'Mitigation Principle',
    bypass: 'Passthrough',
    staticMode: 'Binary freeze',
    dynamicMode: 'Severity lookup (S)',
    adaptiveHoros: 'Unified Multi-Vector RTA',
  },
  {
    dimension: 'ODE Collision Rate',
    bypass: '100.0% (18/18)',
    staticMode: '0.0% (0/18)',
    dynamicMode: '72.2% (13/18)',
    adaptiveHoros: '11.1% (2/18)',
  },
  {
    dimension: 'Crash-Free Continuity (TC_crash0)',
    bypass: '0.0% ± 0.0%',
    staticMode: '0.0% ± 0.0%',
    dynamicMode: '12.1% ± 20.8%',
    adaptiveHoros: '40.0% ± 25.1%',
  },
  {
    dimension: 'Mean Obstacle Clearance',
    bypass: '0.11 ± 0.07 m',
    staticMode: '0.82 ± 0.33 m',
    dynamicMode: '0.31 ± 0.37 m',
    adaptiveHoros: '0.71 ± 0.42 m',
  },
  {
    dimension: 'Autonomous Recovery',
    bypass: 'N/A',
    staticMode: 'None (Manual reset)',
    dynamicMode: 'None',
    adaptiveHoros: '1.98 ± 1.28 s (0 resets)',
  },
  {
    dimension: 'C++ Inline Latency (t_alg)',
    bypass: '0.0 µs',
    staticMode: '3.0 µs',
    dynamicMode: '5.5 µs',
    adaptiveHoros: '4.28 ± 1.71 µs',
  },
];

export const YANSHEE_SIM_BENCHMARK_ROWS: BenchmarkRow[] = [
  {
    dimension: 'Collision Rate (k/N)',
    bypass: '100.0% (18/18)',
    staticMode: '0.0% (0/18)',
    dynamicMode: '66.7% (12/18)',
    adaptiveHoros: '0.0% (0/18)',
  },
  {
    dimension: 'Biped Topple Fall Rate',
    bypass: '88.9% (16/18)',
    staticMode: '0.0% (0/18)',
    dynamicMode: '0.0% (0/18)',
    adaptiveHoros: '0.0% (0/18)',
  },
  {
    dimension: 'Mean Max Tilt (θ_max)',
    bypass: '68.4° ± 23.7°',
    staticMode: '2.3° ± 3.1°',
    dynamicMode: '4.9° ± 3.7°',
    adaptiveHoros: '3.1° ± 3.4°',
  },
  {
    dimension: 'Crash-Free Continuity (TC_crash0)',
    bypass: '0.0% ± 0.0%',
    staticMode: '0.0% ± 0.0%',
    dynamicMode: '15.8% ± 23.0%',
    adaptiveHoros: '49.7% ± 23.4%',
  },
  {
    dimension: 'Autonomous Recovery Time',
    bypass: 'N/A',
    staticMode: 'None (Manual reset)',
    dynamicMode: 'None',
    adaptiveHoros: '1.19 ± 1.03 s (0 resets)',
  },
];

export const PHYSICAL_YANSHEE_STATS = [
  {
    label: 'Physical Collisions',
    value: '0.0% (0/22)',
    note: 'Never breached the 0.12 m physical body radius',
  },
  {
    label: 'Physical Falls',
    value: '0.0% (0/22)',
    note: 'Max dynamic tilt remained safely below 20° tipping boundary',
  },
  {
    label: 'Task Continuity',
    value: '58.4% ± 25.8%',
    note: 'Robot safely continued walking throughout active attacks',
  },
  {
    label: 'Response Latency (t_select)',
    value: '8.95 ± 6.01 µs',
    note: 'Consumes < 2% of the real-time budget on RPi 3',
  },
  {
    label: 'Zero-Copy Composition Boost',
    value: '+311%',
    note: 'Bundling nodes in a single C++ container tripled mission progress on Raspberry Pi 3',
  },
];

export const QUICKSTART_STEPS = [
  {
    step: '01',
    title: 'Install Dependencies & Build',
    description: 'Clone the horos_framework repository and compile all ROS 2 Humble C++ & Python packages with colcon.',
    code: `# Clone the repository
git clone https://github.com/Youssef-Ashraf2099/horos_framework.git
cd horos_framework

# Build all ROS 2 packages
source /opt/ros/humble/setup.bash
colcon build --symlink-install
source install/setup.bash`,
  },
  {
    step: '02',
    title: 'Launch Gazebo Simulation & HOROS Defense',
    description: 'Start the simulated confined-space environment, robot sensor feeds, and the HOROS Adaptive RTA Gateway.',
    code: `# Launches Gazebo, robot sensors, and the HOROS Defense & Recovery Gateway
ros2 launch horos_simulation horos_system.launch.py scenario:=confined_space mode:=adaptive gui:=true`,
  },
  {
    step: '03',
    title: 'Start Autonomous Patrol & Trigger an Attack',
    description: 'Open separate sourced terminals to drive nominal patrol, capture telemetry, and launch an interactive attack benchmark.',
    code: `# Terminal 2: Start autonomous patrol navigation
ros2 run horos_attack_injector nominal_driver

# Terminal 3: Start live telemetry logging
ros2 run horos_attack_injector benchmark_tracer

# Terminal 4: Trigger an interactive attack test
python3 scripts/run_attack_benchmark.py`,
  },
];

export const BIBTEX_CITATION = `@bachelorthesis{khalil2026horos,
  author       = {Youssef Ashraf Khalil},
  title        = {Severity-Aware Adaptive Response and Autonomous Safe Recovery for Robotic Systems under Cyberattack},
  school       = {Computer Science, German International University (GIU Cairo)},
  year         = {2026},
  address      = {Cairo, Egypt},
  note         = {Supervisors: Dr. Marwa Zamzam and Prof. Slim Abdennadher}
}`;

export const DOCS_NAV = [
  {
    slug: '/docs',
    title: 'Overview & Guide',
    summary: 'System scope, dual-domain philosophy, and documentation map.',
  },
  {
    slug: '/docs/architecture',
    title: 'Dual-Domain Architecture',
    summary: 'Mitigation Engine, 6-State Recovery FSM, Gates G1–G5, Choke Point & U-HAL.',
  },
  {
    slug: '/docs/threat-vectors',
    title: '13 Threat Vectors',
    summary: 'Complete Tier I–III adversarial taxonomy and MITRE ATT&CK alignment.',
  },
  {
    slug: '/docs/benchmarks',
    title: 'Empirical Benchmarks',
    summary: 'Sim/Real evaluations, N=376 composition tradeoffs & RPi 3 profiling.',
  },
  {
    slug: '/docs/quickstart',
    title: 'Quickstart & Citation',
    summary: 'ROS 2 Humble build, composed:=auto launch, hardware notes, and BibTeX.',
  },
];

export interface CompositionRow {
  metric: string;
  interProcess: string;
  intraComposed: string;
  delta: string;
}

export const COMPOSITION_BENCHMARK_ROWS: CompositionRow[] = [
  {
    metric: 'Total Memory Footprint (RAM RSS)',
    interProcess: '106.54 MB (4 processes)',
    intraComposed: '61.80 MB (1 container)',
    delta: '-42.0% RAM (44.74 MB saved)',
  },
  {
    metric: 'Mean Multi-Hop Transport Latency',
    interProcess: '915.57 µs',
    intraComposed: '722.32 µs',
    delta: '-21.1% Latency (193.25 µs faster)',
  },
  {
    metric: 'P50 / P95 Latency',
    interProcess: '907.1 µs / 1,165.3 µs',
    intraComposed: '739.8 µs / 983.9 µs',
    delta: '-18.4% / -15.6% Jitter',
  },
  {
    metric: 'P99 Tail Latency',
    interProcess: '1,412.3 µs',
    intraComposed: '1,098.5 µs',
    delta: '-22.2% Extreme Tail',
  },
  {
    metric: 'Single-Hop IPC Transfer',
    interProcess: '150–300 µs (DDS CDR)',
    intraComposed: '< 10.0 µs (std::unique_ptr)',
    delta: '> 18× Zero-Copy Speedup',
  },
  {
    metric: 'Fault Isolation Boundary',
    interProcess: 'Strict (OS Process FFI)',
    intraComposed: 'Shared Container RAM',
    delta: 'Go2: ASIL-D FFI · YanShee: OOM Guard',
  },
];

export const ZERO_TRUST_TRIPWIRES = [
  {
    id: 'T1',
    name: 'Perception Staleness',
    metric: 'Δt_context',
    bound: 'Δt ≤ 0.50 s',
    mitigates: 'Sensor publisher freeze / DDS starvation',
  },
  {
    id: 'T2',
    name: 'Beam Sanity',
    metric: 'd_min',
    bound: '¬NaN ∧ ¬Inf ∧ d_min ≥ 0.02 m',
    mitigates: 'LiDAR blinding / acoustic short',
  },
  {
    id: 'T3',
    name: 'Acceleration Feasibility',
    metric: 'Δv / Δt',
    bound: '≤ 2.60 m/s²',
    mitigates: 'Spoofed odometry velocity jumps',
  },
  {
    id: 'T4',
    name: 'Absolute Velocity Limit',
    metric: 'v_act',
    bound: 'v_act ≤ 1.50 · v_max',
    mitigates: 'Impossible encoder speed reporting',
  },
  {
    id: 'T5',
    name: 'Localization Covariance',
    metric: 'γ_loc',
    bound: 'γ_loc ≥ 0.05 ∧ ¬NaN',
    mitigates: 'SLAM divergence / kidnapping',
  },
];

export const RECOVERY_GATES = [
  {
    gate: 'G1',
    name: 'Threat Alert Quiescence',
    rule: 'S < 0.15 continuously for T_quiescent = 0.50 s',
    detail: 'Any alert re-trigger immediately resets the verification dwell timer.',
  },
  {
    gate: 'G2',
    name: 'Spatial Clearance Accumulator',
    rule: 'd_min ≥ 0.65 m (Go2) / 0.35 m (YanShee) over ≥ 8/10 valid ticks',
    detail: '10-tick leaky integrator absorbs transient 1.5 Hz LiDAR flicker (V9) without livelock.',
  },
  {
    gate: 'G3',
    name: 'Postural Dynamic Equilibrium',
    rule: 'θ_tilt < 12.0° ∧ ω_gyro < 0.80 rad/s',
    detail: 'Prevents velocity restoration while a biped humanoid is oscillating (V12).',
  },
  {
    gate: 'G4',
    name: 'Channel Trust & Anti-Replay Purge',
    rule: 'T_channel ≥ 0.80 ∧ 64-bit SeqReplayWindow clean',
    detail: 'Flushes stale pre-attack commands trapped in DDS middleware buffers.',
  },
  {
    gate: 'G5',
    name: 'Cryptographic Integrity Attestation',
    rule: 'Async SHA-256 boot_manifest.json + /horos/health_challenge nonce',
    detail: 'Wait-free atomic read; binary/config tampering triggers fail-closed STATE_FAILED_HOLD.',
  },
];

export const RECOVERY_FSM_STATES = [
  {
    id: '0',
    name: 'STATE_NORMAL_OPERATION',
    desc: '100% nominal locomotion; passive telemetry sniffing and probation decay if clean > 5s.',
  },
  {
    id: '1',
    name: 'STATE_SUSPECTED_ATTACK',
    desc: 'Detector tripwire anomaly (mild S < 0.35); 500 ms validation window before escalation.',
  },
  {
    id: '2',
    name: 'STATE_PROTECTIVE_RESPONSE',
    desc: 'Domain 1 active clamping/hold; anti-replay buffer purged; incident token assigned.',
  },
  {
    id: '3',
    name: 'STATE_VERIFICATION',
    desc: '5-Gate Conjunction Φ = C1 ∧ C2 ∧ C3 ∧ C4 ∧ G5 attested via steady_clock dwell.',
  },
  {
    id: '4',
    name: 'STATE_PHASED_RECOVERY',
    desc: 'Zero-jerk cubic Hermite S-curve s(τ) = 3τ² - 2τ³ bounded by asymmetric capability cap.',
  },
  {
    id: '5',
    name: 'STATE_FAILED_HOLD',
    desc: 'Fail-closed 0.0 m/s lockout on k_relapse ≥ 3 flapping exhaustion or Gate G5 tamper.',
  },
];

export const ABLATION_MODES = [
  {
    mode: 'ADAPTIVE (Full)',
    vector: '[d_min, v_act, M, γ_loc, S, θ_tilt]',
    purpose: 'Complete multi-sensor + gyroscopic cyber-physical defense.',
  },
  {
    mode: 'ADAPTIVE_NO_LIDAR',
    vector: '[5.0 m, v_act, M, γ_loc, S]',
    purpose: 'Simulates spatial blindness; proves proximity awareness stops corridor crashes.',
  },
  {
    mode: 'ADAPTIVE_NO_LOC',
    vector: '[d_min, v_act, M, 1.0, S]',
    purpose: 'Assumes perfect pose; demonstrates drift risk when odometry degrades.',
  },
  {
    mode: 'ADAPTIVE_NO_VEL',
    vector: '[d_min, 0.35, M, γ_loc, S]',
    purpose: 'Fixes velocity estimate to evaluate kinetic momentum damping.',
  },
  {
    mode: 'ADAPTIVE_SEVERITY_ONLY',
    vector: '[5.0 m, 0.35, M, 1.0, S]',
    purpose: 'Reacts solely to threat score S (isolates context-blind limitation).',
  },
];

export const UHAL_PLATFORMS = [
  {
    platform: 'Unitree Go2 EDU',
    adapter: 'Go2ActuatorAdapter',
    chokeTopic: '/go2/safe_cmd_vel (or _sec)',
    deployment: 'composed:=false (2 PIDs · ISO 26262 ASIL-D FFI)',
    kinematics: 'v_cruise = 0.35 m/s · v_max = 1.20 m/s · settling lag 0.05 s',
    haltBehavior: '4-limb low-gravity squat stance (-5 cm height) with instant (0, 0) clamp.',
  },
  {
    platform: 'UBTech YanShee',
    adapter: 'YansheeActuatorAdapter',
    chokeTopic: '/yanshee/safe_cmd_vel (or _sec)',
    deployment: 'composed:=true (1 Container · -42% RAM on 1 GB RPi 3B+)',
    kinematics: 'v_cruise = 0.08 m/s · v_max = 0.15 m/s · gait step 0.80 s · lag 0.60 s',
    haltBehavior: 'Completes active swing sub-step, then executes 15° flexed crouch-balance stance.',
  },
];

