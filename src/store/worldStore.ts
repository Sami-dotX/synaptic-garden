import { create } from 'zustand'
import type { WorldParams, WorldMetrics, SimEvent, WorkerSnapshot, RoleConfig } from '../simulation/types'
import { DEFAULT_PARAMS } from '../simulation/types'
import { presets } from '../simulation/presets'

interface WorldDataRef {
  current: WorkerSnapshot | null
}

interface WorldState {
  tick: number
  metrics: WorldMetrics
  events: SimEvent[]
  params: WorldParams
  isRunning: boolean
  selectedAgentId: number | null
  neuronModel: 'lif' | 'izhikevich'
  worldDataRef: WorldDataRef
  worker: Worker | null
  roleEditorOpen: boolean

  initWorker: () => void
  setParams: (partial: Partial<WorldParams>) => void
  toggleRun: () => void
  reset: (params?: Partial<WorldParams>) => void
  swapNeuronModel: (model: 'lif' | 'izhikevich') => void
  selectAgent: (id: number | null) => void
  injectEvent: (eventType: string, region?: { x: number; y: number; radius: number }) => void
  loadPreset: (name: string) => void
  stepOnce: () => void
  setRoles: (roles: RoleConfig[]) => void
  setRoleEditorOpen: (open: boolean) => void
}

const defaultMetrics: WorldMetrics = {
  tick: 0,
  fps: 0,
  clusterCount: 0,
  avgActivity: 0,
  entropy: 0,
  activeLinkCount: 0,
  pruningRate: 0,
}

export const useWorldStore = create<WorldState>((set, get) => ({
  tick: 0,
  metrics: { ...defaultMetrics },
  events: [],
  params: { ...DEFAULT_PARAMS },
  isRunning: false,
  selectedAgentId: null,
  neuronModel: DEFAULT_PARAMS.neuronModel,
  worldDataRef: { current: null },
  worker: null,
  roleEditorOpen: false,

  initWorker: () => {
    const existing = get().worker
    if (existing) {
      existing.terminate()
    }

    const worker = new Worker(
      new URL('../simulation/worker.ts', import.meta.url),
      { type: 'module' },
    )

    const { worldDataRef } = get()

    worker.onmessage = (e: MessageEvent<WorkerSnapshot>) => {
      worldDataRef.current = e.data
      const { metrics, events: newEvents } = e.data

      set((s) => {
        let events = s.events
        if (newEvents.length > 0) {
          events = [...s.events, ...newEvents].slice(-200)
        }
        return { tick: metrics.tick, metrics, events }
      })
    }

    const params = get().params
    worker.postMessage({ type: 'init', params })

    set({ worker, isRunning: true })
  },

  setParams: (partial) => {
    const { worker } = get()
    set((s) => ({ params: { ...s.params, ...partial } }))
    worker?.postMessage({ type: 'setParams', params: partial })
  },

  toggleRun: () => {
    const { worker, isRunning } = get()
    if (isRunning) {
      worker?.postMessage({ type: 'pause' })
    } else {
      worker?.postMessage({ type: 'resume' })
    }
    set({ isRunning: !isRunning })
  },

  reset: (params) => {
    const { worker } = get()
    const merged = { ...get().params, ...(params ?? {}) }
    worker?.postMessage({ type: 'reset', params: merged })
    set({ params: merged, isRunning: true, events: [], selectedAgentId: null })
  },

  swapNeuronModel: (model) => {
    const { worker } = get()
    worker?.postMessage({ type: 'swap_model', model })
    set({ neuronModel: model, events: [], selectedAgentId: null, params: { ...get().params, neuronModel: model } })
  },

  selectAgent: (id) => {
    set({ selectedAgentId: id })
  },

  injectEvent: (eventType, region) => {
    const { worker } = get()
    worker?.postMessage({ type: 'inject', eventType, region })
  },

  loadPreset: (name) => {
    const preset = presets[name]
    if (!preset) return
    const { worker } = get()
    const params = { ...preset.params }
    worker?.postMessage({ type: 'reset', params })
    set({
      params,
      neuronModel: params.neuronModel,
      isRunning: true,
      events: [],
      selectedAgentId: null,
    })
  },

  stepOnce: () => {
    const { worker, isRunning } = get()
    if (!isRunning) {
      worker?.postMessage({ type: 'step' })
    }
  },

  setRoles: (roles) => {
    const { worker } = get()
    const params = { ...get().params, roles }
    worker?.postMessage({ type: 'reset', params })
    set({ params, isRunning: true, events: [], selectedAgentId: null })
  },

  setRoleEditorOpen: (open) => {
    set({ roleEditorOpen: open })
  },
}))
