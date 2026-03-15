import { memo, useRef, useEffect, useCallback } from 'react'
import { useWorldStore } from '../store/worldStore'
import type { SimEvent } from '../simulation/types'

const SEVERITY_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  info:     { bg: '#0E1E30', color: '#4488AA', border: '#1A3A55' },
  warning:  { bg: '#1E1A0A', color: '#AA8833', border: '#3A300A' },
  critical: { bg: '#1E0A0A', color: '#AA4433', border: '#3A1A0A' },
}

const EventItem = memo(function EventItem({ event }: { event: SimEvent }) {
  const style = SEVERITY_STYLES[event.severity] ?? SEVERITY_STYLES.info
  return (
    <div className="flex items-center gap-2 px-2 py-0.5 text-xs">
      <span className="font-mono flex-shrink-0" style={{ color: '#778899', fontSize: '10px' }}>
        {event.tick}
      </span>
      <span
        className="px-1 rounded flex-shrink-0"
        style={{
          background: style.bg,
          color: style.color,
          border: `1px solid ${style.border}`,
          fontSize: '10px',
        }}
      >
        {event.severity}
      </span>
      <span style={{ color: '#D8D6CC', fontSize: '11px' }}>{event.message}</span>
    </div>
  )
})

export const EventLog = memo(function EventLog() {
  const events = useWorldStore((s) => s.events)
  const scrollRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30
    autoScrollRef.current = atBottom
  }, [])

  useEffect(() => {
    if (autoScrollRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [events])

  const visible = events.slice(-50)

  return (
    <div
      className="h-22 flex-shrink-0 overflow-hidden"
      style={{
        background: '#0D1120',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        height: '88px',
      }}
    >
      <div
        className="text-xs font-semibold uppercase tracking-wider px-2 py-1"
        style={{ color: '#778899', fontSize: '10px' }}
      >
        Event Log
      </div>
      <div
        ref={scrollRef}
        className="overflow-y-auto"
        style={{ height: 'calc(100% - 24px)' }}
        onScroll={handleScroll}
      >
        {visible.length === 0 ? (
          <div className="text-xs px-2 py-1" style={{ color: '#778899' }}>
            Waiting for events...
          </div>
        ) : (
          visible.map((event) => <EventItem key={event.id} event={event} />)
        )}
      </div>
    </div>
  )
})
