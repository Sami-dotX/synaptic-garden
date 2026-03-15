import type { Agent, Link, WorldParams, WorldMetrics, SimEvent, SimEventType, WorkerSnapshot, RoleConfig } from './types'
import type { NeuronModel } from './models/neuron.interface'
import { lifModel } from './models/lif'
import { izhikevichModel } from './models/izhikevich'
import { computeSocialPressure } from './social/conformity'
import { applySTDP } from './social/stdp'
import { applyImitation } from './social/imitation'
import { updateFatigue } from './affect/fatigue'
import { updateValence } from './affect/valence'

const ACTIVITY_DECAY = 0.95
const MAX_LINKS_PER_AGENT = 12
const LINK_CREATE_PROB = 0.002
const LINK_PRUNE_THRESHOLD = 0.05

function pickRole(roles: RoleConfig[]): { role: string; roleIndex: number; config: RoleConfig } {
  const total = roles.reduce((s, r) => s + r.proportion, 0)
  let r = Math.random() * total
  for (let i = 0; i < roles.length; i++) {
    r -= roles[i].proportion
    if (r <= 0) return { role: roles[i].id, roleIndex: i, config: roles[i] }
  }
  const last = roles.length - 1
  return { role: roles[last].id, roleIndex: last, config: roles[last] }
}

function gaussianRandom(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

function cellKey(cx: number, cy: number): number {
  return cx * 10000 + cy
}

export class SimulationEngine {
  agents: Agent[] = []
  links: Link[] = []
  tick = 0
  params: WorldParams
  neuronModel: NeuronModel
  private spatialGrid: Map<number, number[]> = new Map()
  private eventIdCounter = 0
  private pendingEvents: SimEvent[] = []
  private prevAvgActivity = 0
  private stableCount = 0
  private prunedLastTick = 0
  private linkMap: Map<number, number[]> = new Map()
  private agentMap: Map<number, Agent> = new Map()
  private agentLinkIndex: Map<number, Link[]> = new Map()

  constructor(params: WorldParams) {
    this.params = { ...params }
    this.neuronModel = params.neuronModel === 'izhikevich' ? izhikevichModel : lifModel
    this.initAgents()
  }

  private initAgents(): void {
    const { agentCount, worldWidth, worldHeight } = this.params
    this.agents = []
    this.links = []
    this.linkMap = new Map()
    this.agentLinkIndex = new Map()
    this.agentMap = new Map()
    this.tick = 0
    this.eventIdCounter = 0
    this.pendingEvents = []
    this.prevAvgActivity = 0
    this.stableCount = 0

    const roles = this.params.roles
    for (let i = 0; i < agentCount; i++) {
      const { role, roleIndex, config } = pickRole(roles)
      const agent: Agent = {
        id: i,
        x: Math.random() * worldWidth,
        y: Math.random() * worldHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        v: -65 + Math.random() * 5,
        u: 0,
        activity: 0,
        energy: 0.5 + Math.random() * 0.5,
        fatigue: 0,
        valence: 0,
        arousal: 0.5,
        clusterId: -1,
        degree: 0,
        age: 0,
        role,
        roleIndex,
        alpha_conform: config.conformity * (0.6 + Math.random() * 0.4),
        isHighlighted: false,
        lastSpikedTick: -100,
        refractoryUntil: 0,
        activityHistory: [],
      }
      this.neuronModel.init(agent, this.params)
      this.agents.push(agent)
      this.agentMap.set(i, agent)
      this.linkMap.set(i, [])
    }

    this.createInitialLinks()
  }

  private createInitialLinks(): void {
    const { interactionRadius } = this.params
    const r2 = interactionRadius * interactionRadius
    this.buildSpatialGrid()

    for (const agent of this.agents) {
      const neighbors = this.getNeighborIds(agent)
      let linkCount = 0
      for (const nId of neighbors) {
        if (linkCount >= 3) break
        if (nId <= agent.id) continue
        const n = this.agentMap.get(nId)!
        const dx = agent.x - n.x
        const dy = agent.y - n.y
        if (dx * dx + dy * dy < r2) {
          this.addLink(agent.id, nId)
          linkCount++
        }
      }
    }
  }

  private addLink(sourceId: number, targetId: number): void {
    const srcLinks = this.linkMap.get(sourceId) ?? []
    const tgtLinks = this.linkMap.get(targetId) ?? []
    if (srcLinks.length >= MAX_LINKS_PER_AGENT || tgtLinks.length >= MAX_LINKS_PER_AGENT) return
    if (srcLinks.includes(targetId)) return

    const link: Link = {
      sourceId,
      targetId,
      weight: 0.1 + Math.random() * 0.2,
      age: 0,
      active: true,
      type: Math.random() < (this.getRoleConfig(sourceId)?.excitatoryBias ?? 0.8) ? 'excitatory' : 'inhibitory',
    }
    this.links.push(link)
    srcLinks.push(targetId)
    tgtLinks.push(sourceId)
    this.linkMap.set(sourceId, srcLinks)
    this.linkMap.set(targetId, tgtLinks)

    const srcLinkList = this.agentLinkIndex.get(sourceId) ?? []
    srcLinkList.push(link)
    this.agentLinkIndex.set(sourceId, srcLinkList)
    const tgtLinkList = this.agentLinkIndex.get(targetId) ?? []
    tgtLinkList.push(link)
    this.agentLinkIndex.set(targetId, tgtLinkList)
  }

  private buildSpatialGrid(): void {
    this.spatialGrid.clear()
    const cellSize = this.params.interactionRadius
    for (const agent of this.agents) {
      const cx = Math.floor(agent.x / cellSize)
      const cy = Math.floor(agent.y / cellSize)
      const key = cellKey(cx, cy)
      const cell = this.spatialGrid.get(key)
      if (cell) {
        cell.push(agent.id)
      } else {
        this.spatialGrid.set(key, [agent.id])
      }
    }
  }

  private getNeighborIds(agent: Agent): number[] {
    const cellSize = this.params.interactionRadius
    const cx = Math.floor(agent.x / cellSize)
    const cy = Math.floor(agent.y / cellSize)
    const ids: number[] = []
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cell = this.spatialGrid.get(cellKey(cx + dx, cy + dy))
        if (cell) {
          for (const id of cell) {
            if (id !== agent.id) ids.push(id)
          }
        }
      }
    }
    return ids
  }

  private getNeighborAgents(agent: Agent): Agent[] {
    const ids = this.getNeighborIds(agent)
    const r2 = this.params.interactionRadius * this.params.interactionRadius
    const result: Agent[] = []
    for (const id of ids) {
      const n = this.agents[id]
      const dx = agent.x - n.x
      const dy = agent.y - n.y
      if (dx * dx + dy * dy < r2) {
        result.push(n)
      }
    }
    return result
  }

  private getAgentLinks(agentId: number): Link[] {
    return this.agentLinkIndex.get(agentId) ?? []
  }

  private getRoleConfig(agentId: number): RoleConfig | undefined {
    const agent = this.agents[agentId]
    if (!agent) return undefined
    return this.params.roles[agent.roleIndex] ?? this.params.roles[0]
  }

  step(dt: number): void {
    this.pendingEvents = []
    this.buildSpatialGrid()
    const { params } = this
    const spikedThisTick: Set<number> = new Set()

    for (const agent of this.agents) {
      const neighbors = this.getNeighborAgents(agent)
      const agentLinks = this.getAgentLinks(agent.id)

      let I_syn = 0
      for (const link of agentLinks) {
        if (!link.active) continue
        const otherId = link.sourceId === agent.id ? link.targetId : link.sourceId
        const other = this.agents[otherId]
        const sign = link.type === 'excitatory' ? 1 : -1
        I_syn += link.weight * other.activity * sign
      }

      const roleConfig = this.params.roles[agent.roleIndex] ?? this.params.roles[0]
      const I_social = computeSocialPressure(agent, neighbors, agentLinks, params)
      const I_noise = gaussianRandom() * params.noiseLevel * 15 * (roleConfig?.noiseMultiplier ?? 1)
      const I_fatigue = -agent.fatigue * 5
      const I_total = I_syn + I_social + I_noise + I_fatigue + 2

      const { spiked } = this.neuronModel.step(agent, I_total, dt)

      if (spiked) {
        agent.lastSpikedTick = this.tick
        spikedThisTick.add(agent.id)
        agent.activity = Math.min(1, agent.activity + 0.3)
        agent.energy = Math.max(0, agent.energy - 0.02)

        for (const link of agentLinks) {
          const otherId = link.sourceId === agent.id ? link.targetId : link.sourceId
          const other = this.agents[otherId]
          const preSpiked = spikedThisTick.has(otherId)
          const delta = agent.lastSpikedTick - other.lastSpikedTick
          applySTDP(link, preSpiked, true, delta, params)
        }
      }

      agent.activity *= ACTIVITY_DECAY
      agent.activityHistory.push(agent.activity)
      if (agent.activityHistory.length > 50) agent.activityHistory.shift()

      applyImitation(agent, neighbors, agentLinks, params)
      updateFatigue(agent, dt, params)

      const reward = agent.activity * 0.1
      updateValence(agent, reward, dt)

      agent.energy += (roleConfig?.energyRecovery ?? 0.001) * dt
      if (agent.energy > 1) agent.energy = 1

      agent.arousal = 0.5 + agent.activity * 0.3 + (1 - agent.fatigue) * 0.2

      const speed = roleConfig?.speed ?? 0.1
      agent.vx += (Math.random() - 0.5) * speed * dt
      agent.vy += (Math.random() - 0.5) * speed * dt
      agent.vx *= 0.95
      agent.vy *= 0.95
      agent.x += agent.vx * dt
      agent.y += agent.vy * dt

      if (agent.x < 0) { agent.x = 0; agent.vx *= -1 }
      if (agent.x > params.worldWidth) { agent.x = params.worldWidth; agent.vx *= -1 }
      if (agent.y < 0) { agent.y = 0; agent.vy *= -1 }
      if (agent.y > params.worldHeight) { agent.y = params.worldHeight; agent.vy *= -1 }

      agent.degree = this.linkMap.get(agent.id)?.length ?? 0
      agent.age++
    }

    if (this.tick % 10 === 0) {
      this.recluster()
    }

    this.pruneLinks()
    this.createNewLinks(spikedThisTick)
    this.detectEvents()

    this.tick++
  }

  private recluster(): void {
    const cellSize = this.params.interactionRadius
    const clusterMap = new Map<number, number>()
    let nextCluster = 0

    for (const agent of this.agents) {
      if (agent.activity < 0.01) {
        agent.clusterId = -1
        continue
      }
      const cx = Math.floor(agent.x / cellSize)
      const cy = Math.floor(agent.y / cellSize)
      const key = cellKey(cx, cy)

      if (clusterMap.has(key)) {
        agent.clusterId = clusterMap.get(key)!
      } else {
        let merged = false
        for (let dx = -1; dx <= 1 && !merged; dx++) {
          for (let dy = -1; dy <= 1 && !merged; dy++) {
            if (dx === 0 && dy === 0) continue
            const nKey = cellKey(cx + dx, cy + dy)
            if (clusterMap.has(nKey)) {
              const existingCluster = clusterMap.get(nKey)!
              clusterMap.set(key, existingCluster)
              agent.clusterId = existingCluster
              merged = true
            }
          }
        }
        if (!merged) {
          clusterMap.set(key, nextCluster)
          agent.clusterId = nextCluster
          nextCluster++
        }
      }
    }
  }

  private pruneLinks(): void {
    let pruned = 0
    const newLinks: Link[] = []
    for (const link of this.links) {
      link.age++
      if (link.weight < LINK_PRUNE_THRESHOLD && link.age > 50) {
        const srcList = this.linkMap.get(link.sourceId)
        const tgtList = this.linkMap.get(link.targetId)
        if (srcList) {
          const idx = srcList.indexOf(link.targetId)
          if (idx >= 0) srcList.splice(idx, 1)
        }
        if (tgtList) {
          const idx = tgtList.indexOf(link.sourceId)
          if (idx >= 0) tgtList.splice(idx, 1)
        }
        const srcLinks = this.agentLinkIndex.get(link.sourceId)
        if (srcLinks) {
          const idx = srcLinks.indexOf(link)
          if (idx >= 0) srcLinks.splice(idx, 1)
        }
        const tgtLinks = this.agentLinkIndex.get(link.targetId)
        if (tgtLinks) {
          const idx = tgtLinks.indexOf(link)
          if (idx >= 0) tgtLinks.splice(idx, 1)
        }
        pruned++
      } else {
        newLinks.push(link)
      }
    }
    this.links = newLinks
    this.prunedLastTick = pruned
  }

  private createNewLinks(spikedThisTick: Set<number>): void {
    for (const agentId of spikedThisTick) {
      const agent = this.agents[agentId]
      const existing = this.linkMap.get(agentId) ?? []
      if (existing.length >= MAX_LINKS_PER_AGENT) continue

      const neighbors = this.getNeighborIds(agent)
      for (const nId of neighbors) {
        if (existing.includes(nId)) continue
        if (Math.random() < LINK_CREATE_PROB) {
          this.addLink(agentId, nId)
          break
        }
      }
    }
  }

  private detectEvents(): void {
    const clusterCounts = new Map<number, number>()
    let totalActivity = 0

    for (const agent of this.agents) {
      totalActivity += agent.activity
      if (agent.clusterId >= 0) {
        clusterCounts.set(agent.clusterId, (clusterCounts.get(agent.clusterId) ?? 0) + 1)
      }
    }

    const avgActivity = totalActivity / this.agents.length

    for (const [cId, count] of clusterCounts) {
      if (count > 10 && this.tick > 5) {
        if (this.tick % 50 === 0) {
          this.emitEvent('cluster_formed', 'info', `Cluster ${cId} formed with ${count} agents`)
        }
      }
    }

    if (avgActivity < this.prevAvgActivity * 0.5 && this.prevAvgActivity > 0.1 && this.tick > 20) {
      this.emitEvent('activity_collapse', 'critical', `Activity collapsed from ${this.prevAvgActivity.toFixed(2)} to ${avgActivity.toFixed(2)}`)
    }

    const degrees = this.agents.map((a) => a.degree)
    const meanDeg = degrees.reduce((a, b) => a + b, 0) / degrees.length
    const stdDeg = Math.sqrt(degrees.reduce((a, b) => a + (b - meanDeg) ** 2, 0) / degrees.length)
    for (const agent of this.agents) {
      if (agent.degree > meanDeg + 2 * stdDeg && agent.degree > 5 && this.tick % 100 === 0) {
        this.emitEvent('leader_emerged', 'warning', `Agent ${agent.id} emerged as leader (degree ${agent.degree})`, [agent.id])
        break
      }
    }

    const actVar = this.agents.reduce((a, ag) => a + (ag.activity - avgActivity) ** 2, 0) / this.agents.length
    if (actVar < 0.01 && avgActivity > 0.05) {
      this.stableCount++
      if (this.stableCount === 100) {
        this.emitEvent('stable_pattern', 'info', 'Stable activity pattern detected')
      }
    } else {
      this.stableCount = 0
    }

    const spikedRecently = this.agents.filter((a) => this.tick - a.lastSpikedTick < 10).length
    if (spikedRecently > this.agents.length * 0.3 && this.tick > 10) {
      if (this.tick % 50 === 0) {
        this.emitEvent('signal_wave', 'warning', `Signal wave: ${spikedRecently} agents spiked in 10 ticks`)
      }
    }

    this.prevAvgActivity = avgActivity
  }

  private emitEvent(type: SimEventType, severity: SimEvent['severity'], message: string, relatedAgents: number[] = []): void {
    this.pendingEvents.push({
      id: this.eventIdCounter++,
      tick: this.tick,
      type,
      severity,
      message,
      relatedAgents,
    })
  }

  swapNeuronModel(modelId: 'lif' | 'izhikevich'): void {
    this.neuronModel = modelId === 'izhikevich' ? izhikevichModel : lifModel
    this.params.neuronModel = modelId
    for (const agent of this.agents) {
      this.neuronModel.init(agent, this.params)
    }
    this.tick = 0
    this.links = []
    this.linkMap = new Map()
    this.agentLinkIndex = new Map()
    for (const agent of this.agents) {
      this.linkMap.set(agent.id, [])
    }
    this.createInitialLinks()
  }

  injectEvent(type: string, region?: { x: number; y: number; radius: number }): void {
    const inRegion = (a: Agent): boolean => {
      if (!region) return true
      const dx = a.x - region.x
      const dy = a.y - region.y
      return dx * dx + dy * dy < region.radius * region.radius
    }

    switch (type) {
      case 'energy_burst':
        for (const agent of this.agents) {
          if (inRegion(agent)) {
            agent.energy = Math.min(1, agent.energy + 0.4)
          }
        }
        this.emitEvent('memory_sync_spike', 'info', 'Energy burst injected')
        break
      case 'noise_shock':
        this.params.noiseLevel *= 4
        setTimeout(() => {
          this.params.noiseLevel /= 4
        }, 320)
        this.emitEvent('signal_wave', 'warning', 'Noise shock injected')
        break
      case 'freeze':
        for (const agent of this.agents) {
          if (inRegion(agent)) {
            agent.vx = 0
            agent.vy = 0
            agent.activity = 0
          }
        }
        this.emitEvent('activity_collapse', 'critical', 'Freeze injected')
        break
      case 'kill_weak': {
        const kept: Link[] = []
        for (const l of this.links) {
          if (l.weight < 0.3) {
            const srcList = this.linkMap.get(l.sourceId)
            const tgtList = this.linkMap.get(l.targetId)
            if (srcList) {
              const idx = srcList.indexOf(l.targetId)
              if (idx >= 0) srcList.splice(idx, 1)
            }
            if (tgtList) {
              const idx = tgtList.indexOf(l.sourceId)
              if (idx >= 0) tgtList.splice(idx, 1)
            }
            const srcLinks = this.agentLinkIndex.get(l.sourceId)
            if (srcLinks) {
              const idx = srcLinks.indexOf(l)
              if (idx >= 0) srcLinks.splice(idx, 1)
            }
            const tgtLinks = this.agentLinkIndex.get(l.targetId)
            if (tgtLinks) {
              const idx = tgtLinks.indexOf(l)
              if (idx >= 0) tgtLinks.splice(idx, 1)
            }
          } else {
            kept.push(l)
          }
        }
        this.links = kept
        this.emitEvent('cluster_split', 'warning', 'Weak links killed')
        break
      }
    }
  }

  reset(params?: Partial<WorldParams>): void {
    if (params) {
      Object.assign(this.params, params)
    }
    this.neuronModel = this.params.neuronModel === 'izhikevich' ? izhikevichModel : lifModel
    this.initAgents()
  }

  getMetrics(): WorldMetrics {
    const clusterSet = new Set<number>()
    let totalActivity = 0
    let activeLinkCount = 0

    for (const agent of this.agents) {
      totalActivity += agent.activity
      if (agent.clusterId >= 0) clusterSet.add(agent.clusterId)
    }

    for (const link of this.links) {
      if (link.active && link.weight > LINK_PRUNE_THRESHOLD) activeLinkCount++
    }

    const avgActivity = totalActivity / this.agents.length

    const bins = new Float32Array(20)
    for (const agent of this.agents) {
      const bin = Math.min(19, Math.floor(agent.activity * 20))
      bins[bin]++
    }
    let entropy = 0
    for (let i = 0; i < 20; i++) {
      const p = bins[i] / this.agents.length
      if (p > 0) entropy -= p * Math.log2(p)
    }

    return {
      tick: this.tick,
      fps: 0,
      clusterCount: clusterSet.size,
      avgActivity,
      entropy,
      activeLinkCount,
      pruningRate: this.prunedLastTick,
    }
  }

  getSnapshot(): WorkerSnapshot {
    const n = this.agents.length
    const agentX = new Float32Array(n)
    const agentY = new Float32Array(n)
    const agentV = new Float32Array(n)
    const agentActivity = new Float32Array(n)
    const agentFatigue = new Float32Array(n)
    const agentValence = new Float32Array(n)
    const agentCluster = new Int32Array(n)
    const agentRole = new Uint8Array(n)
    const agentLastSpike = new Int32Array(n)
    const agentEnergy = new Float32Array(n)
    const agentDegree = new Int32Array(n)
    const agentAge = new Int32Array(n)
    const agentArousal = new Float32Array(n)
    const agentAlphaConform = new Float32Array(n)

    for (let i = 0; i < n; i++) {
      const a = this.agents[i]
      agentX[i] = a.x
      agentY[i] = a.y
      agentV[i] = a.v
      agentActivity[i] = a.activity
      agentFatigue[i] = a.fatigue
      agentValence[i] = a.valence
      agentCluster[i] = a.clusterId
      agentRole[i] = a.roleIndex
      agentLastSpike[i] = a.lastSpikedTick
      agentEnergy[i] = a.energy
      agentDegree[i] = a.degree
      agentAge[i] = a.age
      agentArousal[i] = a.arousal
      agentAlphaConform[i] = a.alpha_conform
    }

    const metrics = this.getMetrics()
    const events = [...this.pendingEvents]

    return {
      agentX, agentY, agentV, agentActivity,
      agentFatigue, agentValence, agentCluster, agentRole,
      agentLastSpike, agentEnergy, agentDegree, agentAge,
      agentArousal, agentAlphaConform,
      agentCount: n,
      links: this.links.filter((l) => l.active && l.weight > 0.03),
      metrics,
      events,
      roles: this.params.roles,
    }
  }
}
