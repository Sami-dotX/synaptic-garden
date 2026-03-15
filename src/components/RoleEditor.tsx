import { memo, useState, useCallback } from 'react'
import { useWorldStore } from '../store/worldStore'
import type { RoleConfig } from '../simulation/types'

interface RoleSliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}

const RoleSlider = memo(function RoleSlider({ label, value, min, max, step, onChange }: RoleSliderProps) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-xs w-24 flex-shrink-0" style={{ color: '#778899' }}>{label}</span>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #5566CC ${((value - min) / (max - min)) * 100}%, #2A3555 ${((value - min) / (max - min)) * 100}%)`,
        }}
      />
      <span className="text-xs font-mono w-10 text-right" style={{ color: '#D8D6CC' }}>
        {value.toFixed(step < 1 ? 2 : 0)}
      </span>
    </div>
  )
})

function RoleCard({
  role,
  onChange,
  onRemove,
}: {
  role: RoleConfig
  onChange: (updated: RoleConfig) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  const update = useCallback((partial: Partial<RoleConfig>) => {
    onChange({ ...role, ...partial })
  }, [role, onChange])

  return (
    <div
      className="rounded-lg p-2 mb-2"
      style={{ background: '#0A0F1E', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <input
          type="color"
          value={role.color}
          onChange={(e) => update({ color: e.target.value })}
          className="w-5 h-5 rounded cursor-pointer border-0"
          style={{ background: 'transparent' }}
        />
        <input
          type="text"
          value={role.label}
          onChange={(e) => update({ label: e.target.value, id: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
          className="flex-1 bg-transparent text-xs font-semibold outline-none"
          style={{ color: '#D8D6CC' }}
        />
        <button
          className="text-xs px-1 rounded hover:bg-white/10 cursor-pointer"
          style={{ color: '#778899' }}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? '\u25B2' : '\u25BC'}
        </button>
        <button
          className="text-xs px-1 rounded hover:bg-red-900/30 cursor-pointer"
          style={{ color: '#AA4433' }}
          onClick={onRemove}
        >
          x
        </button>
      </div>

      <div className="text-xs mb-1" style={{ color: '#778899', fontSize: '10px' }}>
        <input
          type="text"
          value={role.description}
          onChange={(e) => update({ description: e.target.value })}
          className="w-full bg-transparent outline-none"
          style={{ color: '#778899' }}
          placeholder="Description..."
        />
      </div>

      <RoleSlider label="Proportion" value={role.proportion} min={0} max={1} step={0.05} onChange={(v) => update({ proportion: v })} />

      {expanded && (
        <>
          <RoleSlider label="Speed" value={role.speed} min={0} max={1} step={0.01} onChange={(v) => update({ speed: v })} />
          <RoleSlider label="Conformity" value={role.conformity} min={0} max={1} step={0.01} onChange={(v) => update({ conformity: v })} />
          <RoleSlider label="Fatigue mult." value={role.fatigueMultiplier} min={0} max={3} step={0.1} onChange={(v) => update({ fatigueMultiplier: v })} />
          <RoleSlider label="Noise mult." value={role.noiseMultiplier} min={0} max={3} step={0.1} onChange={(v) => update({ noiseMultiplier: v })} />
          <RoleSlider label="Energy recov." value={role.energyRecovery} min={0} max={0.02} step={0.001} onChange={(v) => update({ energyRecovery: v })} />
          <RoleSlider label="Excit. bias" value={role.excitatoryBias} min={0} max={1} step={0.05} onChange={(v) => update({ excitatoryBias: v })} />
        </>
      )}
    </div>
  )
}

export const RoleEditor = memo(function RoleEditor() {
  const roleEditorOpen = useWorldStore((s) => s.roleEditorOpen)
  const setRoleEditorOpen = useWorldStore((s) => s.setRoleEditorOpen)
  const currentRoles = useWorldStore((s) => s.params.roles)
  const setRoles = useWorldStore((s) => s.setRoles)

  const [draft, setDraft] = useState<RoleConfig[]>(currentRoles)

  const handleOpen = useCallback(() => {
    setDraft(currentRoles)
    setRoleEditorOpen(true)
  }, [currentRoles, setRoleEditorOpen])

  const handleClose = useCallback(() => {
    setRoleEditorOpen(false)
  }, [setRoleEditorOpen])

  const handleApply = useCallback(() => {
    if (draft.length === 0) return
    setRoles(draft)
    setRoleEditorOpen(false)
  }, [draft, setRoles, setRoleEditorOpen])

  const handleRoleChange = useCallback((index: number, updated: RoleConfig) => {
    setDraft((prev) => prev.map((r, i) => i === index ? updated : r))
  }, [])

  const handleRemoveRole = useCallback((index: number) => {
    setDraft((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleAddRole = useCallback(() => {
    setDraft((prev) => [
      ...prev,
      {
        id: `role_${prev.length}`,
        label: `Role ${prev.length + 1}`,
        color: `#${Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0')}`,
        proportion: 0.1,
        speed: 0.2,
        conformity: 0.5,
        fatigueMultiplier: 1.0,
        noiseMultiplier: 1.0,
        energyRecovery: 0.002,
        excitatoryBias: 0.7,
        description: 'New custom role',
      },
    ])
  }, [])

  if (!roleEditorOpen) {
    return (
      <button
        className="w-full text-left px-2 py-1.5 rounded text-xs border transition-colors cursor-pointer"
        style={{ background: '#0E1830', borderColor: '#2A3555', color: '#AABBEE' }}
        onClick={handleOpen}
      >
        Edit Roles ({currentRoles.length})
      </button>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
    >
      <div
        className="rounded-xl p-4 max-h-[80vh] overflow-y-auto"
        style={{
          background: '#0D1120',
          border: '1px solid rgba(255,255,255,0.1)',
          width: '380px',
        }}
      >
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold" style={{ color: '#D8D6CC' }}>
            Role Editor
          </h2>
          <button
            className="text-xs px-2 py-0.5 rounded hover:bg-white/10 cursor-pointer"
            style={{ color: '#778899' }}
            onClick={handleClose}
          >
            ESC
          </button>
        </div>

        <div className="text-xs mb-3" style={{ color: '#778899' }}>
          Configure agent roles. Each role defines behavior, speed, noise sensitivity, and more.
          Click the arrow to expand advanced parameters.
        </div>

        {draft.map((role, i) => (
          <RoleCard
            key={`${role.id}-${i}`}
            role={role}
            onChange={(updated) => handleRoleChange(i, updated)}
            onRemove={() => handleRemoveRole(i)}
          />
        ))}

        <button
          className="w-full text-xs py-1.5 rounded border border-dashed mb-3 cursor-pointer"
          style={{ borderColor: '#2A3555', color: '#778899' }}
          onClick={handleAddRole}
        >
          + Add Role
        </button>

        <div className="flex gap-2">
          <button
            className="flex-1 text-xs py-1.5 rounded cursor-pointer"
            style={{ background: '#1A2450', color: '#AABBEE', border: '1px solid #3344AA' }}
            onClick={handleApply}
          >
            Apply & Reset
          </button>
          <button
            className="flex-1 text-xs py-1.5 rounded cursor-pointer"
            style={{ background: 'transparent', color: '#778899', border: '1px solid #2A3555' }}
            onClick={handleClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
})
