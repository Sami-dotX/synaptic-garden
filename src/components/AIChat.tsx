import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { useWorldStore } from '../store/worldStore'
import type { WorldParams, RoleConfig, WorldMetrics, WorkerSnapshot } from '../simulation/types'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AIAction {
  action: 'setParams' | 'loadPreset' | 'injectEvent' | 'setRoles' | 'reset'
  params?: Partial<WorldParams>
  name?: string
  eventType?: string
  roles?: RoleConfig[]
}

function computeRoleSnapshot(snapshot: WorkerSnapshot | null, roles: RoleConfig[]): string {
  if (!snapshot || !snapshot.roles) return 'No snapshot available yet.'
  const n = snapshot.agentCount
  const roleData: Record<string, { count: number; totalAct: number; totalEn: number; totalFat: number; totalVal: number }> = {}
  for (let i = 0; i < n; i++) {
    const rIdx = snapshot.agentRole[i]
    const label = roles[rIdx]?.label ?? `role_${rIdx}`
    if (!roleData[label]) roleData[label] = { count: 0, totalAct: 0, totalEn: 0, totalFat: 0, totalVal: 0 }
    const d = roleData[label]
    d.count++
    d.totalAct += snapshot.agentActivity[i]
    d.totalEn += snapshot.agentEnergy[i]
    d.totalFat += snapshot.agentFatigue[i]
    d.totalVal += snapshot.agentValence[i]
  }
  const lines = Object.entries(roleData).map(([label, d]) => {
    const avg = (v: number) => (d.count > 0 ? (v / d.count).toFixed(3) : '0')
    return `  ${label} (n=${d.count}): activity=${avg(d.totalAct)}, capital=${avg(d.totalEn)}, stress=${avg(d.totalFat)}, sentiment=${avg(d.totalVal)}`
  })
  return lines.join('\n')
}

const buildSystemPrompt = (
  params: WorldParams,
  metrics: WorldMetrics,
  roles: RoleConfig[],
  snapshot: WorkerSnapshot | null,
): string => {
  const roleSnapshot = computeRoleSnapshot(snapshot, roles)
  const events = snapshot?.events?.slice(-5).map((e) => `[${e.tick}] ${e.severity}: ${e.message}`).join('\n  ') ?? 'none'

  return `You are an AI assistant for Synaptic Garden, a multi-agent simulation platform. You help users understand and configure simulations.

CURRENT SIMULATION STATE:

Parameters:
${JSON.stringify(params, null, 2)}

Global Metrics:
- Tick: ${metrics.tick}
- Sectors (clusters): ${metrics.clusterCount}
- Volatility (avg activity): ${metrics.avgActivity.toFixed(4)}
- Disorder (entropy): ${metrics.entropy.toFixed(3)}
- Counterparties (active links): ${metrics.activeLinkCount}
- FPS: ${metrics.fps}

Per-Role Metrics (real-time averages):
${roleSnapshot}

Recent Events:
  ${events}

Role Definitions:
${roles.map((r) => `  ${r.label}: speed=${r.speed}, conformity=${r.conformity}, fatigueMult=${r.fatigueMultiplier}, noiseMult=${r.noiseMultiplier}, excitatoryBias=${r.excitatoryBias}`).join('\n')}

ACTIONS - Include a JSON block to execute:
\`\`\`json
{"action": "setParams", "params": {"noiseLevel": 0.5}}
\`\`\`

Available:
- {"action": "setParams", "params": {...}} - modify simulation parameters
- {"action": "loadPreset", "name": "cooperativeColony"|"competitiveSwarm"|"fragileEcosystem"|"financialContagion"}
- {"action": "injectEvent", "eventType": "energy_burst"|"noise_shock"|"freeze"|"kill_weak"}
- {"action": "reset"}
- {"action": "setRoles", "roles": [...]} - redefine agent roles entirely

INSTRUCTIONS:
- Respond in the same language as the user
- Be concise but insightful
- When interpreting metrics, explain what they mean in context of the active roles
- Use financial/domain terminology matching the role names (e.g. "Oil Traders are under stress" not "agents with role 0")
- When the user asks "what's happening", analyze the per-role metrics and recent events to give a narrative
- You can chain multiple actions in one response`
}

const extractAndExecuteActions = (
  content: string,
  actions: {
    setParams: (partial: Partial<WorldParams>) => void
    loadPreset: (name: string) => void
    injectEvent: (eventType: string) => void
    reset: () => void
    setRoles: (roles: RoleConfig[]) => void
  },
): void => {
  const jsonBlockRegex = /```json\s*\n?([\s\S]*?)\n?\s*```/g
  let match = jsonBlockRegex.exec(content)

  while (match !== null) {
    try {
      const parsed: AIAction = JSON.parse(match[1])

      switch (parsed.action) {
        case 'setParams':
          if (parsed.params) {
            actions.setParams(parsed.params)
          }
          break
        case 'loadPreset':
          if (parsed.name) {
            actions.loadPreset(parsed.name)
          }
          break
        case 'injectEvent':
          if (parsed.eventType) {
            actions.injectEvent(parsed.eventType)
          }
          break
        case 'reset':
          actions.reset()
          break
        case 'setRoles':
          if (parsed.roles) {
            actions.setRoles(parsed.roles)
          }
          break
      }
    } catch {
      // Silently skip malformed JSON blocks
    }

    match = jsonBlockRegex.exec(content)
  }
}

const ChatBubble = memo(({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className="max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words"
        style={{
          backgroundColor: isUser ? '#1A2450' : '#0A0F1E',
          color: '#D8D6CC',
        }}
      >
        {message.content}
      </div>
    </div>
  )
})

ChatBubble.displayName = 'ChatBubble'

const LoadingDots = memo(() => (
  <div className="flex justify-start mb-2">
    <div
      className="rounded-lg px-3 py-2 text-sm"
      style={{ backgroundColor: '#0A0F1E', color: '#8888AA' }}
    >
      <span className="inline-flex gap-1">
        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
      </span>
    </div>
  </div>
))

LoadingDots.displayName = 'LoadingDots'

const AIChat = memo(() => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const params = useWorldStore((s) => s.params)
  const metrics = useWorldStore((s) => s.metrics)
  const setParams = useWorldStore((s) => s.setParams)
  const loadPreset = useWorldStore((s) => s.loadPreset)
  const injectEvent = useWorldStore((s) => s.injectEvent)
  const reset = useWorldStore((s) => s.reset)
  const setRoles = useWorldStore((s) => s.setRoles)

  const roles = params.roles
  const worldDataRef = useWorldStore((s) => s.worldDataRef)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMessage: ChatMessage = { role: 'user', content: trimmed }
    const updatedMessages = [...messages, userMessage]

    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined

    if (!apiKey) {
      setMessages([
        ...updatedMessages,
        {
          role: 'assistant',
          content: 'Error: VITE_ANTHROPIC_API_KEY is not set. Please add it to your .env file.',
        },
      ])
      setIsLoading(false)
      return
    }

    const snapshot = worldDataRef.current as WorkerSnapshot | null
    const systemPrompt = buildSystemPrompt(params, metrics, roles, snapshot)

    const apiMessages = updatedMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          messages: apiMessages,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`API error ${response.status}: ${errorBody}`)
      }

      const data = await response.json()
      const assistantContent =
        data.content
          ?.filter((block: { type: string }) => block.type === 'text')
          .map((block: { text: string }) => block.text)
          .join('\n') ?? 'No response received.'

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: assistantContent,
      }

      setMessages([...updatedMessages, assistantMessage])

      extractAndExecuteActions(assistantContent, {
        setParams,
        loadPreset,
        injectEvent,
        reset,
        setRoles,
      })
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unexpected error occurred.'

      setMessages([
        ...updatedMessages,
        {
          role: 'assistant',
          content: `Error: ${errorMessage}`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages, params, metrics, roles, worldDataRef, setParams, loadPreset, injectEvent, reset, setRoles])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
    },
    [sendMessage],
  )

  return (
    <>
      {/* Toggle button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed z-50 px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 hover:scale-105"
          style={{
            bottom: '5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#1A2450',
            border: '1px solid #3344AA',
            color: '#D8D6CC',
          }}
        >
          AI Assistant
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed z-50 flex flex-col rounded-xl overflow-hidden"
          style={{
            bottom: '5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '500px',
            height: '350px',
            backgroundColor: '#0D1120',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-2 shrink-0"
            style={{
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <span className="text-sm font-medium" style={{ color: '#D8D6CC' }}>
              AI Assistant
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-sm px-2 py-0.5 rounded hover:opacity-80 transition-opacity"
              style={{ color: '#8888AA' }}
              aria-label="Close AI chat panel"
            >
              &times;
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
            {messages.length === 0 && !isLoading && (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs" style={{ color: '#555577' }}>
                  Ask about the simulation, request parameter changes, or explore scenarios.
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <ChatBubble key={i} message={msg} />
            ))}
            {isLoading && <LoadingDots />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className="flex items-center gap-2 px-3 py-2 shrink-0"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the AI assistant..."
              disabled={isLoading}
              className="flex-1 px-3 py-1.5 text-sm rounded-lg outline-none placeholder-gray-600 disabled:opacity-50"
              style={{
                backgroundColor: '#0A0F1E',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#D8D6CC',
              }}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="px-3 py-1.5 text-sm font-medium rounded-lg transition-opacity disabled:opacity-40 hover:opacity-90"
              style={{
                backgroundColor: '#5566CC',
                color: '#FFFFFF',
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  )
})

AIChat.displayName = 'AIChat'

export { AIChat }
