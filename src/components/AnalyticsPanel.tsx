import { memo, useRef, useEffect } from 'react'
import { useWorldStore } from '../store/worldStore'
import type { WorkerSnapshot, RoleConfig } from '../simulation/types'

const Sparkline = memo(function Sparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth * dpr
    const h = canvas.clientHeight * dpr
    canvas.width = w
    canvas.height = h
    ctx.clearRect(0, 0, w, h)
    if (data.length < 2) return

    const max = Math.max(...data, 0.001)
    const min = Math.min(...data, 0)
    const range = max - min || 1

    ctx.strokeStyle = color
    ctx.lineWidth = 2 * dpr
    ctx.lineJoin = 'round'
    ctx.beginPath()
    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * w
      const y = h - ((data[i] - min) / range) * (h - 6 * dpr) - 3 * dpr
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // fill under
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    ctx.fillStyle = color.replace(')', ', 0.08)').replace('rgb', 'rgba').replace('#', '')
    const gradient = ctx.createLinearGradient(0, 0, 0, h)
    gradient.addColorStop(0, color + '20')
    gradient.addColorStop(1, color + '05')
    ctx.fillStyle = gradient
    ctx.fill()
  }, [data, color, height])

  return <canvas ref={canvasRef} className="w-full block" style={{ height }} />
})

const MultiLineChart = memo(function MultiLineChart({ series, height = 120 }: { series: { data: number[]; color: string; label: string }[]; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || series.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth * dpr
    const h = canvas.clientHeight * dpr
    canvas.width = w
    canvas.height = h
    ctx.clearRect(0, 0, w, h)

    let globalMin = Infinity
    let globalMax = -Infinity
    for (const s of series) {
      for (const v of s.data) {
        if (v < globalMin) globalMin = v
        if (v > globalMax) globalMax = v
      }
    }
    if (globalMin === Infinity) return
    const range = globalMax - globalMin || 1
    const pad = range * 0.1
    const adjMin = globalMin - pad
    const adjRange = range + pad * 2

    // baseline at 100
    const baseY = h - ((100 - adjMin) / adjRange) * (h - 8 * dpr) - 4 * dpr
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 1 * dpr
    ctx.setLineDash([4 * dpr, 4 * dpr])
    ctx.beginPath()
    ctx.moveTo(0, baseY)
    ctx.lineTo(w, baseY)
    ctx.stroke()
    ctx.setLineDash([])

    // label "100"
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.font = `${10 * dpr}px monospace`
    ctx.fillText('100', 4 * dpr, baseY - 3 * dpr)

    for (const s of series) {
      if (s.data.length < 2) continue
      ctx.strokeStyle = s.color
      ctx.lineWidth = 2.5 * dpr
      ctx.lineJoin = 'round'
      ctx.beginPath()
      for (let i = 0; i < s.data.length; i++) {
        const x = (i / (s.data.length - 1)) * w
        const y = h - ((s.data[i] - adjMin) / adjRange) * (h - 8 * dpr) - 4 * dpr
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
  }, [series, height])

  return <canvas ref={canvasRef} className="w-full block" style={{ height }} />
})

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="h-1 rounded-full w-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div className="h-1 rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

interface RoleMetric {
  avgActivity: number
  avgEnergy: number
  avgFatigue: number
  avgValence: number
  count: number
}

function computeRoleMetrics(snapshot: WorkerSnapshot): Map<number, RoleMetric> {
  const map = new Map<number, { totalAct: number; totalEn: number; totalFat: number; totalVal: number; count: number }>()
  const n = snapshot.agentCount
  for (let i = 0; i < n; i++) {
    const role = snapshot.agentRole[i]
    const entry = map.get(role) ?? { totalAct: 0, totalEn: 0, totalFat: 0, totalVal: 0, count: 0 }
    entry.totalAct += snapshot.agentActivity[i]
    entry.totalEn += snapshot.agentEnergy[i]
    entry.totalFat += snapshot.agentFatigue[i]
    entry.totalVal += snapshot.agentValence[i]
    entry.count++
    map.set(role, entry)
  }
  const result = new Map<number, RoleMetric>()
  for (const [role, e] of map) {
    result.set(role, {
      avgActivity: e.count > 0 ? e.totalAct / e.count : 0,
      avgEnergy: e.count > 0 ? e.totalEn / e.count : 0,
      avgFatigue: e.count > 0 ? e.totalFat / e.count : 0,
      avgValence: e.count > 0 ? e.totalVal / e.count : 0,
      count: e.count,
    })
  }
  return result
}

// Shared price history accessible by RoleMetricsSection
const sharedPriceHistory: { current: Map<number, number[]> } = { current: new Map() }

const PriceChart = memo(function PriceChart() {
  const worldDataRef = useWorldStore((s) => s.worldDataRef)
  const tick = useWorldStore((s) => s.tick)
  const pricesRef = useRef<Map<number, number[]>>(new Map())
  const lastPriceRef = useRef<Map<number, number>>(new Map())
  const MAX = 120

  const snapshot = worldDataRef.current as WorkerSnapshot | null
  if (!snapshot || !snapshot.roles) return null

  const roleMetrics = computeRoleMetrics(snapshot)
  const roles = snapshot.roles

  for (let i = 0; i < roles.length; i++) {
    const rm = roleMetrics.get(i)
    if (!rm) continue
    const prev = lastPriceRef.current.get(i) ?? 100
    const role = roles[i]

    // Each role reacts differently to its own metrics
    const actDelta = (rm.avgActivity - 0.2) * 30 * (role.noiseMultiplier ?? 1)
    const capitalDrain = (1 - rm.avgEnergy) * -15
    const stressHit = rm.avgFatigue * -20
    const sentimentPush = rm.avgValence * 2
    // Role-specific noise for differentiation
    const roleNoise = (Math.sin(tick * 0.01 + i * 2.5) * 0.3) * (role.speed ?? 0.2)

    const delta = actDelta + capitalDrain + stressHit + sentimentPush + roleNoise
    const momentum = 0.995
    const newPrice = prev * momentum + (prev + delta) * (1 - momentum)
    const clamped = Math.max(10, Math.min(500, newPrice))
    lastPriceRef.current.set(i, clamped)

    let history = pricesRef.current.get(i)
    if (!history) { history = []; pricesRef.current.set(i, history) }
    history.push(clamped)
    if (history.length > MAX) history.shift()
  }

  sharedPriceHistory.current = pricesRef.current

  const series = roles.map((role: RoleConfig, i: number) => ({
    data: pricesRef.current.get(i) ?? [],
    color: role.color,
    label: role.label,
  }))
  const latestPrices = roles.map((_: RoleConfig, i: number) => lastPriceRef.current.get(i) ?? 100)

  return (
    <div className="rounded-lg p-2 mb-2" style={{ background: '#0A0F1E', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold" style={{ color: '#D8D6CC' }}>Sector Index</span>
        <span className="text-xs font-mono" style={{ color: '#556677' }}>base=100</span>
      </div>
      <MultiLineChart series={series} height={130} />
      <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(roles.length, 3)}, 1fr)` }}>
        {roles.map((role: RoleConfig, i: number) => {
          const price = latestPrices[i]
          const delta = price - 100
          const color = delta >= 0 ? '#44AA66' : '#AA4433'
          return (
            <div key={role.id} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: role.color }} />
              <span className="font-mono font-bold" style={{ color, fontSize: '11px' }}>
                {price.toFixed(1)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
})

const RoleMetricsSection = memo(function RoleMetricsSection() {
  const worldDataRef = useWorldStore((s) => s.worldDataRef)
  const tick = useWorldStore((s) => s.tick)
  const historyRef = useRef<Map<number, { activity: number[] }>>(new Map())

  const snapshot = worldDataRef.current as WorkerSnapshot | null
  if (!snapshot || !snapshot.roles) return null

  const roleMetrics = computeRoleMetrics(snapshot)
  const roles = snapshot.roles
  const MAX = 60

  for (let i = 0; i < roles.length; i++) {
    const rm = roleMetrics.get(i)
    if (!rm) continue
    let h = historyRef.current.get(i)
    if (!h) { h = { activity: [] }; historyRef.current.set(i, h) }
    h.activity.push(rm.avgActivity)
    if (h.activity.length > MAX) h.activity.shift()
  }

  return (
    <>
      <PriceChart />

      <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#778899' }}>
        By Role
      </div>
      {roles.map((role: RoleConfig, i: number) => {
        const rm = roleMetrics.get(i)
        if (!rm) return null
        const priceData = sharedPriceHistory.current.get(i) ?? []
        const lastPrice = priceData.length > 0 ? priceData[priceData.length - 1] : 100
        const priceDelta = lastPrice - 100
        const priceColor = priceDelta >= 0 ? '#44AA66' : '#AA4433'
        return (
          <div key={role.id} className="rounded-lg p-1.5 mb-1" style={{ background: '#0A0F1E', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: role.color }} />
              <span className="text-xs font-bold" style={{ color: '#D8D6CC' }}>{role.label}</span>
              <span className="font-mono font-bold ml-auto" style={{ color: priceColor, fontSize: '11px' }}>
                {lastPrice.toFixed(1)}
              </span>
            </div>
            <div className="flex gap-3 mb-1" style={{ fontSize: '10px' }}>
              <div>
                <span style={{ color: '#778899' }}>Act </span>
                <span className="font-mono font-bold" style={{ color: '#D8D6CC' }}>{rm.avgActivity.toFixed(2)}</span>
              </div>
              <div>
                <span style={{ color: '#778899' }}>Cap </span>
                <span className="font-mono font-bold" style={{ color: '#D8D6CC' }}>{rm.avgEnergy.toFixed(2)}</span>
              </div>
              <div>
                <span style={{ color: '#778899' }}>Str </span>
                <span className="font-mono font-bold" style={{ color: rm.avgFatigue > 0.3 ? '#AA4433' : '#D8D6CC' }}>{rm.avgFatigue.toFixed(2)}</span>
              </div>
            </div>
            <Sparkline data={priceData} color={role.color} height={22} />
          </div>
        )
      })}
    </>
  )
})

function MetricRow({ label, value, color, trend }: { label: string; value: string | number; color: string; trend: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span style={{ color: '#778899', fontSize: '11px' }}>{label}</span>
      <div className="flex items-center gap-1">
        <span className="font-mono font-bold" style={{ color: '#D8D6CC', fontSize: '13px' }}>{value}</span>
        <span className="font-mono" style={{ color, fontSize: '11px' }}>{trend}</span>
      </div>
    </div>
  )
}

export const AnalyticsPanel = memo(function AnalyticsPanel() {
  const metrics = useWorldStore((s) => s.metrics)
  const prevRef = useRef({ clusters: 0, activity: 0, entropy: 0, links: 0 })

  const p = prevRef.current
  const trendClusters = metrics.clusterCount > p.clusters ? '\u2191' : metrics.clusterCount < p.clusters ? '\u2193' : ''
  const trendActivity = metrics.avgActivity > p.activity ? '\u2191' : metrics.avgActivity < p.activity ? '\u2193' : ''
  const trendEntropy = metrics.entropy > p.entropy ? '\u2191' : metrics.entropy < p.entropy ? '\u2193' : ''
  const trendLinks = metrics.activeLinkCount > p.links ? '\u2191' : metrics.activeLinkCount < p.links ? '\u2193' : ''

  if (metrics.tick % 10 === 0) {
    p.clusters = metrics.clusterCount
    p.activity = metrics.avgActivity
    p.entropy = metrics.entropy
    p.links = metrics.activeLinkCount
  }

  return (
    <aside
      className="w-60 flex-shrink-0 overflow-y-auto p-3"
      style={{ background: '#0D1120', borderLeft: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="text-xs font-bold uppercase tracking-wider mb-2 pb-1" style={{ color: '#778899', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        Market Overview
      </div>

      <div className="rounded-lg p-2 mb-3" style={{ background: '#0A0F1E', border: '1px solid rgba(255,255,255,0.06)' }}>
        <MetricRow label="Sectors" value={metrics.clusterCount} color="#5566CC" trend={trendClusters} />
        <MetricRow label="Volatility" value={metrics.avgActivity.toFixed(3)} color="#44AA66" trend={trendActivity} />
        <MetricRow label="Disorder" value={metrics.entropy.toFixed(2)} color="#AA8833" trend={trendEntropy} />
        <MetricRow label="Counterparties" value={metrics.activeLinkCount} color="#4488FF" trend={trendLinks} />
        <div className="flex items-center justify-between py-0.5 mt-1 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ color: '#556677', fontSize: '10px' }}>FPS</span>
          <span className="font-mono" style={{ color: '#556677', fontSize: '11px' }}>{metrics.fps}</span>
        </div>
      </div>

      <RoleMetricsSection />

      <div className="mt-3 text-xs font-mono" style={{ color: '#556677' }}>
        Pruning: {metrics.pruningRate} links/tick
      </div>
    </aside>
  )
})
