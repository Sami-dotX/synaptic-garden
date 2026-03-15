import type { Agent, Link, WorldParams } from '../types'

export function applyImitation(
  agent: Agent,
  neighbors: Agent[],
  links: Link[],
  _params: WorldParams,
): void {
  const myFitness = agent.activity * agent.energy

  for (const neighbor of neighbors) {
    const jFitness = neighbor.activity * neighbor.energy
    if (jFitness > myFitness) {
      const link = links.find(
        (l) =>
          (l.sourceId === agent.id && l.targetId === neighbor.id) ||
          (l.sourceId === neighbor.id && l.targetId === agent.id),
      )
      if (link) {
        link.weight += 0.001 * (jFitness - myFitness)
        if (link.weight > 1) link.weight = 1
      }
    }
  }
}
