import { memo } from 'react'

export const TopBar = memo(function TopBar() {
  return (
    <header
      className="flex items-center justify-between px-4 h-10 flex-shrink-0"
      style={{ background: '#0D1120', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tracking-wide" style={{ color: '#D8D6CC' }}>
          Synaptic Garden
        </span>
        <span className="text-xs" style={{ color: '#778899' }}>
          Neural Ecosystem Simulator
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs" style={{ color: '#778899' }}>
          Pan: drag | Zoom: scroll | Click: inspect
        </span>
      </div>
    </header>
  )
})
