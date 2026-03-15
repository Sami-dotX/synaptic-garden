import { useEffect } from 'react'
import { TopBar } from './components/TopBar'
import { ControlPanel } from './components/ControlPanel'
import { WorldCanvas } from './components/WorldCanvas'
import { AnalyticsPanel } from './components/AnalyticsPanel'
import { EventLog } from './components/EventLog'
import { AgentInspector } from './components/AgentInspector'
import { AIChat } from './components/AIChat'
import { useWorldStore } from './store/worldStore'

export default function App() {
  const initWorker = useWorldStore((s) => s.initWorker)

  useEffect(() => {
    initWorker()
  }, [initWorker])

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#080B14', color: '#D8D6CC' }}>
      <TopBar />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <ControlPanel />
        <WorldCanvas />
        <AnalyticsPanel />
      </div>
      <EventLog />
      <AgentInspector />
      <AIChat />
    </div>
  )
}
