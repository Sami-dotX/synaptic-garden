import type { Agent, WorldParams } from '../types'
import type { NeuronModel } from './neuron.interface'

const ROLE_PARAMS: Record<string, { a: number; b: number; c: number; d: number }> = {
  explorer:   { a: 0.02, b: 0.2,  c: -65, d: 6 },
  conformist: { a: 0.02, b: 0.25, c: -65, d: 2 },
  leader:     { a: 0.02, b: 0.2,  c: -50, d: 2 },
}

export const izhikevichModel: NeuronModel = {
  id: 'izhikevich',

  init(agent: Agent, _params: WorldParams): void {
    const p = ROLE_PARAMS[agent.role] ?? ROLE_PARAMS.conformist
    agent.v = -65 + Math.random() * 5
    agent.u = p.b * agent.v
    agent.activity = 0
    agent.lastSpikedTick = -100
    agent.refractoryUntil = 0
  },

  step(agent: Agent, I_total: number, dt: number): { spiked: boolean } {
    const p = ROLE_PARAMS[agent.role] ?? ROLE_PARAMS.conformist

    for (let i = 0; i < 2; i++) {
      const halfDt = dt * 0.5
      agent.v += halfDt * (0.04 * agent.v * agent.v + 5 * agent.v + 140 - agent.u + I_total)
      agent.u += halfDt * (p.a * (p.b * agent.v - agent.u))
    }

    if (agent.v >= 30) {
      agent.v = p.c
      agent.u = agent.u + p.d
      return { spiked: true }
    }

    if (agent.v < -80) agent.v = -80

    return { spiked: false }
  },

  getDefaultParams(): Partial<WorldParams> {
    return {
      agentCount: 1000,
      noiseLevel: 0.15,
      simSpeed: 1.0,
    }
  },
}
