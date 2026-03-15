import { useRef, useEffect, useCallback } from 'react'
import { PixiRenderer } from '../rendering/pixiRenderer'
import { useWorldStore } from '../store/worldStore'
import type { WorkerSnapshot, RoleConfig } from '../simulation/types'

export function WorldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<PixiRenderer | null>(null)
  const panRef = useRef({ x: 0, y: 0, zoom: 1, dragging: false, lastX: 0, lastY: 0 })

  const tick = useWorldStore((s) => s.tick)
  const metrics = useWorldStore((s) => s.metrics)
  const neuronModel = useWorldStore((s) => s.neuronModel)
  const selectAgent = useWorldStore((s) => s.selectAgent)
  const worldDataRef = useWorldStore((s) => s.worldDataRef)
  const params = useWorldStore((s) => s.params)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const { width, height } = container.getBoundingClientRect()
    if (width === 0 || height === 0) return

    canvas.width = width
    canvas.height = height

    const renderer = new PixiRenderer(canvas)
    rendererRef.current = renderer

    // Fit the 3200x1800 world into the viewport
    const zoomX = width / 3200
    const zoomY = height / 1800
    const initialZoom = Math.min(zoomX, zoomY) * 0.95
    panRef.current.zoom = initialZoom
    renderer.setCamera(0, 0, initialZoom)

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect
        if (w > 0 && h > 0) {
          renderer.resize(w, h)
        }
      }
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
      renderer.destroy()
      rendererRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!rendererRef.current || !worldDataRef.current) return
    rendererRef.current.update(worldDataRef.current, tick)
  }, [tick, worldDataRef])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const pan = panRef.current
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    pan.zoom = Math.max(0.3, Math.min(4, pan.zoom * delta))
    rendererRef.current?.setCamera(pan.x, pan.y, pan.zoom)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pan = panRef.current
    pan.dragging = true
    pan.lastX = e.clientX
    pan.lastY = e.clientY
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pan = panRef.current
    if (!pan.dragging) return
    const dx = e.clientX - pan.lastX
    const dy = e.clientY - pan.lastY
    pan.x += dx
    pan.y += dy
    pan.lastX = e.clientX
    pan.lastY = e.clientY
    rendererRef.current?.setCamera(pan.x, pan.y, pan.zoom)
  }, [])

  const handleMouseUp = useCallback(() => {
    panRef.current.dragging = false
  }, [])

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!worldDataRef.current) return
    const snapshot = worldDataRef.current as WorkerSnapshot
    const pan = panRef.current
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const worldX = (screenX - pan.x) / pan.zoom
    const worldY = (screenY - pan.y) / pan.zoom

    let minDist = 225
    let closest = -1
    const n = snapshot.agentCount
    for (let i = 0; i < n; i++) {
      const dx = snapshot.agentX[i] - worldX
      const dy = snapshot.agentY[i] - worldY
      const d2 = dx * dx + dy * dy
      if (d2 < minDist) {
        minDist = d2
        closest = i
      }
    }
    selectAgent(closest >= 0 ? closest : null)
  }, [worldDataRef, selectAgent])

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden min-w-0"
      style={{ background: '#080B14' }}
    >
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(4,6,12,0.6) 100%)',
        }}
      />
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
      />
      <div className="absolute top-2 left-2 z-20 flex gap-2 items-center">
        <span
          className="text-xs px-2 py-0.5 rounded font-mono"
          style={{ background: '#1A2450', color: '#AABBEE', border: '1px solid #3344AA' }}
        >
          {neuronModel === 'lif' ? 'LIF+' : 'Izhikevich'}
        </span>
        <span className="text-xs font-mono" style={{ color: '#778899' }}>
          {metrics.fps} fps
        </span>
      </div>
      <div
        className="absolute bottom-3 left-3 z-20 flex gap-3 items-center px-2 py-1 rounded"
        style={{ background: 'rgba(8,11,20,0.75)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {params.roles.map((role: RoleConfig) => (
          <div key={role.id} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: role.color }} />
            <span style={{ color: '#99AABB', fontSize: '10px' }}>{role.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
