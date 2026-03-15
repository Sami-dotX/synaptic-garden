import { memo, useCallback } from 'react'
import { useWorldStore } from '../store/worldStore'
import { NeuronModelToggle } from './NeuronModelToggle'
import { PresetSelector } from './PresetSelector'
import { RoleEditor } from './RoleEditor'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}

const Slider = memo(function Slider({ label, value, min, max, step, onChange }: SliderProps) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-0.5">
        <span style={{ color: '#D8D6CC' }}>{label}</span>
        <span className="font-mono" style={{ color: '#778899' }}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #5566CC ${((value - min) / (max - min)) * 100}%, #2A3555 ${((value - min) / (max - min)) * 100}%)`,
        }}
      />
    </div>
  )
})

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div
        className="text-xs font-semibold uppercase tracking-wider mb-1.5 pb-1"
        style={{ color: '#778899', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

export const ControlPanel = memo(function ControlPanel() {
  const params = useWorldStore((s) => s.params)
  const isRunning = useWorldStore((s) => s.isRunning)
  const setParams = useWorldStore((s) => s.setParams)
  const toggleRun = useWorldStore((s) => s.toggleRun)
  const reset = useWorldStore((s) => s.reset)
  const stepOnce = useWorldStore((s) => s.stepOnce)
  const injectEvent = useWorldStore((s) => s.injectEvent)

  const handleSlider = useCallback((key: string) => (value: number) => {
    setParams({ [key]: value })
  }, [setParams])

  const handleRandomize = useCallback(() => {
    setParams({
      conformityPressure: Math.random(),
      plasticityRate: Math.random(),
      fatigueRate: Math.random(),
      noiseLevel: Math.random(),
    })
  }, [setParams])

  const btnClass = 'px-2 py-1 rounded text-xs border transition-colors cursor-pointer'
  const btnStyle = { background: '#0E1830', borderColor: '#2A3555', color: '#AABBEE' }

  return (
    <aside
      className="w-44 flex-shrink-0 overflow-y-auto p-2"
      style={{
        background: '#0D1120',
        borderRight: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <Section title="Neuron Model">
        <NeuronModelToggle />
      </Section>

      <Section title="Controls">
        <div className="flex flex-wrap gap-1 mb-2">
          <button className={btnClass} style={btnStyle} onClick={toggleRun}>
            {isRunning ? 'Pause' : 'Play'}
          </button>
          <button className={btnClass} style={btnStyle} onClick={() => reset()}>
            Reset
          </button>
          <button className={btnClass} style={btnStyle} onClick={stepOnce}>
            Step
          </button>
          <button className={btnClass} style={btnStyle} onClick={handleRandomize}>
            Random
          </button>
        </div>
      </Section>

      <Section title="Parameters">
        <Slider
          label="Agents"
          value={params.agentCount}
          min={100} max={5000} step={100}
          onChange={(v) => { setParams({ agentCount: v }); reset({ agentCount: v }) }}
        />
        <Slider
          label="Conformity"
          value={params.conformityPressure}
          min={0} max={1} step={0.01}
          onChange={handleSlider('conformityPressure')}
        />
        <Slider
          label="Plasticity"
          value={params.plasticityRate}
          min={0} max={1} step={0.01}
          onChange={handleSlider('plasticityRate')}
        />
        <Slider
          label="Fatigue Rate"
          value={params.fatigueRate}
          min={0} max={1} step={0.01}
          onChange={handleSlider('fatigueRate')}
        />
        <Slider
          label="Noise"
          value={params.noiseLevel}
          min={0} max={1} step={0.01}
          onChange={handleSlider('noiseLevel')}
        />
        <Slider
          label="Social Radius"
          value={params.interactionRadius}
          min={10} max={200} step={5}
          onChange={(v) => { setParams({ interactionRadius: v }); reset({ interactionRadius: v }) }}
        />
        <Slider
          label="Sim Speed"
          value={params.simSpeed}
          min={0.1} max={5} step={0.1}
          onChange={handleSlider('simSpeed')}
        />
      </Section>

      <Section title="Presets">
        <PresetSelector />
      </Section>

      <Section title="Agent Roles">
        <RoleEditor />
      </Section>

      <Section title="Inject Events">
        <div className="flex flex-col gap-1">
          <button className={btnClass} style={{ ...btnStyle, borderColor: '#335544' }} onClick={() => injectEvent('energy_burst')}>
            Energy Burst
          </button>
          <button className={btnClass} style={{ ...btnStyle, borderColor: '#553322' }} onClick={() => injectEvent('noise_shock')}>
            Noise Shock
          </button>
          <button className={btnClass} style={{ ...btnStyle, borderColor: '#223355' }} onClick={() => injectEvent('freeze')}>
            Freeze All
          </button>
          <button className={btnClass} style={{ ...btnStyle, borderColor: '#553333' }} onClick={() => injectEvent('kill_weak')}>
            Kill Weak Links
          </button>
        </div>
      </Section>

      <Section title="Scenarios">
        <button
          className={btnClass + ' w-full'}
          style={{ ...btnStyle, borderColor: '#AA4400', background: '#1A1008' }}
          onClick={() => {
            injectEvent('energy_burst')
            setTimeout(() => injectEvent('noise_shock'), 500)
            setTimeout(() => injectEvent('kill_weak'), 1500)
            setTimeout(() => setParams({ noiseLevel: Math.min(1, params.noiseLevel + 0.3) }), 2500)
          }}
        >
          Hormuz Blockade
          <div style={{ fontSize: '9px', color: '#778899', marginTop: '2px' }}>
            Oil shock + noise + link collapse
          </div>
        </button>
      </Section>
    </aside>
  )
})
