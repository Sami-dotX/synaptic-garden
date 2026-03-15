import type { Agent, WorldParams } from '../types'

export interface NeuronModel {
  id: 'lif' | 'izhikevich'
  init(agent: Agent, params: WorldParams): void
  step(agent: Agent, I_total: number, dt: number): { spiked: boolean }
  getDefaultParams(): Partial<WorldParams>
}
