import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react'
import { api, currentUserId } from '../lib/api'

type Mode = 'focus' | 'short' | 'long'
const modes: { id: Mode; label: string; mins: number }[] = [
  { id: 'focus', label: 'Focus', mins: 25 },
  { id: 'short', label: 'Short Break', mins: 5 },
  { id: 'long', label: 'Long Break', mins: 15 },
]

interface StoredSession {
  id: number
  duration_minutes: number
  focus_type: string
  completed_at: string
}

export default function PomodoroPage() {
  const [mode, setMode] = useState<Mode>('focus')
  const [running, setRunning] = useState(false)
  const [seconds, setSeconds] = useState(25 * 60)
  const [sessions, setSessions] = useState(0)
  const [todayMinutes, setTodayMinutes] = useState(0)
  const [history, setHistory] = useState<StoredSession[]>([])
  const [error, setError] = useState('')
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const mins = modes.find(m => m.id === mode)!.mins
    setSeconds(mins * 60)
    setRunning(false)
  }, [mode])

  useEffect(() => {
    const userId = currentUserId()
    if (!userId) { setError('Your session has expired. Please sign in again.'); return }
    api<StoredSession[]>(`/sessions/?user_id=${userId}`).then(data => {
      const today = new Date().toDateString()
      const todaySessions = data.filter(session => new Date(session.completed_at).toDateString() === today)
      setHistory(data.slice(0, 6))
      setSessions(todaySessions.length)
      setTodayMinutes(todaySessions.reduce((total, session) => total + session.duration_minutes, 0))
    }).catch(() => setError('Focus-session history could not be loaded.'))
  }, [])

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            setRunning(false)
            const userId = currentUserId()
            if (userId && mode === 'focus') {
              const duration = modes.find(m => m.id === mode)!.mins
              api<StoredSession>('/sessions/', { method: 'POST', body: JSON.stringify({ user_id: userId, duration_minutes: duration, focus_type: mode }) })
                .then(session => {
                  setHistory(previous => [session, ...previous].slice(0, 6))
                  setSessions(count => count + 1)
                  setTodayMinutes(minutes => minutes + duration)
                })
                .catch(() => setError('The completed focus session could not be saved. Please try again.'))
            }
            return 0
          }
          return s - 1
        })
      }, 1000)
    } else {
      if (ref.current) clearInterval(ref.current)
    }
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [running, mode])

  const totalSecs = modes.find(m => m.id === mode)!.mins * 60
  const progress = 1 - seconds / totalSecs
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0')
  const secs = String(seconds % 60).padStart(2, '0')
  const circumference = 2 * Math.PI * 110
  const offset = circumference * (1 - progress)

  const reset = () => { setSeconds(modes.find(m => m.id === mode)!.mins * 60); setRunning(false) }

  const modeColor = mode === 'focus' ? '#4f46e5' : mode === 'short' ? '#10b981' : '#3b82f6'

  return (
    <div className="p-6 max-w-lg mx-auto page-enter">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>Focus Timer</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Stay in the zone with Pomodoro technique</p>
      </div>
      {error && <p className="mb-5 rounded-lg px-3 py-2 text-sm" style={{ background: '#ef444415', color: '#dc2626' }}>{error}</p>}

      {/* Mode selector */}
      <div className="flex gap-2 justify-center mb-10 p-1 rounded-xl" style={{ background: 'var(--muted)' }}>
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: mode === m.id ? 'var(--card)' : 'transparent',
              color: mode === m.id ? 'var(--foreground)' : 'var(--muted-foreground)',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Timer circle */}
      <div className="flex items-center justify-center mb-10">
        <div className="relative">
          <svg width="260" height="260" viewBox="0 0 260 260">
            {/* Track */}
            <circle cx="130" cy="130" r="110" fill="none" stroke="var(--border)" strokeWidth="8" />
            {/* Progress */}
            <circle
              cx="130" cy="130" r="110" fill="none"
              stroke={modeColor} strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 130 130)"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-5xl font-heading font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{mins}:{secs}</div>
            <div className="text-sm mt-2 font-medium" style={{ color: modeColor }}>{modes.find(m => m.id === mode)!.label}</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mb-10">
        <button onClick={reset} className="w-12 h-12 rounded-xl flex items-center justify-center border hover:bg-muted transition-all" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
          <RotateCcw size={18} />
        </button>
        <button
          onClick={() => setRunning(!running)}
          className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all hover:scale-105"
          style={{ background: modeColor, color: '#fff' }}
        >
          {running ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
        </button>
        <button onClick={() => { setMode(mode === 'focus' ? 'short' : 'focus') }} className="w-12 h-12 rounded-xl flex items-center justify-center border hover:bg-muted transition-all" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
          <SkipForward size={18} />
        </button>
      </div>

      {/* Today's stats */}
      <div className="rounded-xl border p-5 mb-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--foreground)' }}>Today's Focus</h3>
        <div className="flex gap-6">
          <div>
            <div className="text-2xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>{sessions}</div>
            <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Sessions</div>
          </div>
          <div>
            <div className="text-2xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>{todayMinutes}m</div>
            <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Total Focus</div>
          </div>
          <div>
            <div className="text-2xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>{new Set(history.map(session => session.focus_type)).size}</div>
            <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Focus types</div>
          </div>
        </div>
      </div>

      {/* Session history */}
      <div>
        <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--foreground)' }}>Session History</h3>
        <div className="space-y-2">
          {history.length ? history.map(session => (
            <div key={session.id} className="flex items-center gap-3 p-3 rounded-lg border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: '#4f46e5' }} />
              <div className="flex-1 text-sm font-medium capitalize" style={{ color: 'var(--foreground)' }}>{session.focus_type} session</div>
              <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{new Date(session.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              <div className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: 'var(--muted)', color: 'var(--foreground)' }}>{session.duration_minutes}m</div>
            </div>
          )) : <p className="text-sm p-3 rounded-lg border" style={{ color: 'var(--muted-foreground)', borderColor: 'var(--border)' }}>No focus sessions recorded yet.</p>}
        </div>
      </div>
    </div>
  )
}
