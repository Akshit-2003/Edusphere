import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Clock3, Flame, ListTodo, LoaderCircle, Pause, Play, RotateCcw, SkipForward, Volume2 } from 'lucide-react'
import { api, ApiError, currentUserId } from '../lib/api'
import type { StudyTask } from '../types'

type Mode = 'focus' | 'short' | 'long'
type Ambient = 'quiet' | 'rain' | 'forest'

const modes: { id: Mode; label: string; mins: number; color: string; description: string }[] = [
  { id: 'focus', label: 'Focus', mins: 25, color: '#4f46e5', description: 'Deep work session' },
  { id: 'short', label: 'Short break', mins: 5, color: '#10b981', description: 'Reset your attention' },
  { id: 'long', label: 'Long break', mins: 15, color: '#0284c7', description: 'Recover and recharge' },
]
const ambience: { id: Ambient; label: string; color: string }[] = [
  { id: 'quiet', label: 'Quiet', color: '#4f46e5' },
  { id: 'rain', label: 'Rain', color: '#0ea5e9' },
  { id: 'forest', label: 'Forest', color: '#059669' },
]

interface StoredSession {
  id: number
  task_id: number | null
  duration_minutes: number
  focus_type: string
  completed_at: string
}

function remainingFrom(endAt: number | null) {
  return endAt ? Math.max(0, Math.ceil((endAt - Date.now()) / 1000)) : 0
}

function calculateStreak(sessions: StoredSession[]) {
  const focusedDays = new Set(sessions.filter(session => session.focus_type === 'focus').map(session => new Date(session.completed_at).toDateString()))
  const cursor = new Date()
  if (!focusedDays.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (focusedDays.has(cursor.toDateString())) { streak += 1; cursor.setDate(cursor.getDate() - 1) }
  return streak
}

function playCompletionChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const context = new AudioContextClass()
    const gain = context.createGain()
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.09, context.currentTime + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.85)
    gain.connect(context.destination)
    ;[0, 0.24].forEach((offset, index) => {
      const oscillator = context.createOscillator()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(index ? 784 : 523.25, context.currentTime + offset)
      oscillator.connect(gain)
      oscillator.start(context.currentTime + offset)
      oscillator.stop(context.currentTime + offset + 0.36)
    })
    window.setTimeout(() => void context.close(), 1100)
  } catch {
    // Sound is progressive enhancement; timer completion must never depend on it.
  }
}

export default function PomodoroPage() {
  const [mode, setMode] = useState<Mode>('focus')
  const [seconds, setSeconds] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [ambient, setAmbient] = useState<Ambient>('quiet')
  const [tasks, setTasks] = useState<StudyTask[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [tasksLoading, setTasksLoading] = useState(true)
  const [history, setHistory] = useState<StoredSession[]>([])
  const [todaySessions, setTodaySessions] = useState(0)
  const [todayMinutes, setTodayMinutes] = useState(0)
  const [streak, setStreak] = useState(0)
  const [loadingStats, setLoadingStats] = useState(true)
  const [logging, setLogging] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const endAtRef = useRef<number | null>(null)
  const completionStartedRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof window.setInterval> | null>(null)

  const activeMode = modes.find(item => item.id === mode) ?? modes[0]
  const activeTask = tasks.find(task => task.id === selectedTaskId) ?? null
  const focusTasks = tasks.filter(task => task.status !== 'done')

  const loadFocusData = useCallback(async () => {
    const userId = currentUserId()
    if (!userId) {
      setError('Your session has expired. Please sign in again.')
      setTasksLoading(false)
      setLoadingStats(false)
      return
    }
    setTasksLoading(true)
    setLoadingStats(true)
    setError('')
    try {
      const [storedTasks, storedSessions] = await Promise.all([
        api<StudyTask[]>(`/study-tasks/?user_id=${userId}`),
        api<StoredSession[]>(`/sessions/?user_id=${userId}`),
      ])
      const today = new Date().toDateString()
      const todayFocus = storedSessions.filter(session => session.focus_type === 'focus' && new Date(session.completed_at).toDateString() === today)
      setTasks(storedTasks)
      setHistory(storedSessions.slice(0, 8))
      setTodaySessions(todayFocus.length)
      setTodayMinutes(todayFocus.reduce((total, session) => total + session.duration_minutes, 0))
      setStreak(calculateStreak(storedSessions))
      setSelectedTaskId(previous => previous && storedTasks.some(task => task.id === previous && task.status !== 'done') ? previous : storedTasks.find(task => task.status !== 'done')?.id ?? null)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Focus data could not be loaded. Please try again.')
    } finally {
      setTasksLoading(false)
      setLoadingStats(false)
    }
  }, [])

  useEffect(() => { void loadFocusData() }, [loadFocusData])

  const finishSession = useCallback(async () => {
    playCompletionChime()
    if (mode !== 'focus') {
      setNotice(`${activeMode.label} is complete. Ready for your next focus block?`)
      setMode('focus')
      setSeconds(modes[0].mins * 60)
      return
    }
    const userId = currentUserId()
    if (!userId) { setError('Your session has expired. Please sign in again.'); return }
    setLogging(true)
    setNotice('Focus session complete — saving it to your study history…')
    try {
      const session = await api<StoredSession>('/sessions/', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, task_id: selectedTaskId, duration_minutes: activeMode.mins, focus_type: 'focus' }),
      })
      setHistory(previous => [session, ...previous].slice(0, 8))
      setTodaySessions(previous => previous + 1)
      setTodayMinutes(previous => previous + activeMode.mins)
      setStreak(previous => Math.max(1, previous))
      setNotice(selectedTaskId ? `Great work — ${activeMode.mins} minutes were logged to ${activeTask?.title ?? 'your selected task'}.` : `Great work — ${activeMode.mins} focus minutes were logged.`)
      setMode('short')
      setSeconds(modes.find(item => item.id === 'short')!.mins * 60)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'The completed focus session could not be saved. Please try again.')
      setNotice('')
    } finally {
      setLogging(false)
    }
  }, [activeMode.label, activeMode.mins, activeTask?.title, mode, selectedTaskId])

  useEffect(() => {
    if (!running) return
    const tick = () => {
      const remaining = remainingFrom(endAtRef.current)
      setSeconds(remaining)
      if (remaining === 0 && !completionStartedRef.current) {
        completionStartedRef.current = true
        endAtRef.current = null
        setRunning(false)
        void finishSession()
      }
    }
    tick()
    intervalRef.current = window.setInterval(tick, 250)
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current) }
  }, [finishSession, running])

  useEffect(() => () => { if (intervalRef.current) window.clearInterval(intervalRef.current) }, [])

  const startTimer = () => {
    if (seconds <= 0) setSeconds(activeMode.mins * 60)
    const duration = seconds <= 0 ? activeMode.mins * 60 : seconds
    completionStartedRef.current = false
    endAtRef.current = Date.now() + duration * 1000
    setRunning(true)
    setNotice('')
  }
  const pauseTimer = () => {
    setSeconds(remainingFrom(endAtRef.current))
    endAtRef.current = null
    setRunning(false)
  }
  const resetTimer = () => {
    endAtRef.current = null
    setRunning(false)
    completionStartedRef.current = false
    setSeconds(activeMode.mins * 60)
    setNotice('')
  }
  const chooseMode = (next: Mode) => {
    endAtRef.current = null
    setRunning(false)
    completionStartedRef.current = false
    setMode(next)
    setSeconds(modes.find(item => item.id === next)!.mins * 60)
    setNotice('')
  }
  const skipMode = () => chooseMode(mode === 'focus' ? 'short' : 'focus')

  const totalSeconds = activeMode.mins * 60
  const progress = Math.min(1, Math.max(0, 1 - seconds / totalSeconds))
  const circumference = 2 * Math.PI * 132
  const offset = circumference * (1 - progress)
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0')
  const secs = String(seconds % 60).padStart(2, '0')
  const ambientStyle = useMemo(() => {
    const color = ambience.find(item => item.id === ambient)?.color ?? '#4f46e5'
    return { background: `radial-gradient(circle at 50% 20%, ${color}18, transparent 42%), var(--background)` }
  }, [ambient])

  return <div className="min-h-full p-4 sm:p-6 lg:p-8" style={ambientStyle}>
    <main className="mx-auto max-w-6xl page-enter">
      <header className="mb-5 flex flex-col gap-4 rounded-2xl border p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div><p className="flex items-center gap-2 text-sm font-semibold" style={{ color: activeMode.color }}><Clock3 size={16} /> Focus studio</p><h1 className="mt-1 font-heading text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: 'var(--foreground)' }}>Make space for deep work</h1><p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>A calm Pomodoro timer that logs completed focus automatically.</p></div>
        <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>Ambient</span>{ambience.map(item => <button key={item.id} type="button" onClick={() => setAmbient(item.id)} className="rounded-lg border px-3 py-2 text-xs font-semibold transition-all" style={{ background: ambient === item.id ? `${item.color}16` : 'transparent', borderColor: ambient === item.id ? item.color : 'var(--border)', color: ambient === item.id ? item.color : 'var(--muted-foreground)' }}>{item.label}</button>)}</div>
      </header>

      {error && <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm" style={{ background: '#ef444412', borderColor: '#ef444433', color: '#b91c1c' }}><span>{error}</span><button type="button" onClick={() => void loadFocusData()} className="font-semibold underline">Retry</button></div>}
      {notice && <div className="mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm" style={{ background: 'var(--secondary-bg)', borderColor: 'var(--border)', color: 'var(--foreground)' }}><CheckCircle2 size={16} style={{ color: activeMode.color }} />{notice}</div>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="relative overflow-hidden rounded-2xl border p-5 shadow-sm sm:p-8" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="mx-auto max-w-md"><div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--muted)' }}>{modes.map(item => <button key={item.id} type="button" disabled={running} onClick={() => chooseMode(item.id)} className="flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm" style={{ background: mode === item.id ? 'var(--card)' : 'transparent', color: mode === item.id ? activeMode.color : 'var(--muted-foreground)', boxShadow: mode === item.id ? '0 1px 4px rgba(15, 23, 42, 0.08)' : undefined }}>{item.label}</button>)}</div>
            <div className="mt-8 flex flex-col items-center"><div className="relative"><div className="absolute inset-8 rounded-full blur-3xl" style={{ background: `${activeMode.color}25` }} /><svg width="310" height="310" viewBox="0 0 310 310" className="relative max-w-full"><circle cx="155" cy="155" r="132" fill="none" stroke="var(--border)" strokeWidth="10" /><circle cx="155" cy="155" r="132" fill="none" stroke={activeMode.color} strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 155 155)" style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.25s ease', filter: `drop-shadow(0 4px 8px ${activeMode.color}45)` }} /></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><p className="font-heading text-6xl font-bold tabular-nums tracking-tight sm:text-7xl" style={{ color: 'var(--foreground)' }}>{mins}:{secs}</p><p className="mt-3 text-sm font-semibold" style={{ color: activeMode.color }}>{running ? activeMode.description : activeMode.label}</p>{mode === 'focus' && <p className="mt-1 max-w-44 truncate text-center text-xs" style={{ color: 'var(--muted-foreground)' }}>{activeTask ? activeTask.title : 'No task linked'}</p>}</div></div>
              <div className="mt-8 flex items-center gap-3"><button type="button" onClick={resetTimer} disabled={logging} title="Reset timer" className="flex h-12 w-12 items-center justify-center rounded-xl border transition-all hover:-translate-y-px hover:bg-muted disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}><RotateCcw size={18} /></button><button type="button" onClick={running ? pauseTimer : startTimer} disabled={logging} className="flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg transition-all hover:scale-105 disabled:opacity-60" style={{ background: activeMode.color, color: '#fff', boxShadow: `0 10px 22px ${activeMode.color}40` }}>{running ? <Pause size={25} /> : <Play size={25} className="ml-1" />}</button><button type="button" onClick={skipMode} disabled={logging} title="Skip to next phase" className="flex h-12 w-12 items-center justify-center rounded-xl border transition-all hover:-translate-y-px hover:bg-muted disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}><SkipForward size={18} /></button></div>
              <p className="mt-4 flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted-foreground)' }}><Volume2 size={13} /> A gentle chime plays when the timer finishes.</p>
            </div></div>
        </section>

        <aside className="space-y-5"><section className="rounded-2xl border p-4 shadow-sm" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}><div className="flex items-center justify-between"><div><p className="flex items-center gap-1.5 text-sm font-bold" style={{ color: 'var(--foreground)' }}><ListTodo size={16} style={{ color: activeMode.color }} /> Link a planner task</p><p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>Completed focus time is saved against this task.</p></div></div>{tasksLoading ? <div className="mt-4 h-11 animate-pulse rounded-xl" style={{ background: 'var(--muted)' }} /> : <select disabled={running || mode !== 'focus'} value={selectedTaskId ?? ''} onChange={event => setSelectedTaskId(event.target.value ? Number(event.target.value) : null)} className="mt-4 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60" style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}><option value="">No task linked</option>{focusTasks.map(task => <option key={task.id} value={task.id}>{task.subject ? `${task.subject} · ` : ''}{task.title}</option>)}</select>}{!tasksLoading && !focusTasks.length && <p className="mt-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>No open planner tasks found. You can still start an unlinked focus session.</p>}</section>
          <section className="rounded-2xl border p-4 shadow-sm" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}><p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Today&apos;s focus</p>{loadingStats ? <div className="mt-4 grid grid-cols-3 gap-2">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-14 animate-pulse rounded-xl" style={{ background: 'var(--muted)' }} />)}</div> : <div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-xl p-2.5 text-center" style={{ background: 'var(--muted)' }}><strong className="block text-lg" style={{ color: 'var(--foreground)' }}>{todaySessions}</strong><span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>Sessions</span></div><div className="rounded-xl p-2.5 text-center" style={{ background: 'var(--muted)' }}><strong className="block text-lg" style={{ color: 'var(--foreground)' }}>{todayMinutes}m</strong><span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>Focused</span></div><div className="rounded-xl p-2.5 text-center" style={{ background: 'var(--muted)' }}><strong className="flex items-center justify-center gap-1 text-lg" style={{ color: '#f59e0b' }}><Flame size={15} />{streak}</strong><span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>Day streak</span></div></div>}</section></aside>
      </div>

      <section className="mt-5 rounded-2xl border p-4 shadow-sm" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}><div className="flex items-center justify-between"><div><h2 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Recent focus history</h2><p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>Saved sessions also update your dashboard and analytics streaks.</p></div>{logging && <LoaderCircle size={17} className="animate-spin" style={{ color: activeMode.color }} />}</div><div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{loadingStats ? Array.from({ length: 4 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-xl" style={{ background: 'var(--muted)' }} />) : history.length ? history.map(session => <div key={session.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--background)' }}><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold capitalize" style={{ color: session.focus_type === 'focus' ? '#4f46e5' : '#10b981' }}>{session.focus_type} session</span><span className="rounded-md px-1.5 py-0.5 text-xs font-mono" style={{ background: 'var(--muted)', color: 'var(--foreground)' }}>{session.duration_minutes}m</span></div><p className="mt-2 truncate text-xs" style={{ color: 'var(--muted-foreground)' }}>{session.task_id ? tasks.find(task => task.id === session.task_id)?.title ?? 'Linked planner task' : 'Unlinked focus time'}</p><p className="mt-1 text-[10px]" style={{ color: 'var(--muted-foreground)' }}>{new Date(session.completed_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</p></div>) : <div className="rounded-xl border border-dashed p-4 text-sm sm:col-span-2 xl:col-span-4" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>Your completed focus sessions will appear here.</div>}</div></section>
    </main>
  </div>
}
