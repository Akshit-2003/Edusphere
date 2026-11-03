import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts'
import { Bot, TrendingUp, TrendingDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, currentUserId } from '../lib/api'

interface AnalyticsData {
  focus_minutes: number
  sessions: number
  tasks_completed: number
  tasks_total: number
  flashcards: number
  quiz_accuracy: number
  focus_by_day: { day: string; hours: number }[]
  subject_progress: { subject: string; score: number; tasks_total: number; tasks_completed: number; cards: number }[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border px-3 py-2 text-xs shadow-lg" style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
      <div className="font-semibold mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name}>{p.name}: <strong>{p.value}{p.name === 'hours' ? 'h' : '%'}</strong></div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const userId = currentUserId()
    if (!userId) { setError('Your session has expired. Please sign in again.'); return }
    api<AnalyticsData>(`/analytics/${userId}`).then(setAnalytics).catch(() => setError('Analytics could not be loaded. Please try again.'))
  }, [])

  const weeklyStudy = analytics?.focus_by_day ?? []
  const subjectProgress = analytics?.subject_progress.map(item => ({ ...item, A: item.score })) ?? []
  const radarData = subjectProgress.map(item => ({ sub: item.subject, score: item.score }))
  const topStats = [
    { label: 'Total Focus Time', value: analytics ? `${Math.floor(analytics.focus_minutes / 60)}h ${analytics.focus_minutes % 60}m` : '—', delta: `${analytics?.sessions ?? 0} sessions`, up: true },
    { label: 'Quiz Accuracy', value: analytics ? `${analytics.quiz_accuracy}%` : '—', delta: 'From saved attempts', up: true },
    { label: 'Cards in Library', value: analytics ? String(analytics.flashcards) : '—', delta: 'Live database count', up: true },
    { label: 'Tasks Completed', value: analytics ? `${analytics.tasks_completed}/${analytics.tasks_total}` : '—', delta: 'From your planner', up: true },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>Learning Analytics</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Insights generated from your saved study data</p>
      </div>
      {error && <p className="rounded-lg px-3 py-2 text-sm" style={{ background: '#ef444415', color: '#dc2626' }}>{error}</p>}

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {topStats.map(s => (
          <div key={s.label} className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="text-2xl font-heading font-bold mb-0.5" style={{ color: 'var(--foreground)' }}>{s.value}</div>
            <div className="text-xs mb-2" style={{ color: 'var(--muted-foreground)' }}>{s.label}</div>
            <div className="flex items-center gap-1 text-xs" style={{ color: s.up ? '#10b981' : '#ef4444' }}>
              {s.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {s.delta}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly study time */}
        <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h3 className="font-heading font-semibold mb-4 text-base" style={{ color: 'var(--foreground)' }}>Weekly Study Time</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={weeklyStudy}>
              <defs>
                <linearGradient id="studyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="hours" name="hours" stroke="#4f46e5" strokeWidth={2} fill="url(#studyGrad)" dot={{ fill: '#4f46e5', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quiz Performance */}
        <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h3 className="font-heading font-semibold mb-4 text-base" style={{ color: 'var(--foreground)' }}>Task Completion by Subject</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={subjectProgress}>
              <defs><linearGradient id="quizGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="subject" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="score" name="score" stroke="#10b981" strokeWidth={2} fill="url(#quizGrad)" dot={{ fill: '#10b981', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Subject Progress */}
        <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h3 className="font-heading font-semibold mb-4 text-base" style={{ color: 'var(--foreground)' }}>Subject Progress</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={subjectProgress} barSize={32}>
              <XAxis dataKey="subject" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="A" name="score" radius={[4, 4, 0, 0]} fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar chart */}
        <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h3 className="font-heading font-semibold mb-4 text-base" style={{ color: 'var(--foreground)' }}>Subject Mastery Overview</h3>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="sub" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <Radar name="Mastery" dataKey="score" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Strong/Weak + AI Insight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h3 className="font-heading font-semibold mb-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>STRONG SUBJECTS</h3>
          {subjectProgress.length ? subjectProgress.slice(0, 3).map(x => (
            <div key={x.subject} className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm" style={{ color: 'var(--foreground)' }}>{x.subject}</span>
                  <span className="text-xs font-mono" style={{ color: '#10b981' }}>{x.score}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
                  <div className="h-full rounded-full" style={{ width: `${x.score}%`, background: '#10b981' }} />
                </div>
              </div>
            </div>
          )) : <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Complete tasks to see subject progress.</p>}
        </div>

        <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h3 className="font-heading font-semibold mb-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>NEEDS ATTENTION</h3>
          {subjectProgress.length ? [...subjectProgress].sort((a, b) => a.score - b.score).slice(0, 3).map(x => (
            <div key={x.subject} className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm" style={{ color: 'var(--foreground)' }}>{x.subject}</span>
                  <span className="text-xs font-mono" style={{ color: x.score < 60 ? '#ef4444' : '#f59e0b' }}>{x.score}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
                  <div className="h-full rounded-full" style={{ width: `${x.score}%`, background: x.score < 60 ? '#ef4444' : '#f59e0b' }} />
                </div>
              </div>
            </div>
          )) : <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>No subjects need attention yet.</p>}
        </div>

        <div className="rounded-xl border p-5" style={{ background: 'linear-gradient(135deg, #1e1b4b15, #4c1d9515)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Bot size={16} style={{ color: 'var(--accent)' }} />
            <h3 className="font-heading font-semibold text-sm" style={{ color: 'var(--accent)' }}>AI Insight</h3>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
            {subjectProgress.length
              ? <>Your strongest current subject is <strong>{subjectProgress[0].subject}</strong> at <strong>{subjectProgress[0].score}%</strong> task completion. Your quiz accuracy is <strong>{analytics?.quiz_accuracy ?? 0}%</strong>.</>
              : 'Add tasks and flashcards to generate personalised insights from your study data.'}
          </p>
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Recommendation</div>
            <div className="text-sm font-medium mt-1" style={{ color: 'var(--foreground)' }}>{subjectProgress.length ? `Work on ${[...subjectProgress].sort((a, b) => a.score - b.score)[0].subject} next.` : 'Create your first study task.'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
