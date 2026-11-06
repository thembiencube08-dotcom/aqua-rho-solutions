import { useState, useRef, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMicroscope, faFlask, faDroplet, faEgg, faBolt,
  faComments, faWandMagicSparkles, faGear, faTrash, faXmark,
} from '@fortawesome/free-solid-svg-icons'
import type { Site, WaterBalanceInput } from '../types'
import type { DemandInput } from '../lib/demand'
import { getAiResponse, type AiChatMessage } from '../lib/aiAssistant'

interface Props {
  sites: Site[]
  activeSite: Site | null
  water: WaterBalanceInput
  demand: DemandInput
  view: 'dashboard' | 'site' | 'demand' | 'balance' | 'weather' | 'news' | 'map' | 'settings'
  onNavigate: (view: 'dashboard' | 'site' | 'demand' | 'balance' | 'weather' | 'news' | 'map' | 'settings') => void
}

const QUICK_PROMPTS: { icon: typeof faMicroscope; label: string }[] = [
  { icon: faMicroscope,          label: 'Diagnose active water source' },
  { icon: faFlask,               label: 'How to calculate alum dose?' },
  { icon: faDroplet,             label: 'Ways to reduce non-revenue water' },
  { icon: faEgg,                 label: 'Why does my water smell like rotten eggs?' },
  { icon: faBolt,                label: 'How to adjust acidic pH?' },
]

export default function AiPromptBar({
  sites,
  activeSite,
  water,
  demand,
  view,
  onNavigate,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'welcome_1',
      sender: 'assistant',
      text: `Hello! I am your **AquaRho Water Engineering Assistant**. Ask me any question about water quality, treatment chemical dosages, borehole issues, non-revenue water, or irrigation.`,
      highlights: [
        'Type your own custom question in the chat box below.',
        'Supports stoichiometric dosing calculations, WHO standards, and troubleshooting.',
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [isThinking, setIsThinking] = useState(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState(() => localStorage.getItem('aquarho.gemini_api_key') || '')

  const [expanded, setExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
  )

  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const dockInputRef = useRef<HTMLInputElement>(null)

  // On mobile the launcher opens the chat sheet directly (the inline dock input
  // is awkward with the on-screen keyboard); on desktop it expands to the dock.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const handler = () => setIsMobile(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const showDock = expanded && !isMobile && !isOpen
  const showLauncher = !isOpen && !showDock

  // Focus input when chat window opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        chatInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, isThinking])

  async function handleSend(textToSend?: string) {
    const query = (textToSend ?? inputText).trim()
    if (!query || isThinking) return

    const userMsg: AiChatMessage = {
      id: 'user_' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputText('')
    setIsOpen(true)
    setIsThinking(true)

    try {
      const response = await getAiResponse(query, {
        sites,
        activeSite,
        water,
        demand,
        view,
      })
      setMessages((prev) => [...prev, response])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          sender: 'assistant',
          text: 'Encountered an issue processing that query. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setIsThinking(false)
    }
  }

  function handleSaveApiKey() {
    if (apiKeyInput.trim()) {
      localStorage.setItem('aquarho.gemini_api_key', apiKeyInput.trim())
    } else {
      localStorage.removeItem('aquarho.gemini_api_key')
    }
    setShowApiKeyModal(false)
  }

  return (
    <>
      {/* ── Compact AI launcher (default, low prominence) ──────────────────────── */}
      {showLauncher && (
        <button
          type="button"
          className="ai-launcher"
          onClick={() => (isMobile ? setIsOpen(true) : setExpanded(true))}
          aria-label="Ask the AquaRho water assistant"
        >
          <span className="ai-launcher-ico"><FontAwesomeIcon icon={faDroplet} /></span>
          <span className="ai-launcher-label">Ask AI</span>
        </button>
      )}

      {/* ── Expanded prompt dock (desktop, after opening the launcher) ──────────── */}
      {showDock && (
        <div className="ai-dock-container">
          {/* Suggestion Chips */}
          <div className="ai-chips-strip">
            {QUICK_PROMPTS.slice(0, 3).map((p, i) => (
              <button
                key={i}
                type="button"
                className="ai-chip-pill"
                onClick={() => handleSend(p.label)}
              >
                <FontAwesomeIcon icon={p.icon} style={{ marginRight: 5, opacity: 0.7 }} />
                {p.label}
              </button>
            ))}
          </div>

          {/* Dock Input Bar */}
          <div className="ai-prompt-bar">
            <button
              type="button"
              className="ai-brand-pill-btn"
              onClick={() => setIsOpen(true)}
              title="Open AquaRho Water Chat"
              aria-label="Open AI chat"
            >
              <span className="ai-sparkle-icon"><FontAwesomeIcon icon={faComments} /></span>
              <span className="ai-pill-text">Chat with AI</span>
              <span className="ai-pill-status" />
            </button>

            <div className="ai-input-wrapper">
              <input
                ref={dockInputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Ask anything (e.g. 'How do I lower pH?', 'Is well water safe?')..."
                className="ai-text-input"
                aria-label="Type your water question"
              />
            </div>

            <button
              type="button"
              className={`ai-send-btn ${inputText.trim() ? 'has-input' : ''}`}
              onClick={() => handleSend()}
              disabled={!inputText.trim() || isThinking}
              title="Send question to AI"
              aria-label="Send question"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>

            <button
              type="button"
              className="ai-dock-collapse"
              onClick={() => setExpanded(false)}
              aria-label="Collapse assistant"
              title="Hide"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>
      )}

      {/* ── Open Conversational Chat Window ────────────────────────────────────── */}
      {isOpen && (
        <div className="ai-chat-window-container">
          <div className="ai-chat-window">
            {/* Header */}
            <div className="ai-chat-header">
              <div className="ai-chat-header-title">
                <div className="ai-sparkle-badge">
                  <FontAwesomeIcon icon={faDroplet} />
                </div>
                <div>
                  <div className="ai-header-name">AquaRho AI Water Chat</div>
                  <div className="ai-header-sub">
                    {activeSite ? `Active Source: ${activeSite.name}` : 'Water Engineering Intelligence'}
                  </div>
                </div>
              </div>

              <div className="ai-header-actions">
                <button
                  type="button"
                  className="ai-icon-action-btn"
                  onClick={() => setShowApiKeyModal(true)}
                  title="Configure Gemini Cloud API Key (Optional)"
                >
                  <FontAwesomeIcon icon={faGear} />
                </button>
                <button
                  type="button"
                  className="ai-icon-action-btn"
                  onClick={() =>
                    setMessages([
                      {
                        id: 'cleared_' + Date.now(),
                        sender: 'assistant',
                        text: 'Chat cleared. Ask me any question!',
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      },
                    ])
                  }
                  title="Clear conversation"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
                <button
                  type="button"
                  className="ai-icon-action-btn close-btn"
                  onClick={() => setIsOpen(false)}
                  title="Close chat"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
            </div>

            {/* Chat Messages Scrollable Body */}
            <div className="ai-chat-messages">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`ai-message-row ${msg.sender === 'user' ? 'from-user' : 'from-ai'}`}
                >
                  {msg.sender === 'assistant' && (
                    <div className="ai-avatar-icon"><FontAwesomeIcon icon={faWandMagicSparkles} /></div>
                  )}

                  <div className="ai-message-content">
                    <div className="ai-message-bubble">
                      <div className="ai-message-text" style={{ whiteSpace: 'pre-line' }}>
                        {msg.text}
                      </div>

                      {/* Highlights */}
                      {msg.highlights && msg.highlights.length > 0 && (
                        <div className="ai-highlights-box">
                          {msg.highlights.map((h, i) => (
                            <div key={i} className="ai-highlight-item">
                              <span className="bullet">•</span>
                              <span>{h}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Metrics */}
                      {msg.metrics && msg.metrics.length > 0 && (
                        <div className="ai-metrics-grid">
                          {msg.metrics.map((m, i) => (
                            <div key={i} className="ai-metric-tag">
                              <span className="lbl">{m.label}</span>
                              <span className={`val ${m.badge || ''}`}>{m.value}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Step-by-Step Procedure */}
                      {msg.steps && msg.steps.length > 0 && (
                        <div className="ai-procedure-card">
                          <div className="ai-procedure-title">Recommended Actions</div>
                          {msg.steps.map((st, i) => (
                            <div key={i} className="ai-proc-step">
                              <strong>{st.title}</strong>
                              <p>{st.desc}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action CTA */}
                      {msg.suggestedAction && (
                        <div className="ai-nav-cta">
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => {
                              if (msg.suggestedAction) {
                                onNavigate(msg.suggestedAction.view)
                                setIsOpen(false)
                              }
                            }}
                          >
                            {msg.suggestedAction.label} →
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="ai-message-time">{msg.timestamp}</div>
                  </div>
                </div>
              ))}

              {isThinking && (
                <div className="ai-message-row from-ai">
                  <div className="ai-avatar-icon"><FontAwesomeIcon icon={faWandMagicSparkles} /></div>
                  <div className="ai-message-bubble ai-thinking-bubble">
                    <div className="ai-typing-indicator">
                      <span />
                      <span />
                      <span />
                    </div>
                    <span className="muted small">Thinking & evaluating water engineering rules...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* In-Chat Quick Suggestions (Scrollable) */}
            <div className="ai-chat-quick-strip">
              <span className="ai-quick-lbl">Suggestions:</span>
              {QUICK_PROMPTS.slice(0, 3).map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="ai-quick-bubble-btn"
                  onClick={() => handleSend(qp.label)}
                >
                  <FontAwesomeIcon icon={qp.icon} style={{ marginRight: 5, opacity: 0.7 }} />
                  {qp.label}
                </button>
              ))}
            </div>

            {/* In-Chat Text Input Bar (Ready for user typing) */}
            <div className="ai-chat-input-area">
              <input
                ref={chatInputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Type your own question here and press Enter..."
                className="ai-chat-field"
                aria-label="Type your water question"
              />
              <button
                type="button"
                className="ai-chat-send-btn"
                onClick={() => handleSend()}
                disabled={!inputText.trim() || isThinking}
                title="Send"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Optional Gemini Cloud API Key Modal ──────────────────────────────── */}
      {showApiKeyModal && (
        <div className="brand-modal-backdrop" onClick={() => setShowApiKeyModal(false)}>
          <div className="brand-modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="brand-modal-header">
              <div>
                <div className="brand-modal-subtitle">AI Provider</div>
                <h3 style={{ margin: 0 }}>Optional Cloud Gemini Key</h3>
              </div>
              <button className="brand-modal-close" onClick={() => setShowApiKeyModal(false)}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <div className="brand-modal-body" style={{ gap: 14 }}>
              <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
                AquaRho includes an offline expert water intelligence engine that works automatically without any setup.
              </p>
              <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
                If you prefer to connect live Google Gemini cloud intelligence, paste your free Google AI Studio key below:
              </p>
              <div>
                <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, marginBottom: 4 }}>
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div className="brand-modal-footer">
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => {
                  setApiKeyInput('')
                  localStorage.removeItem('aquarho.gemini_api_key')
                  setShowApiKeyModal(false)
                }}
              >
                Clear Key
              </button>
              <button type="button" className="btn sm" onClick={handleSaveApiKey}>
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
