import { useState, useEffect } from 'react'
import { Flame, Clock, CheckSquare, BookOpen, Bot, ChevronRight, Calendar, Zap, ArrowUpRight, BarChart2, PlayCircle } from 'lucide-react'
import type { Page } from '../types'
import { api, currentUserId } from '../lib/api'

interface DashboardTask {
  id: number
  title: string
  subject: string | null
  priority: 'low' | 'medium' | 'high'
  status: string
  due_at: string | null
}

interface DashboardEvent {
  id: number
  title: string
  starts_at: string
  event_type: string
}

interface DashboardDocument {
  id: number
  title: string
  folder: string
  updated_at: string
}

interface DashboardWorkspace {
  title: string
  documents: number
  updated_at: string
}

interface DashboardActivity {
  action: string
  occurred_at: string
}

interface DashboardData {
  full_name: string
  study_streak: number
  tasks_completed: number
  tasks_total: number
  focus_minutes: number
  flashcards: number
  flashcards_due: number
  tasks: DashboardTask[]
  upcoming_events: DashboardEvent[]
  recent_documents: DashboardDocument[]
  workspaces: DashboardWorkspace[]
  recent_activity: DashboardActivity[]
}

type CachedDashboard = { savedAt: number; data: DashboardData }
const dashboardCacheLifetime = 5 * 60 * 1000

function dashboardCacheKey(userId: number) {
  return `edusphere.dashboard.v2.${userId}`
}

function readCachedDashboard(userId: number): DashboardData | null {
  try {
    const stored = localStorage.getItem(dashboardCacheKey(userId))
    if (!stored) return null
    const cached = JSON.parse(stored) as CachedDashboard
    return cached.data && Date.now() - cached.savedAt < dashboardCacheLifetime ? cached.data : null
  } catch {
    return null
  }
}

function storeCachedDashboard(userId: number, data: DashboardData) {
  try {
    localStorage.setItem(dashboardCacheKey(userId), JSON.stringify({ savedAt: Date.now(), data }))
  } catch {
    // Caching only improves perceived speed; live API data is still authoritative.
  }
}

/**
 * Replays a short count-up animation whenever the live value from the API
 * changes. Keeping the target as `null` while loading prevents a misleading
 * zero from appearing before the dashboard data is ready.
 */
function useCountUp(target: number | null, duration = 850): number {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (target === null) {
      setValue(0)
      return
    }

    const endValue = Math.max(0, Math.round(target))
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion || endValue === 0) {
      setValue(endValue)
      return
    }

    let animationFrame = 0
    let startTime: number | null = null
    setValue(0)

    const tick = (timestamp: number) => {
      if (startTime === null) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      // Ease out so the counter feels quick at first and settles naturally.
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(endValue * easedProgress))

      if (progress < 1) animationFrame = window.requestAnimationFrame(tick)
    }

    animationFrame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [target, duration])

  return value
}

function AnimatedNumber({
  value,
  format = String,
}: {
  value: number | null
  format?: (value: number) => string
}) {
  const displayedValue = useCountUp(value)
  return <>{value === null ? '—' : format(displayedValue)}</>
}

function AnimatedFraction({ completed, total }: { completed: number | null, total: number | null }) {
  const displayedCompleted = useCountUp(completed)
  const displayedTotal = useCountUp(total)

  if (completed === null || total === null) return <>—</>
  return <>{displayedCompleted}/{displayedTotal}</>
}

function MetricSkeleton({ width = 'w-20' }: { width?: string }) {
  return <span aria-label="Loading metric" className={`inline-block h-8 ${width} rounded-lg animate-pulse align-middle`} style={{ background: 'var(--muted)' }} />
}

const priorityColor: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' }
const workspaceColors = ['#4f46e5', '#10b981', '#f59e0b', '#8b5cf6']

function formatFocusTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (!hours) return `${remainingMinutes}m`
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

function formatDate(value: string | null): string {
  if (!value) return 'No deadline'
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatRelativeTime(value: string): string {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  if (elapsedMinutes < 1) return 'Just now'
  if (elapsedMinutes < 60) return `${elapsedMinutes} min ago`
  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) return `${elapsedHours}h ago`
  return `${Math.floor(elapsedHours / 24)}d ago`
}

export default function DashboardPage({ setPage }: { setPage: (p: Page) => void }) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const isInitialLoad = loading && !dashboard

  useEffect(() => {
    const userId = currentUserId()
    if (!userId) {
      setLoadError('Your session is unavailable. Please sign in again.')
      setLoading(false)
      return
    }

    let cancelled = false
    const cached = readCachedDashboard(userId)
    if (cached) {
      setDashboard(cached)
      setLoading(false)
    } else {
      setLoading(true)
    }
    setLoadError('')
    api<DashboardData>(`/dashboard/${userId}`)
      .then(data => {
        if (!cancelled) {
          setDashboard(data)
          storeCachedDashboard(userId, data)
        }
      })
      .catch(() => {
        if (!cancelled && !cached) setLoadError('Could not load your dashboard data. Please check that the backend is running.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const toggleTask = async (task: DashboardTask) => {
    if (!dashboard) return
    const nextStatus = task.status === 'done' ? 'todo' : 'done'
    const before = dashboard
    const completedChange = nextStatus === 'done' ? 1 : -1
    setDashboard(previous => {
      if (!previous) return previous
      const updated = {
        ...previous,
        tasks: previous.tasks.map(item => item.id === task.id ? { ...item, status: nextStatus } : item),
        tasks_completed: Math.max(0, previous.tasks_completed + completedChange),
      }
      const userId = currentUserId()
      if (userId) storeCachedDashboard(userId, updated)
      return updated
    })
    try {
      await api(`/study-tasks/${task.id}`, { method: 'PUT', body: JSON.stringify({ status: nextStatus }) })
    } catch (error) {
      console.error('Unable to update task:', error)
      setDashboard(before)
      const userId = currentUserId()
      if (userId && before) storeCachedDashboard(userId, before)
    }
  }

  const stats = [
    {
      label: 'Study Streak',
      value: dashboard?.study_streak ?? null,
      format: (value: number) => `${value} day${value === 1 ? '' : 's'}`,
      icon: Flame,
      color: '#f97316',
      bg: '#fff7ed',
      delta: 'Based on focus sessions',
    },
    {
      label: 'Focus Time',
      value: dashboard?.focus_minutes ?? null,
      format: formatFocusTime,
      icon: Clock,
      color: '#3b82f6',
      bg: '#eff6ff',
      delta: 'All recorded sessions',
    },
    {
      label: 'Tasks Completed',
      value: dashboard?.tasks_completed ?? null,
      format: String,
      icon: CheckSquare,
      color: '#10b981',
      bg: '#ecfdf5',
      delta: 'From your task list',
    },
    {
      label: 'Cards in Library',
      value: dashboard?.flashcards ?? null,
      icon: BookOpen,
      color: '#8b5cf6',
      bg: '#f5f3ff',
      delta: dashboard ? <><AnimatedNumber value={dashboard.flashcards_due} /> due for review</> : 'Loading cards',
    },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

      {/* ── TOP HERO BANNER ── */}
      <div className="relative rounded-3xl border p-6 lg:p-8 overflow-hidden shadow-sm" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--muted)', color: 'var(--primary)' }}>
              <Zap size={12} /> Fall Semester 2026 · Active Engine
            </div>
            <h1 className="text-3xl lg:text-4xl font-heading font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>
              Welcome back, {dashboard?.full_name?.split(' ')[0] ?? 'there'} 👋
            </h1>
            <p className="text-sm lg:text-base max-w-xl leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              {loading
                ? 'Syncing your study data from the workspace…'
                : loadError || 'Your dashboard is showing live data from your study workspace.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={() => setPage('pomodoro' as any)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-300 hover:opacity-90 hover:scale-[1.02] shadow-md"
              style={{ background: 'var(--primary)', color: '#fff' }}
            >
              <PlayCircle size={16} /> Start Focus Session
            </button>
            <button
              onClick={() => setPage('knowledge-graph' as any)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border transition-all hover:bg-muted"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--card)' }}
            >
              <BarChart2 size={16} /> Knowledge Graph
            </button>
          </div>
        </div>
      </div>

      {/* ── METRICS GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, format, icon: Icon, color, bg, delta }) => (
          <div key={label} className="rounded-2xl p-5 border transition-all duration-300 hover:border-primary/50 shadow-sm space-y-3" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-inner" style={{ background: bg }}>
                <Icon size={20} style={{ color }} />
              </div>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                {delta}
              </span>
            </div>
            <div>
              <div className="text-2xl lg:text-3xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>
                {isInitialLoad
                  ? <MetricSkeleton width={label === 'Tasks Completed' ? 'w-24' : undefined} />
                  : label === 'Tasks Completed'
                  ? <AnimatedFraction completed={dashboard?.tasks_completed ?? null} total={dashboard?.tasks_total ?? null} />
                  : <AnimatedNumber value={value} format={format} />}
              </div>
              <div className="text-xs font-medium mt-1" style={{ color: 'var(--muted-foreground)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── MAIN CONTENT SECTIONS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">

          <div className="rounded-2xl border p-6 shadow-sm space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-lg" style={{ color: 'var(--foreground)' }}>Today's Action Plan</h3>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>AI-scheduled tasks optimized for exam readiness</p>
              </div>
              <button className="text-xs font-semibold hover:underline" style={{ color: 'var(--primary)' }} onClick={() => setPage('planner' as any)}>Open Full Planner →</button>
            </div>

            <div className="space-y-3">
              {dashboard?.tasks.length ? dashboard.tasks.map(t => (
                <div key={t.id} className="flex items-start gap-3.5 p-3.5 rounded-xl border transition-all hover:bg-muted/40" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
                  <button onClick={() => void toggleTask(t)} aria-label={`${t.status === 'done' ? 'Reopen' : 'Complete'} ${t.title}`} className={`w-5 h-5 mt-0.5 rounded-md border-2 shrink-0 flex items-center justify-center transition-colors ${t.status === 'done' ? 'border-primary bg-primary' : ''}`} style={{ borderColor: t.status === 'done' ? 'var(--primary)' : 'var(--border)' }}>
                    {t.status === 'done' && <CheckSquare size={12} className="text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold ${t.status === 'done' ? 'line-through opacity-50' : ''}`} style={{ color: 'var(--foreground)' }}>{t.title}</div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: 'var(--card)', color: 'var(--foreground)' }}>{t.subject ?? 'General'}</span>
                      <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>·</span>
                      <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{formatDate(t.due_at)}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider" style={{ background: `${priorityColor[t.priority]}20`, color: priorityColor[t.priority], fontSize: 9 }}>
                        {t.priority} priority
                      </span>
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-sm py-4 text-center" style={{ color: 'var(--muted-foreground)' }}>
                  {loading ? 'Loading your tasks…' : 'No open tasks yet. Add one from the planner.'}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border p-6 shadow-sm space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-lg" style={{ color: 'var(--foreground)' }}>Active Study Workspaces</h3>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Folders with your saved study documents</p>
              </div>
              <button className="text-xs font-semibold hover:underline" style={{ color: 'var(--primary)' }} onClick={() => setPage('workspace' as any)}>Explore All →</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dashboard?.workspaces.length ? dashboard.workspaces.map((workspace, index) => {
                const color = workspaceColors[index % workspaceColors.length]
                return (
                <div key={workspace.title} className="cursor-pointer group p-4 rounded-xl border transition-all hover:border-primary/50" style={{ background: 'var(--muted)', borderColor: 'var(--border)' }} onClick={() => setPage('document' as any)}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded" style={{ background: 'var(--card)', color }}>
                      <AnimatedNumber value={workspace.documents} /> docs
                    </span>
                    <span className="text-xs font-mono font-bold" style={{ color: 'var(--foreground)' }}>Live</span>
                  </div>
                  <div className="text-sm font-bold group-hover:text-primary transition-colors mb-1 truncate" style={{ color: 'var(--foreground)' }}>{workspace.title}</div>
                  <p className="text-xs mb-2 truncate" style={{ color: 'var(--muted-foreground)' }}>Your document workspace</p>
                  <div className="flex items-center justify-between text-[11px] mb-3" style={{ color: 'var(--muted-foreground)' }}>
                    <span>Updated {formatRelativeTime(workspace.updated_at)}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--card)' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: '100%', background: color }} />
                  </div>
                </div>
                )
              }) : (
                <p className="text-sm py-4 text-center sm:col-span-2" style={{ color: 'var(--muted-foreground)' }}>
                  {loading ? 'Loading workspaces…' : 'No study documents yet. Create one in Workspace.'}
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-6">

          <div
            className="rounded-2xl border p-6 cursor-pointer hover:border-primary/50 transition-all shadow-sm group relative overflow-hidden"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            onClick={() => setPage('flashcards' as any)}
          >
            <div className="flex items-center justify-between relative z-10">
              <div>
                <div className="text-3xl font-heading font-extrabold" style={{ color: 'var(--foreground)' }}>
                  {isInitialLoad ? <MetricSkeleton width="w-12" /> : <AnimatedNumber value={dashboard?.flashcards_due ?? null} />}
                </div>
                <div className="text-sm font-semibold mt-1" style={{ color: 'var(--muted-foreground)' }}>Flashcards Due Today</div>
                <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>Calculated from your saved flashcards</p>
              </div>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm" style={{ background: 'var(--secondary-bg)' }}>
                <BookOpen size={26} style={{ color: 'var(--primary)' }} />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-xs font-bold relative z-10" style={{ color: 'var(--primary)' }}>
              Start Spaced Review Session <ArrowUpRight size={14} />
            </div>
          </div>

          <div className="rounded-2xl border p-6 shadow-sm space-y-3" style={{ background: 'linear-gradient(135deg, #1e1b4b15, #4c1d9515)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <Bot size={18} style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>EduSphere AI Copilot</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
              {dashboard?.tasks.length
                ? <>You have <strong><AnimatedNumber value={dashboard.tasks.length} /> open task{dashboard.tasks.length === 1 ? '' : 's'}</strong>. Start with <strong>{dashboard.tasks[0].title}</strong>{dashboard.tasks[0].due_at ? `, due ${formatDate(dashboard.tasks[0].due_at)}` : ''}.</>
                : 'Add tasks, focus sessions, documents, or flashcards to see personalised study insights here.'}
            </p>
            <button
              onClick={() => setPage('ai-assistant' as any)}
              className="w-full mt-2 py-2.5 rounded-xl text-xs font-semibold border transition-all hover:bg-card flex items-center justify-center gap-1.5"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--muted)' }}
            >
              Ask AI Assistant <ChevronRight size={14} />
            </button>
          </div>

          <div className="rounded-2xl border p-6 shadow-sm space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Milestones</h3>
              <Calendar size={15} style={{ color: 'var(--muted-foreground)' }} />
            </div>
            <div className="space-y-3">
              {dashboard?.upcoming_events.length ? dashboard.upcoming_events.map(m => (
                <div key={m.id} className="flex items-center gap-3 pb-3 border-b last:border-0 last:pb-0" style={{ borderColor: 'var(--border)' }}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--primary)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate" style={{ color: 'var(--foreground)' }}>{m.title}</div>
                    <div className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>{formatDate(m.starts_at)} · {m.event_type}</div>
                  </div>
                </div>
              )) : <p className="text-xs py-2" style={{ color: 'var(--muted-foreground)' }}>No upcoming events.</p>}
            </div>
          </div>

          <div className="rounded-2xl border p-6 shadow-sm space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <h3 className="font-heading font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Activity Stream</h3>
            <div className="space-y-3">
              {dashboard?.recent_activity.length ? dashboard.recent_activity.map((act, index) => (
                <div key={`${act.action}-${index}`} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0" style={{ borderColor: 'var(--border)' }}>
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--muted-foreground)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-relaxed" style={{ color: 'var(--foreground)' }}>{act.action}</p>
                    <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>{formatRelativeTime(act.occurred_at)}</span>
                  </div>
                </div>
              )) : <p className="text-xs py-2" style={{ color: 'var(--muted-foreground)' }}>No activity recorded yet.</p>}
            </div>
          </div>

        </div>

      </div>

      {/* ── RECENT NOTES BAR ── */}
      <div className="rounded-2xl border p-6 shadow-sm space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-bold text-lg" style={{ color: 'var(--foreground)' }}>Recently Modified Notes</h3>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Quickly jump back into your live collaborative study documents</p>
          </div>
          <button className="text-xs font-semibold hover:underline" style={{ color: 'var(--primary)' }} onClick={() => setPage('workspace' as any)}>Open Workspace →</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {dashboard?.recent_documents.length ? dashboard.recent_documents.map(n => (
            <button
              key={n.id}
              onClick={() => setPage('document' as any)}
              className="text-left p-4 rounded-xl border hover:border-primary/50 transition-all group space-y-2"
              style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded" style={{ background: 'var(--card)', color: 'var(--primary)' }}>{n.folder}</span>
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{formatRelativeTime(n.updated_at)}</span>
              </div>
              <div className="text-sm font-bold group-hover:text-primary transition-colors line-clamp-1" style={{ color: 'var(--foreground)' }}>{n.title}</div>
            </button>
          )) : (
            <p className="text-sm py-4 text-center sm:col-span-3" style={{ color: 'var(--muted-foreground)' }}>
              {loading ? 'Loading recent notes…' : 'No saved notes yet. Create your first document in Workspace.'}
            </p>
          )}
        </div>
      </div>

    </div>
  )
}
