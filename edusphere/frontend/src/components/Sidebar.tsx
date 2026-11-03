import { useEffect, useState } from 'react'
import {
  LayoutDashboard, FolderOpen, ListTodo, Calendar, CreditCard,
  HelpCircle, Users, Share2, Bot, Search, Settings,
  ChevronLeft, ChevronRight, Zap, FileText, Timer
} from 'lucide-react'
import type { CurrentUser, Page } from '../types'
import { api } from '../lib/api'

interface SidebarProps {
  page: Page
  setPage: (p: Page) => void
  open: boolean
  onToggle: () => void
  user: CurrentUser | null
}

interface SidebarProfile {
  full_name: string
  email: string
  department: string | null
  semester: string | null
}

const nav = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'workspace', label: 'Workspace', icon: FolderOpen },
  { id: 'planner', label: 'Planner', icon: ListTodo },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'pomodoro', label: 'Focus Timer', icon: Timer },
  { id: 'flashcards', label: 'Flashcards', icon: CreditCard },
  { id: 'quiz', label: 'Quizzes', icon: HelpCircle },
  { id: 'classroom', label: 'Classrooms', icon: Users },
  { id: 'knowledge-graph', label: 'Knowledge Graph', icon: Share2 },
  { id: 'ai-assistant', label: 'AI Assistant', icon: Bot },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'pdf-upload', label: 'PDF Import', icon: FileText },
  { id: 'analytics', label: 'Analytics', icon: Zap },
] as const

const bottom = [
  { id: 'profile', label: 'Settings & Profile', icon: Settings },
] as const

export default function Sidebar({ page, setPage, open, onToggle, user }: SidebarProps) {
  const [profile, setProfile] = useState<SidebarProfile | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    api<SidebarProfile>(`/profiles/${user.id}`)
      .then(data => { if (!cancelled) setProfile(data) })
      .catch(() => { if (!cancelled) setProfile(null) })
    return () => { cancelled = true }
  }, [user])

  const profileName = profile?.full_name ?? user?.full_name ?? 'Your profile'
  const initials = profileName.split(' ').filter(Boolean).slice(0, 2).map(name => name[0]).join('').toUpperCase() || 'U'
  const profileSubtitle = [profile?.department, profile?.semester].filter(Boolean).join(' · ') || user?.email || 'Student'

  return (
    <aside
      className="app-sidebar flex flex-col h-full shrink-0 transition-all duration-300 border-r overflow-hidden"
      style={{
        width: open ? 220 : 64,
        background: 'var(--sidebar)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 shrink-0 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.5" />
            <path d="M5 9h8M9 5v8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="9" cy="9" r="2" fill="white" />
          </svg>
        </div>
        {open && (
          <span className="font-heading font-800 text-base tracking-tight" style={{ color: 'var(--foreground)' }}>
            EduSphere
          </span>
        )}
        <button
          onClick={onToggle}
          className="ml-auto p-1 rounded-md hover:bg-muted transition-colors"
          style={{ color: 'var(--muted-foreground)' }}
        >
          {open ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {nav.map(({ id, label, icon: Icon }) => {
          const active = page === id
          return (
            <button
              key={id}
              onClick={() => setPage(id as Page)}
              title={!open ? label : undefined}
              className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-primary text-white'
                  : 'hover:bg-muted'
              }`}
              style={{ color: active ? '#fff' : 'var(--muted-foreground)' }}
            >
              <Icon size={17} className="shrink-0" />
              {open && <span className="truncate">{label}</span>}
              {open && id === 'ai-assistant' && (
                <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent)', color: '#fff', fontSize: 10 }}>AI</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="py-3 px-2 border-t space-y-0.5" style={{ borderColor: 'var(--border)' }}>
        {bottom.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setPage(id as Page)}
            title={!open ? label : undefined}
            className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 hover:bg-muted ${page === id ? 'bg-primary text-white' : ''}`}
            style={{ color: page === id ? '#fff' : 'var(--muted-foreground)' }}
          >
            <Icon size={17} className="shrink-0" />
            {open && <span>{label}</span>}
          </button>
        ))}
        {open && (
          <button
            onClick={() => setPage('profile')}
            className="w-full flex items-center gap-3 px-2.5 py-2 mt-1 rounded-lg text-left hover:bg-muted transition-colors"
            title="Open profile settings"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">{initials}</div>
            <div className="overflow-hidden">
              <div className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{profileName}</div>
              <div className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>{profileSubtitle}</div>
            </div>
          </button>
        )}
      </div>
    </aside>
  )
}
