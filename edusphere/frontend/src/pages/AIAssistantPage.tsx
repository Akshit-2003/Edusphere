import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, FileText, CreditCard, HelpCircle, BookOpen, Map } from 'lucide-react'
import { api, currentUserId } from '../lib/api'

interface Message {
  role: 'user' | 'ai'
  content: string
  sources?: string[]
}

const quickActions = [
  { icon: FileText, label: 'Summarize Notes' },
  { icon: HelpCircle, label: 'Generate Quiz' },
  { icon: CreditCard, label: 'Generate Flashcards' },
  { icon: BookOpen, label: 'Explain Topic' },
  { icon: Map, label: 'Create Study Plan' },
]

interface StoredMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    const userId = currentUserId()
    if (!userId) return
    api<StoredMessage[]>(`/assistant/messages/?user_id=${userId}`)
      .then(stored => setMessages(stored.map(message => ({
        role: message.role === 'assistant' ? 'ai' : 'user',
        content: message.content,
      }))))
      .catch(console.error)
  }, [])

  const send = async (text?: string) => {
    const msg = text || input.trim()
    const userId = currentUserId()
    if (!msg || !userId) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const response = await api<{ assistant_message: StoredMessage }>('/assistant/messages/', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, content: msg }),
      })
      setMessages(prev => [...prev, { role: 'ai', content: response.assistant_message.content }])
    } catch (error) {
      console.error('Unable to save assistant message:', error)
      setMessages(prev => [...prev, { role: 'ai', content: 'Your message could not be saved. Please check that the backend is running.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b shrink-0 flex items-center gap-3" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)' }}>
          <Sparkles size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-lg" style={{ color: 'var(--foreground)' }}>EduSphere AI</h1>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Your personal study assistant · Context-aware · Powered by your notes</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full" style={{ background: '#10b98120', color: '#10b981' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          Online
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: m.role === 'ai' ? 'var(--accent)' : 'var(--primary)' }}
            >
              {m.role === 'ai' ? <Bot size={16} className="text-white" /> : <User size={16} className="text-white" />}
            </div>
            <div className={`max-w-xl ${m.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
              <div
                className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                style={{
                  background: m.role === 'user' ? 'var(--primary)' : 'var(--card)',
                  color: m.role === 'user' ? '#fff' : 'var(--foreground)',
                  border: m.role === 'ai' ? '1px solid var(--border)' : 'none',
                  borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                }}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
              {m.sources && (
                <div className="flex flex-col gap-1.5">
                  <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Sources:</div>
                  <div className="flex flex-wrap gap-2">
                    {m.sources.map(s => (
                      <div key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                        <FileText size={11} style={{ color: 'var(--primary)' }} />
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
              <Bot size={16} className="text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)', borderRadius: '4px 18px 18px 18px' }}>
              <div className="flex gap-1.5 items-center py-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick actions */}
      <div className="px-6 pb-2 flex gap-2 overflow-x-auto shrink-0">
        {quickActions.map(({ icon: Icon, label }) => (
          <button
            key={label}
            onClick={() => send(label)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap hover:border-primary/50 transition-all shrink-0"
            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
          >
            <Icon size={13} style={{ color: 'var(--accent)' }} />
            {label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Ask about your notes, request summaries, quizzes..."
            className="flex-1 px-4 py-3 rounded-xl border outline-none transition-all focus:border-primary text-sm"
            style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="w-11 h-11 rounded-xl flex items-center justify-center transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            <Send size={17} />
          </button>
        </div>
      </div>
    </div>
  )
}
