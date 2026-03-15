import { SimulationEngine } from './engine'
import type { WorldParams } from './types'
import { DEFAULT_PARAMS, DEFAULT_ROLES } from './types'

let engine: SimulationEngine | null = null
let running = false
let intervalId: ReturnType<typeof setInterval> | null = null
let lastTime = performance.now()
let fpsSmooth = 60

function tick(): void {
  if (!engine || !running) return

  const now = performance.now()
  const dtReal = now - lastTime
  lastTime = now

  const instantFps = dtReal > 0 ? 1000 / dtReal : 60
  fpsSmooth = fpsSmooth * 0.9 + instantFps * 0.1

  const dt = engine.params.simSpeed
  engine.step(dt)

  const snapshot = engine.getSnapshot()
  snapshot.metrics.fps = Math.round(fpsSmooth)

  const transferables: ArrayBuffer[] = [
    snapshot.agentX.buffer,
    snapshot.agentY.buffer,
    snapshot.agentV.buffer,
    snapshot.agentActivity.buffer,
    snapshot.agentFatigue.buffer,
    snapshot.agentValence.buffer,
    snapshot.agentCluster.buffer,
    snapshot.agentRole.buffer,
    snapshot.agentLastSpike.buffer,
    snapshot.agentEnergy.buffer,
    snapshot.agentDegree.buffer,
    snapshot.agentAge.buffer,
    snapshot.agentArousal.buffer,
    snapshot.agentAlphaConform.buffer,
  ]

  ;(self as unknown as Worker).postMessage(snapshot, transferables)
}

function startLoop(): void {
  if (intervalId !== null) return
  lastTime = performance.now()
  intervalId = setInterval(tick, 16)
}

function stopLoop(): void {
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
}

self.onmessage = (e: MessageEvent) => {
  const { type } = e.data

  switch (type) {
    case 'init': {
      const params: WorldParams = { ...DEFAULT_PARAMS, ...e.data.params, roles: e.data.params?.roles ?? DEFAULT_ROLES }
      engine = new SimulationEngine(params)
      running = true
      startLoop()
      break
    }
    case 'step': {
      if (engine && !running) {
        const dt = engine.params.simSpeed
        engine.step(dt)
        const snapshot = engine.getSnapshot()
        const transferables: ArrayBuffer[] = [
          snapshot.agentX.buffer, snapshot.agentY.buffer,
          snapshot.agentV.buffer, snapshot.agentActivity.buffer,
          snapshot.agentFatigue.buffer, snapshot.agentValence.buffer,
          snapshot.agentCluster.buffer, snapshot.agentRole.buffer,
          snapshot.agentLastSpike.buffer, snapshot.agentEnergy.buffer,
          snapshot.agentDegree.buffer, snapshot.agentAge.buffer,
          snapshot.agentArousal.buffer, snapshot.agentAlphaConform.buffer,
        ]
        ;(self as unknown as Worker).postMessage(snapshot, transferables)
      }
      break
    }
    case 'setParams': {
      if (engine) {
        const newParams = e.data.params as Partial<WorldParams>
        Object.assign(engine.params, newParams)
      }
      break
    }
    case 'swap_model': {
      if (engine) {
        engine.swapNeuronModel(e.data.model)
      }
      break
    }
    case 'inject': {
      if (engine) {
        engine.injectEvent(e.data.eventType, e.data.region)
      }
      break
    }
    case 'set_roles': {
      if (engine) {
        engine.params.roles = e.data.roles
      }
      break
    }
    case 'pause': {
      running = false
      stopLoop()
      break
    }
    case 'resume': {
      running = true
      startLoop()
      break
    }
    case 'reset': {
      stopLoop()
      const params: WorldParams = { ...DEFAULT_PARAMS, ...(e.data.params ?? {}) }
      engine = new SimulationEngine(params)
      running = true
      startLoop()
      break
    }
  }
}
