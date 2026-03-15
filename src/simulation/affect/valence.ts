import type { Agent } from '../types'

const KAPPA_V = 0.1
const DECAY_V = 0.001

export function updateValence(agent: Agent, reward: number, dt: number): void {
  agent.valence += reward * KAPPA_V - DECAY_V * dt
  if (agent.valence < -1) agent.valence = -1
  if (agent.valence > 1) agent.valence = 1
}
