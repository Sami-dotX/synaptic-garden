import { memo, useCallback } from 'react'
import { useWorldStore } from '../store/worldStore'

export const NeuronModelToggle = memo(function NeuronModelToggle() {
  const neuronModel = useWorldStore((s) => s.neuronModel)
  const swapNeuronModel = useWorldStore((s) => s.swapNeuronModel)

  const handleSwap = useCallback((model: 'lif' | 'izhikevich') => {
    if (model === neuronModel) return
    const confirmed = window.confirm('Swapping model will reset the simulation. Continue?')
    if (confirmed) {
      swapNeuronModel(model)
    }
  }, [neuronModel, swapNeuronModel])

  const btnBase = 'w-full text-left px-2 py-1.5 rounded text-xs transition-colors'
  const active = 'border'
  const inactive = 'border'

  return (
    <div className="flex flex-col gap-1">
      <button
        className={btnBase}
        style={neuronModel === 'lif' ? {
          background: '#1A2450',
          borderColor: '#3344AA',
          color: '#AABBEE',
        } : {
          background: 'transparent',
          borderColor: '#2A3555',
          color: '#8899BB',
        }}
        onClick={() => handleSwap('lif')}
      >
        <div className="font-semibold">LIF+</div>
        <div className="opacity-60" style={{ fontSize: '10px' }}>Performance — 2k-5k agents</div>
      </button>
      <button
        className={btnBase}
        style={neuronModel === 'izhikevich' ? {
          background: '#1A2450',
          borderColor: '#3344AA',
          color: '#AABBEE',
        } : {
          background: 'transparent',
          borderColor: '#2A3555',
          color: '#8899BB',
        }}
        onClick={() => handleSwap('izhikevich')}
      >
        <div className="font-semibold">Izhikevich</div>
        <div className="opacity-60" style={{ fontSize: '10px' }}>Expressive — 500-2k agents</div>
      </button>
    </div>
  )
})
