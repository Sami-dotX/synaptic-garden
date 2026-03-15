import type { Agent, Link, WorldParams } from '../types'

export function computeSocialPressure(
  agent: Agent,
  neighbors: Agent[],
  links: Link[],
  params: WorldParams,
): number {
  if (neighbors.length === 0) return 0

  let pressure = 0
  const agentRate = agent.activity

  for (const neighbor of neighbors) {
    const neighborRate = neighbor.activity
    const link = links.find(
      (l) =>
        (l.sourceId === agent.id && l.targetId === neighbor.id) ||
        (l.sourceId === neighbor.id && l.targetId === agent.id),
    )
    const w = link ? link.weight : 0.05
    const sign = neighborRate > agentRate ? 1 : neighborRate < agentRate ? -1 : 0
    pressure += w * sign * agent.alpha_conform
  }

  return pressure * params.conformityPressure * 0.1
}
