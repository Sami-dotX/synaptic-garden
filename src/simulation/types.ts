export interface RoleConfig {
  id: string
  label: string
  color: string
  proportion: number
  speed: number
  conformity: number
  fatigueMultiplier: number
  noiseMultiplier: number
  energyRecovery: number
  excitatoryBias: number
  description: string
}

export const DEFAULT_ROLES: RoleConfig[] = [
  {
    id: 'explorer',
    label: 'Explorer',
    color: '#00D4FF',
    proportion: 0.3,
    speed: 0.4,
    conformity: 0.3,
    fatigueMultiplier: 0.8,
    noiseMultiplier: 1.5,
    energyRecovery: 0.002,
    excitatoryBias: 0.7,
    description: 'Fast-moving, noise-sensitive scouts',
  },
  {
    id: 'conformist',
    label: 'Conformist',
    color: '#00FF88',
    proportion: 0.55,
    speed: 0.1,
    conformity: 0.8,
    fatigueMultiplier: 1.0,
    noiseMultiplier: 1.0,
    energyRecovery: 0.001,
    excitatoryBias: 0.8,
    description: 'Social followers, form stable clusters',
  },
  {
    id: 'leader',
    label: 'Leader',
    color: '#FFD700',
    proportion: 0.15,
    speed: 0.2,
    conformity: 0.1,
    fatigueMultiplier: 0.6,
    noiseMultiplier: 0.5,
    energyRecovery: 0.003,
    excitatoryBias: 0.9,
    description: 'High-connectivity hubs, resilient',
  },
]

export interface Agent {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  v: number
  u: number
  activity: number
  energy: number
  fatigue: number
  valence: number
  arousal: number
  clusterId: number
  degree: number
  age: number
  role: string
  roleIndex: number
  alpha_conform: number
  isHighlighted: boolean
  lastSpikedTick: number
  refractoryUntil: number
  activityHistory: number[]
}

export interface Link {
  sourceId: number
  targetId: number
  weight: number
  age: number
  active: boolean
  type: 'excitatory' | 'inhibitory'
}

export interface WorldParams {
  neuronModel: 'lif' | 'izhikevich'
  agentCount: number
  worldWidth: number
  worldHeight: number
  interactionRadius: number
  conformityPressure: number
  plasticityRate: number
  fatigueRate: number
  noiseLevel: number
  simSpeed: number
  roles: RoleConfig[]
}

export type SimEventType =
  | 'cluster_formed'
  | 'cluster_split'
  | 'leader_emerged'
  | 'memory_sync_spike'
  | 'activity_collapse'
  | 'stable_pattern'
  | 'signal_wave'

export interface SimEvent {
  id: number
  tick: number
  type: SimEventType
  severity: 'info' | 'warning' | 'critical'
  message: string
  relatedAgents: number[]
}

export interface WorkerSnapshot {
  agentX: Float32Array
  agentY: Float32Array
  agentV: Float32Array
  agentActivity: Float32Array
  agentFatigue: Float32Array
  agentValence: Float32Array
  agentCluster: Int32Array
  agentRole: Uint8Array
  agentLastSpike: Int32Array
  agentEnergy: Float32Array
  agentDegree: Int32Array
  agentAge: Int32Array
  agentArousal: Float32Array
  agentAlphaConform: Float32Array
  agentCount: number
  links: Link[]
  metrics: WorldMetrics
  events: SimEvent[]
  roles: RoleConfig[]
}

export interface WorldMetrics {
  tick: number
  fps: number
  clusterCount: number
  avgActivity: number
  entropy: number
  activeLinkCount: number
  pruningRate: number
}

export const DEFAULT_PARAMS: WorldParams = {
  neuronModel: 'lif',
  agentCount: 800,
  worldWidth: 3200,
  worldHeight: 1800,
  interactionRadius: 80,
  conformityPressure: 0.5,
  plasticityRate: 0.3,
  fatigueRate: 0.3,
  noiseLevel: 0.1,
  simSpeed: 1.0,
  roles: DEFAULT_ROLES,
}
