import { memo, useCallback } from 'react'
import { useWorldStore } from '../store/worldStore'
import { presets, presetNames } from '../simulation/presets'

const PRESET_COLORS: Record<string, string> = {
  cooperativeColony: '#44AA66',
  competitiveSwarm: '#AA4444',
  fragileEcosystem: '#AA8833',
  financialContagion: '#FF6600',
}

export const PresetSelector = memo(function PresetSelector() {
  const loadPreset = useWorldStore((s) => s.loadPreset)
  const currentParams = useWorldStore((s) => s.params)

  const isActive = useCallback((name: string) => {
    const p = presets[name].params
    return p.agentCount === currentParams.agentCount &&
      p.conformityPressure === currentParams.conformityPressure &&
      p.neuronModel === currentParams.neuronModel
  }, [currentParams])

  return (
    <div className="flex flex-col gap-1">
      {presetNames.map((name) => {
        const preset = presets[name]
        const active = isActive(name)
        return (
          <button
            key={name}
            className="text-left px-2 py-1.5 rounded text-xs border transition-colors"
            style={active ? {
              background: '#0E1830',
              borderColor: '#3344AA',
              color: '#AABBEE',
            } : {
              background: 'transparent',
              borderColor: '#2A3555',
              color: '#8899BB',
            }}
            onClick={() => loadPreset(name)}
          >
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: PRESET_COLORS[name] ?? '#5566CC' }}
              />
              <span className="font-semibold">{preset.name}</span>
            </div>
            <div className="opacity-60 mt-0.5" style={{ fontSize: '10px' }}>
              {preset.description}
            </div>
          </button>
        )
      })}
    </div>
  )
})
