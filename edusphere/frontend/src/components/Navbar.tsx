import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  Bot,
  CalendarDays,
  CheckCheck,
  Database,
  GraduationCap,
  ListTodo,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
} from 'lucide-react'
import type { CurrentUser, Page } from '../types'
import { api } from '../lib/api'

interface NavbarProps {
  darkMode: boolean
  setDarkMode: (d: boolean) => void
  onMenuToggle?: () => void
  setPage: (p: Page) => void
  user: CurrentUser | null
  onLogout: () => void
  currentPage: Page
}

interface NavbarProfile {
  full_name: string
  email: string
  department: string | null
  semester: string | null
  daily_goal_hours: number
  target_goal: string | null
}

interface SystemInfo {
  application: string
  database: {
    name: string
    engine: string
    provider: string
    connection: string
  }
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'U'
}

export default function Navbar({
  darkMode,
  setDarkMode,
  onMenuToggle,
  setPage,
  user,
  onLogout,
  currentPage,
}: NavbarProps) {
  const [openMenu, setOpenMenu] = useState<'notifications' | 'profile' | null>(null)
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true)
  const [profile, setProfile] = useState<NavbarProfile | null>(null)
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const navbarRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!navbarRef.current?.contains(event.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [])

  useEffect(() => {
    const openSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPage('search')
      }
    }
    window.addEventListener('keydown', openSearch)
    return () => window.removeEventListener('keydown', openSearch)
  }, [setPage])

  useEffect(() => {
    if (openMenu !== 'profile' || !user) return

    let cancelled = false
    api<NavbarProfile>(`/profiles/${user.id}`)
      .then(data => { if (!cancelled) setProfile(data) })
      .catch(() => { if (!cancelled) setProfile(null) })
    api<SystemInfo>('/system-info')
      .then(data => { if (!cancelled) setSystemInfo(data) })
      .catch(() => { if (!cancelled) setSystemInfo(null) })

    return () => { cancelled = true }
  }, [openMenu, user])

  const navigateTo = (page: Page) => {
    setOpenMenu(null)
    setPage(page)
  }

  const avatarName = profile?.full_name ?? user?.full_name ?? 'User'
  const academicDetails = [profile?.department, profile?.semester].filter(Boolean).join(' · ')
  const popoverStyle = {
    background: darkMode ? 'rgba(19, 19, 31, 0.86)' : 'rgba(255, 255, 255, 0.86)',
    borderColor: darkMode ? 'rgba(148, 163, 184, 0.18)' : 'rgba(148, 163, 184, 0.32)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
  }

  return (
    <header
      ref={navbarRef}
      className="app-navbar relative z-30 h-14 flex items-center gap-4 px-4 shrink-0 border-b"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <button
        onClick={onMenuToggle}
        aria-label="Toggle sidebar"
        className="p-1.5 rounded-md hover:bg-muted transition-colors lg:hidden"
        style={{ color: 'var(--muted-foreground)' }}
      >
        <Menu size={18} />
      </button>

      <button
        onClick={() => navigateTo('search')}
        aria-label="Search study materials"
        className="flex-1 max-w-md flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-sm transition-all hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
      >
        <Search size={15} />
        <span>Search anything...</span>
        <span className="ml-auto text-xs px-1.5 py-0.5 rounded border font-mono hidden sm:inline" style={{ borderColor: 'var(--border)', fontSize: 10 }}>⌘K</span>
      </button>

      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={() => navigateTo('ai-assistant')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          <Bot size={15} />
          <span className="hidden sm:inline">AI</span>
        </button>

        <div className="relative">
          <button
            onClick={() => {
              setOpenMenu(menu => menu === 'notifications' ? null : 'notifications')
              setHasUnreadNotifications(false)
            }}
            aria-label="Open notifications"
            aria-expanded={openMenu === 'notifications'}
            className="relative p-2 rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <Bell size={17} />
            {hasUnreadNotifications && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />}
          </button>

          {openMenu === 'notifications' && (
            <div
              className="absolute right-0 top-full mt-2 w-80 rounded-2xl border shadow-2xl overflow-hidden"
              style={popoverStyle}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Notifications</p>
                  <p className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>Your study workspace is in sync.</p>
                </div>
                <button
                  onClick={() => setHasUnreadNotifications(false)}
                  className="text-[11px] font-semibold flex items-center gap-1 hover:opacity-75"
                  style={{ color: 'var(--primary)' }}
                >
                  <CheckCheck size={13} /> Mark read
                </button>
              </div>
              <div className="p-2 space-y-1">
                <button
                  onClick={() => navigateTo('planner')}
                  className="w-full text-left flex gap-3 p-3 rounded-xl hover:bg-white/35 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--secondary-bg)', color: 'var(--primary)' }}><ListTodo size={15} /></div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>Review your action plan</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Open Planner to update your current tasks.</p>
                  </div>
                </button>
                <button
                  onClick={() => navigateTo('calendar')}
                  className="w-full text-left flex gap-3 p-3 rounded-xl hover:bg-white/35 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#eff6ff', color: '#3b82f6' }}><CalendarDays size={15} /></div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>Check upcoming milestones</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>View classes, study events, and deadlines.</p>
                  </div>
                </button>
              </div>
              <div className="px-4 py-2.5 border-t text-[11px]" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
                {currentPage === 'dashboard' ? 'Dashboard sync is active.' : 'Your dashboard is ready to view.'}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setDarkMode(!darkMode)}
          aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
          className="p-2 rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          style={{ color: 'var(--muted-foreground)' }}
        >
          {darkMode ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <div
          className="relative ml-1"
          onMouseEnter={() => setOpenMenu('profile')}
          onMouseLeave={() => setOpenMenu(menu => menu === 'profile' ? null : menu)}
        >
          <button
            onClick={() => setOpenMenu(menu => menu === 'profile' ? null : 'profile')}
            onFocus={() => setOpenMenu('profile')}
            aria-label="Open account menu"
            aria-expanded={openMenu === 'profile'}
            className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold cursor-pointer shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
          >
            {initials(avatarName)}
          </button>

          {openMenu === 'profile' && (
            <div
              className="absolute right-0 top-[calc(100%-2px)] w-80 rounded-2xl border shadow-2xl p-3"
              style={popoverStyle}
            >
              <div className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background: 'color-mix(in srgb, var(--muted) 72%, transparent)' }}>
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-sm font-bold shrink-0">{initials(avatarName)}</div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--foreground)' }}>{avatarName}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>{profile?.email ?? user?.email}</p>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--primary)' }}>{academicDetails || 'EduSphere student account'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="rounded-xl border p-2.5" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--card) 62%, transparent)' }}>
                  <div className="flex items-center gap-1.5 mb-1" style={{ color: 'var(--primary)' }}><Database size={13} /><span className="text-[10px] font-bold uppercase tracking-wide">Database</span></div>
                  <p className="text-xs font-semibold truncate" title={systemInfo?.database.name} style={{ color: 'var(--foreground)' }}>{systemInfo?.database.name ?? 'Loading…'}</p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--muted-foreground)' }}>{systemInfo ? `${systemInfo.database.provider} · ${systemInfo.database.connection}` : 'Secure connection'}</p>
                </div>
                <div className="rounded-xl border p-2.5" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--card) 62%, transparent)' }}>
                  <div className="flex items-center gap-1.5 mb-1" style={{ color: '#10b981' }}><GraduationCap size={13} /><span className="text-[10px] font-bold uppercase tracking-wide">Daily goal</span></div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{profile ? `${profile.daily_goal_hours} hours` : 'Loading…'}</p>
                  <p className="text-[10px] truncate" title={profile?.target_goal ?? undefined} style={{ color: 'var(--muted-foreground)' }}>{profile?.target_goal ?? 'Study consistently'}</p>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t space-y-1" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => navigateTo('profile')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-left hover:bg-white/35 dark:hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--foreground)' }}
                >
                  <Settings size={15} style={{ color: 'var(--muted-foreground)' }} /> Profile & settings
                </button>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-left hover:bg-red-500/10 transition-colors"
                  style={{ color: '#ef4444' }}
                >
                  <LogOut size={15} /> Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
