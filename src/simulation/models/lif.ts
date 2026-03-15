import type { Agent, WorldParams } from '../types'
import type { NeuronModel } from './neuron.interface'

const TAU_M = 20
const V_REST = -65
const V_THRESH = -55
const V_RESET = -70
const R = 1
const REFRACTORY_TICKS = 20

export const lifModel: NeuronModel = {
  id: 'lif',

  init(agent: Agent, _params: WorldParams): void {
    agent.v = V_REST + Math.random() * 5
    agent.u = 0
    agent.activity = 0
    agent.lastSpikedTick = -100
    agent.refractoryUntil = 0
  },

  step(agent: Agent, I_total: number, dt: number): { spiked: boolean } {
    if (agent.age < agent.refractoryUntil) {
      return { spiked: false }
    }

    const fatigueThreshShift = agent.fatigue * 5
    const effectiveThresh = V_THRESH + fatigueThreshShift

    const dV = (-(agent.v - V_REST) / TAU_M + R * I_total) * dt
    agent.v += dV

    if (agent.v >= effectiveThresh) {
      agent.v = V_RESET
      agent.refractoryUntil = agent.age + REFRACTORY_TICKS
      return { spiked: true }
    }

    if (agent.v < -80) agent.v = -80

    return { spiked: false }
  },

  getDefaultParams(): Partial<WorldParams> {
    return {
      agentCount: 2400,
      noiseLevel: 0.1,
      simSpeed: 1.0,
    }
  },
}
