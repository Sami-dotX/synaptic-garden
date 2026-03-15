import type { Link, WorldParams } from '../types'

export function applySTDP(
  link: Link,
  preSpiked: boolean,
  postSpiked: boolean,
  deltaTick: number,
  params: WorldParams,
): void {
  const A = params.plasticityRate
  const tau = 20

  if (preSpiked && postSpiked) {
    if (deltaTick > 0) {
      link.weight += A * Math.exp(-deltaTick / tau)
    } else if (deltaTick < 0) {
      link.weight -= A * Math.exp(deltaTick / tau)
    }
  } else if (preSpiked && !postSpiked) {
    link.weight -= A * 0.01
  }

  if (link.weight < 0) link.weight = 0
  if (link.weight > 1) link.weight = 1
}
