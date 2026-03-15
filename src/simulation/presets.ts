import type { WorldParams, RoleConfig } from './types'
import { DEFAULT_ROLES } from './types'

export interface Preset {
  name: string
  description: string
  params: WorldParams
}

const BASE: Pick<WorldParams, 'worldWidth' | 'worldHeight'> = {
  worldWidth: 3200,
  worldHeight: 1800,
}

const FINANCIAL_ROLES: RoleConfig[] = [
  {
    id: 'oil_trader',
    label: 'Oil Trader',
    color: '#FF6600',
    proportion: 0.2,
    speed: 0.3,
    conformity: 0.6,
    fatigueMultiplier: 1.2,
    noiseMultiplier: 2.0,
    energyRecovery: 0.001,
    excitatoryBias: 0.85,
    description: 'Directly exposed to oil price shocks',
  },
  {
    id: 'equity_fund',
    label: 'Equity Fund',
    color: '#4488FF',
    proportion: 0.35,
    speed: 0.1,
    conformity: 0.7,
    fatigueMultiplier: 1.0,
    noiseMultiplier: 1.0,
    energyRecovery: 0.002,
    excitatoryBias: 0.75,
    description: 'Diversified stock portfolios, follow trends',
  },
  {
    id: 'algo_hft',
    label: 'Algo HFT',
    color: '#00FFCC',
    proportion: 0.15,
    speed: 0.8,
    conformity: 0.1,
    fatigueMultiplier: 0.3,
    noiseMultiplier: 0.5,
    energyRecovery: 0.005,
    excitatoryBias: 0.5,
    description: 'High-frequency, amplifies micro-movements',
  },
  {
    id: 'central_bank',
    label: 'Central Bank',
    color: '#FFD700',
    proportion: 0.05,
    speed: 0.02,
    conformity: 0.0,
    fatigueMultiplier: 0.1,
    noiseMultiplier: 0.1,
    energyRecovery: 0.01,
    excitatoryBias: 0.3,
    description: 'Stabilizer, injects liquidity, inhibitory',
  },
  {
    id: 'hedge_fund',
    label: 'Hedge Fund',
    color: '#FF4466',
    proportion: 0.25,
    speed: 0.4,
    conformity: 0.3,
    fatigueMultiplier: 1.5,
    noiseMultiplier: 1.8,
    energyRecovery: 0.001,
    excitatoryBias: 0.6,
    description: 'Speculator, shorts in crisis, high risk',
  },
]

export const presets: Record<string, Preset> = {
  cooperativeColony: {
    name: 'Cooperative Colony',
    description: 'Strong social bonds, low noise, emergent clusters',
    params: {
      ...BASE,
      neuronModel: 'lif',
      agentCount: 600,
      interactionRadius: 100,
      conformityPressure: 0.8,
      plasticityRate: 0.3,
      fatigueRate: 0.2,
      noiseLevel: 0.05,
      simSpeed: 1.0,
      roles: DEFAULT_ROLES,
    },
  },
  competitiveSwarm: {
    name: 'Competitive Swarm',
    description: 'Low conformity, high plasticity, chaotic dynamics',
    params: {
      ...BASE,
      neuronModel: 'izhikevich',
      agentCount: 500,
      interactionRadius: 90,
      conformityPressure: 0.2,
      plasticityRate: 0.6,
      fatigueRate: 0.3,
      noiseLevel: 0.2,
      simSpeed: 1.2,
      roles: DEFAULT_ROLES,
    },
  },
  fragileEcosystem: {
    name: 'Fragile Ecosystem',
    description: 'High fatigue, heavy noise, collapses and recoveries',
    params: {
      ...BASE,
      neuronModel: 'lif',
      agentCount: 400,
      interactionRadius: 80,
      conformityPressure: 0.4,
      plasticityRate: 0.4,
      fatigueRate: 0.8,
      noiseLevel: 0.5,
      simSpeed: 1.5,
      roles: DEFAULT_ROLES,
    },
  },
  financialContagion: {
    name: 'Financial Contagion',
    description: 'Market agents: oil traders, funds, algos, central banks',
    params: {
      ...BASE,
      neuronModel: 'lif',
      agentCount: 600,
      interactionRadius: 100,
      conformityPressure: 0.6,
      plasticityRate: 0.5,
      fatigueRate: 0.4,
      noiseLevel: 0.15,
      simSpeed: 1.0,
      roles: FINANCIAL_ROLES,
    },
  },
}

export const presetNames = Object.keys(presets) as Array<keyof typeof presets>
