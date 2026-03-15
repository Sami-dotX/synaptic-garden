import type { Agent, WorldParams } from '../types'

const RECOVERY_RATE = 0.002

export function updateFatigue(agent: Agent, dt: number, params: WorldParams): void {
  agent.fatigue += agent.activity * params.fatigueRate * dt * 0.01
  agent.fatigue -= RECOVERY_RATE * dt
  if (agent.fatigue < 0) agent.fatigue = 0
  if (agent.fatigue > 1) agent.fatigue = 1
}
