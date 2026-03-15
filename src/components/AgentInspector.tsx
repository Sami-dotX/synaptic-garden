import { memo, useEffect, useCallback, useRef, useState } from 'react'
import { useWorldStore } from '../store/worldStore'
import type { WorkerSnapshot } from '../simulation/types'

// Role names resolved dynamically from snapshot.roles

export const AgentInspector = memo(function AgentInspector() {
  const selectedAgentId = useWorldStore((s) => s.selectedAgentId)
  const selectAgent = useWorldStore((s) => s.selectAgent)
  const worldDataRef = useWorldStore((s) => s.worldDataRef)
  const tick = useWorldStore((s) => s.tick)
  const activityRing = useRef<number[]>([])
  const [agentData, setAgentData] = useState<{
    id: number; x: number; y: number; activity: number; energy: number
    fatigue: number; valence: number; clusterId: number; degree: number
    age: number; role: string; alphaConform: number; arousal: number
  } | null>(null)
  const [pos, setPos] = useState({ x: 60, y: 60 })
  const dragRef = useRef({ dragging: false, offsetX: 0, offsetY: 0 })

  useEffect(() => {
    if (selectedAgentId === null || !worldDataRef.current) {
      setAgentData(null)
      return
    }
    const s = worldDataRef.current as WorkerSnapshot
    const i = selectedAgentId
    if (i >= s.agentCount) {
      setAgentData(null)
      return
    }

    activityRing.current.push(s.agentActivity[i])
    if (activityRing.current.length > 100) activityRing.current.shift()

    setAgentData({
      id: i,
      x: Math.round(s.agentX[i]),
      y: Math.round(s.agentY[i]),
      activity: s.agentActivity[i],
      energy: s.agentEnergy[i],
      fatigue: s.agentFatigue[i],
      valence: s.agentValence[i],
      clusterId: s.agentCluster[i],
      degree: s.agentDegree[i],
      age: s.agentAge[i],
      role: s.roles?.[s.agentRole[i]]?.label ?? `role_${s.agentRole[i]}`,
      alphaConform: s.agentAlphaConform[i],
      arousal: s.agentArousal[i],
    })
  }, [tick, selectedAgentId, worldDataRef])

  const handleClose = useCallback(() => {
    activityRing.current = []
    selectAgent(null)
  }, [selectAgent])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleClose])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.dragging) return
      setPos({ x: e.clientX - dragRef.current.offsetX, y: e.clientY - dragRef.current.offsetY })
    }
    const onMouseUp = () => {
      dragRef.current.dragging = false
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  if (!agentData) return null

  const sparkData = activityRing.current

  return (
    <div
      className="fixed z-50 rounded-lg p-3 shadow-lg"
      style={{
        left: pos.x,
        top: pos.y,
        width: '220px',
        background: '#0D1120',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#D8D6CC',
      }}
    >
      <div
        className="flex justify-between items-center mb-2"
        style={{ cursor: dragRef.current.dragging ? 'grabbing' : 'grab', userSelect: 'none' }}
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return
          dragRef.current = { dragging: true, offsetX: e.clientX - pos.x, offsetY: e.clientY - pos.y }
        }}
      >
        <span className="text-xs font-semibold" style={{ color: '#AABBEE' }}>
          Agent #{agentData.id}
        </span>
        <button
          className="text-xs px-1 rounded hover:bg-white/10"
          style={{ color: '#778899' }}
          onClick={handleClose}
        >
          ESC
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs mb-2">
        <Row label="Position" value={`${agentData.x}, ${agentData.y}`} />
        <Row label="Role" value={agentData.role} />
        <Row label="Activity" value={agentData.activity.toFixed(3)} />
        <Row label="Energy" value={agentData.energy.toFixed(3)} />
        <Row label="Fatigue" value={agentData.fatigue.toFixed(3)} />
        <Row label="Valence" value={agentData.valence.toFixed(3)} />
        <Row label="Arousal" value={agentData.arousal.toFixed(3)} />
        <Row label="Cluster" value={agentData.clusterId.toString()} />
        <Row label="Degree" value={agentData.degree.toString()} />
        <Row label="Age" value={agentData.age.toString()} />
        <Row label="Conform" value={agentData.alphaConform.toFixed(2)} />
      </div>

      <div className="text-xs mb-1" style={{ color: '#778899', fontSize: '10px' }}>
        Activity (last 100 ticks)
      </div>
      <MiniSparkline data={sparkData} />
    </div>
  )
})

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span style={{ color: '#778899' }}>{label}</span>
      <span className="font-mono text-right">{value}</span>
    </>
  )
}

function MiniSparkline({ data }: { data: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length < 2) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)
    const max = Math.max(...data, 0.01)
    ctx.strokeStyle = '#5566CC'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * w
      const y = h - (data[i] / max) * (h - 2) - 1
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }, [data])

  return <canvas ref={canvasRef} width={190} height={30} className="w-full" style={{ height: 30 }} />
}
