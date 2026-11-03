import { lazy, Suspense, useState, useEffect, useRef } from 'react'
import type { CurrentUser, Page } from './types'
import { api } from './lib/api'

// Pre-auth screens
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import EmailVerificationPage from './pages/EmailVerificationPage'
//post auth profile status
import OnboardingModal from './components/OnboardingModal'

// App shell
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'

// App pages
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'))
const DocumentEditorPage = lazy(() => import('./pages/DocumentEditorPage'))
const PlannerPage = lazy(() => import('./pages/PlannerPage'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const FlashcardsPage = lazy(() => import('./pages/FlashcardsPage'))
const QuizPage = lazy(() => import('./pages/QuizPage'))
const AIAssistantPage = lazy(() => import('./pages/AIAssistantPage'))
const KnowledgeGraphPage = lazy(() => import('./pages/KnowledgeGraphPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const ClassroomPage = lazy(() => import('./pages/ClassroomPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const PomodoroPage = lazy(() => import('./pages/PomodoroPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const PDFUploadPage = lazy(() => import('./pages/PDFUploadPage'))

type AuthScreen = 'landing' | 'login' | 'signup' | 'forgot' | 'verify'

const pagePaths: Record<Page, string> = {
  login: '/login',
  dashboard: '/dashboard',
  workspace: '/workspace',
  document: '/document',
  planner: '/planner',
  calendar: '/calendar',
  flashcards: '/flashcards',
  quiz: '/quiz',
  'quiz-result': '/quiz-result',
  'ai-assistant': '/ai-assistant',
  'knowledge-graph': '/knowledge-graph',
  analytics: '/analytics',
  classroom: '/classroom',
  profile: '/profile',
  'pdf-upload': '/pdf-upload',
  pomodoro: '/pomodoro',
  search: '/search',
}

const pathPages = Object.fromEntries(
  Object.entries(pagePaths).map(([page, path]) => [path, page as Page])
) as Record<string, Page>

const authPaths: Record<string, AuthScreen> = {
  '/': 'landing',
  '/login': 'login',
  '/signup': 'signup',
  '/forgot-password': 'forgot',
  '/verify-email': 'verify',
}

function getInitialPage(): Page {
  return pathPages[window.location.pathname] ?? 'dashboard'
}

const onboardingStorageKey = (userId: number) => `edusphere.onboarding.completed.${userId}`
const pendingVerificationStorageKey = 'edusphere.pendingVerificationEmail'

function getStoredCurrentUser(): CurrentUser | null {
  const saved = localStorage.getItem('edusphere.currentUser')
  if (!saved) return null

  try {
    return JSON.parse(saved) as CurrentUser
  } catch {
    localStorage.removeItem('edusphere.currentUser')
    return null
  }
}

function hasCompletedOnboarding(userId: number): boolean {
  return localStorage.getItem(onboardingStorageKey(userId)) === 'true'
}

function getPendingVerificationEmail(): string {
  return sessionStorage.getItem(pendingVerificationStorageKey) ?? ''
}

function RouteLoading() {
  return <div className="flex min-h-[320px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="Loading page" /></div>
}

export default function App() {
  const initialPath = window.location.pathname
  const [auth, setAuth] = useState<AuthScreen>(authPaths[initialPath] ?? 'landing')
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(getStoredCurrentUser)
  const [loggedIn, setLoggedIn] = useState<boolean>(() => {
    const savedUser = getStoredCurrentUser()
    if (!savedUser) return false

    // Older app versions used "/" for the dashboard. Keep those signed-in
    // sessions working, then replace that legacy URL with "/dashboard".
    return initialPath === '/' || !authPaths[initialPath]
  })
  const [page, setPageState] = useState<Page>(getInitialPage)
  const [activeDocumentId, setActiveDocumentId] = useState<number | null>(null)
  const [dark, setDark] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState(getPendingVerificationEmail)
  const mainScrollRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (loggedIn && window.location.pathname === '/') {
      window.history.replaceState({}, '', pagePaths.dashboard)
    }
  }, [loggedIn])

  useEffect(() => {
    if (!loggedIn || !currentUser) return

    let cancelled = false
    const userId = currentUser.id

    if (hasCompletedOnboarding(userId)) {
      setShowOnboarding(false)
      return
    }

    // Local storage prevents repeat prompts immediately; the API check also
    // restores the completed state when the user signs in on another device.
    setShowOnboarding(true)
    api<{ onboarding_completed: boolean }>(`/profiles/${userId}`)
      .then(profile => {
        if (cancelled || !profile.onboarding_completed) return
        localStorage.setItem(onboardingStorageKey(userId), 'true')
        setShowOnboarding(false)
      })
      .catch(() => {
        // The form remains available for a new user if the API is temporarily unavailable.
      })

    return () => {
      cancelled = true
    }
  }, [currentUser, loggedIn])

  useEffect(() => {
    const handlePopState = () => {
      const currentPath = window.location.pathname
      const authScreen = authPaths[currentPath]
      const savedUser = getStoredCurrentUser()

      if (currentPath === '/' && savedUser) {
        setCurrentUser(savedUser)
        setPageState('dashboard')
        setLoggedIn(true)
        window.history.replaceState({}, '', pagePaths.dashboard)
        return
      }

      if (authScreen) {
        setAuth(authScreen)
        setLoggedIn(false)
      } else {
        setPageState(pathPages[currentPath] ?? 'dashboard')
        setLoggedIn(Boolean(savedUser))

        if (!savedUser) {
          setAuth('login')
          window.history.replaceState({}, '', '/login')
        }
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const setPage = (nextPage: Page) => {
    setPageState(nextPage)
    const nextPath = pagePaths[nextPage]
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }
  }

  const setThemeWithAnimation = (nextDarkMode: boolean) => {
    const applyTheme = () => setDark(nextDarkMode)
    const transitionDocument = document as Document & {
      startViewTransition?: (update: () => void) => unknown
    }

    if (transitionDocument.startViewTransition) {
      transitionDocument.startViewTransition(applyTheme)
    } else {
      applyTheme()
    }
  }

  useEffect(() => {
    if (!loggedIn) return

    // Each view opens at its beginning. The scroll is intentionally animated
    // so sidebar/navbar navigation never leaves the user at an old position.
    const frame = window.requestAnimationFrame(() => {
      mainScrollRef.current?.scrollTo({
        top: 0,
        left: 0,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [page, loggedIn])

  const goToAuth = (nextAuth: AuthScreen) => {
    setAuth(nextAuth)
    setLoggedIn(false)
    const nextPath = Object.entries(authPaths).find(([, screen]) => screen === nextAuth)?.[0] ?? '/'
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }
  }

  const startEmailVerification = (email: string) => {
    const normalizedEmail = email.trim().toLowerCase()
    sessionStorage.setItem(pendingVerificationStorageKey, normalizedEmail)
    setPendingVerificationEmail(normalizedEmail)
    goToAuth('verify')
  }

  const completeLogin = (user: CurrentUser) => {
    sessionStorage.removeItem(pendingVerificationStorageKey)
    setPendingVerificationEmail('')
    localStorage.setItem('edusphere.currentUser', JSON.stringify(user))
    setCurrentUser(user)
    setLoggedIn(true)
    setPage('dashboard')
    setShowOnboarding(!hasCompletedOnboarding(user.id))
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  // ── Pre-auth flow ──
  if (!loggedIn) {
    if (auth === 'landing') {
      return (
        <div key={auth} className="auth-transition min-h-screen">
          <LandingPage
            setPage={setPage}
            onLogin={() => goToAuth('login')}
            onSignup={() => goToAuth('signup')}
          />
        </div>
      )
    }
    if (auth === 'login') {
      return (
        <div key={auth} className="auth-transition min-h-screen">
          <LoginPage
            onLogin={completeLogin}
            onSignup={() => goToAuth('signup')}
            onForgot={() => goToAuth('forgot')}
            onBack={() => goToAuth('landing')}
            onVerify={startEmailVerification}
          />
        </div>
      )
    }
    if (auth === 'signup') {
      return (
        <div key={auth} className="auth-transition min-h-screen">
          <SignUpPage
            onSignup={user => startEmailVerification(user.email)}
            setPage={(p) => {
              if (p === 'login') goToAuth('login')
              if ((p as string) === 'landing') goToAuth('landing')
            }}
          />
        </div>
      )
    }
    if (auth === 'forgot') {
      return (
        <div key={auth} className="auth-transition min-h-screen">
          <ForgotPasswordPage
            setPage={(p) => {
              if (p === 'login') goToAuth('login')
              if ((p as string) === 'landing') goToAuth('landing')
            }}
          />
        </div>
      )
    }
    if (auth === 'verify') {
      return (
        <div key={auth} className="auth-transition min-h-screen">
          <EmailVerificationPage
            email={pendingVerificationEmail}
            onVerified={completeLogin}
            setPage={(p) => {
              if (p === 'login') goToAuth('login')
            }}
          />
        </div>
      )
    }
  }

  // ── Authenticated app ──
  return (
    <div className="app-shell flex h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      <Sidebar
        page={page}
        setPage={setPage}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(o => !o)}
        user={currentUser}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Navbar
          darkMode={dark}
          setDarkMode={setThemeWithAnimation}
          onMenuToggle={() => setSidebarOpen(open => !open)}
          user={currentUser}
          onLogout={() => {
            localStorage.removeItem('edusphere.currentUser')
            setCurrentUser(null)
            setLoggedIn(false)
            goToAuth('login')
          }}
          setPage={setPage}
          currentPage={page}
        />
        <main ref={mainScrollRef} className="app-scroll-region flex-1 overflow-auto relative" tabIndex={-1}>
          <div key={page} className={`route-transition route-transition--page authenticated-page authenticated-page--${page} min-h-full`}>
            <Suspense fallback={<RouteLoading />}>
              {page === 'dashboard' && <DashboardPage setPage={setPage} />}
              {page === 'workspace' && <WorkspacePage onOpenDocument={(id) => { setActiveDocumentId(id); setPage('document') }} />}
              {page === 'document' && <DocumentEditorPage setPage={setPage} documentId={activeDocumentId} onDocumentChange={setActiveDocumentId} />}
              {page === 'planner' && <PlannerPage />}
              {page === 'calendar' && <CalendarPage />}
              {page === 'pomodoro' && <PomodoroPage />}
              {page === 'flashcards' && <FlashcardsPage />}
              {page === 'quiz' && <QuizPage setPage={setPage} />}
              {page === 'ai-assistant' && <AIAssistantPage />}
              {page === 'knowledge-graph' && <KnowledgeGraphPage setPage={setPage} />}
              {page === 'analytics' && <AnalyticsPage />}
              {page === 'classroom' && <ClassroomPage />}
              {page === 'profile' && <ProfilePage dark={dark} setDark={setThemeWithAnimation} />}
              {page === 'search' && <SearchPage setPage={setPage} onOpenDocument={(id) => { setActiveDocumentId(id); setPage('document') }} />}
              {page === 'pdf-upload' && <PDFUploadPage setPage={setPage} />}
            </Suspense>
          </div>
          {showOnboarding && (
            <OnboardingModal onComplete={() => {
              if (currentUser) {
                localStorage.setItem(onboardingStorageKey(currentUser.id), 'true')
              }
              setShowOnboarding(false)
            }} />
          )}
        </main>
      </div>
    </div>
  )
}
