import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import {
  Bell,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  GraduationCap,
  LoaderCircle,
  Lock,
  Mail,
  Moon,
  Palette,
  RefreshCw,
  Save,
  Shield,
  Sun,
  UserRound,
  X,
} from 'lucide-react'
import { ApiError, api, currentUserId } from '../lib/api'
import type { CurrentUser } from '../types'

type SettingsTab = 'profile' | 'security' | 'preferences'
type Notice = { type: 'success' | 'error'; message: string } | null

interface StoredProfile {
  user_id: number
  full_name: string
  email: string
  email_verified: boolean
  bio: string | null
  daily_goal_hours: number
  department: string | null
  semester: string | null
  roll_number: string | null
  cgpa: string | null
  target_goal: string | null
  onboarding_completed: boolean
  preferences: Record<string, boolean>
  avatar_url: string | null
}

interface ProfileForm {
  fullName: string
  email: string
  department: string
  semester: string
  rollNumber: string
  cgpa: string
  targetGoal: string
  bio: string
  dailyGoalHours: string
}

interface ProfilePageProps {
  dark: boolean
  setDark: (value: boolean) => void
  onUserUpdated?: (user: CurrentUser) => void
}

const defaultForm: ProfileForm = {
  fullName: '',
  email: '',
  department: '',
  semester: '',
  rollNumber: '',
  cgpa: '',
  targetGoal: '',
  bio: '',
  dailyGoalHours: '2',
}

const defaultPreferences: Record<string, boolean> = {
  darkMode: false,
  focusReminders: true,
  flashcardReminders: true,
  classroomUpdates: true,
  weeklyInsights: false,
}

const tabs: Array<{ id: SettingsTab; label: string; description: string; icon: typeof UserRound }> = [
  { id: 'profile', label: 'Profile', description: 'Personal & academic details', icon: UserRound },
  { id: 'security', label: 'Security', description: 'Password & verification', icon: Shield },
  { id: 'preferences', label: 'Preferences', description: 'Theme & notifications', icon: Palette },
]

const inputClass = 'mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-70'

const profileToForm = (profile: StoredProfile): ProfileForm => ({
  fullName: profile.full_name,
  email: profile.email,
  department: profile.department ?? '',
  semester: profile.semester ?? '',
  rollNumber: profile.roll_number ?? '',
  cgpa: profile.cgpa ?? '',
  targetGoal: profile.target_goal ?? '',
  bio: profile.bio ?? '',
  dailyGoalHours: String(profile.daily_goal_hours),
})

function getInitials(name: string) {
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('')
  return initials.toUpperCase() || 'U'
}

export default function ProfilePage({ dark, setDark, onUserUpdated }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [form, setForm] = useState<ProfileForm>(defaultForm)
  const [savedEmail, setSavedEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [emailVerified, setEmailVerified] = useState(false)
  const [preferences, setPreferences] = useState(defaultPreferences)
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingAvatar, setSavingAvatar] = useState(false)
  const [savingPreference, setSavingPreference] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)
  const [sendingVerification, setSendingVerification] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const hydrateProfile = (profile: StoredProfile) => {
    const nextPreferences = { ...defaultPreferences, ...profile.preferences }
    setForm(profileToForm(profile))
    setSavedEmail(profile.email)
    setAvatarUrl(profile.avatar_url ?? '')
    setEmailVerified(profile.email_verified)
    setPreferences(nextPreferences)
    if (typeof profile.preferences.darkMode === 'boolean') setDark(profile.preferences.darkMode)
  }

  useEffect(() => {
    const userId = currentUserId()
    if (!userId) {
      setNotice({ type: 'error', message: 'Your session could not be found. Please sign in again.' })
      setLoading(false)
      return
    }

    let cancelled = false
    api<StoredProfile>(`/profiles/${userId}`)
      .then(profile => { if (!cancelled) hydrateProfile(profile) })
      .catch(error => {
        if (!cancelled) setNotice({ type: 'error', message: error instanceof ApiError ? error.message : 'Settings could not be loaded. Please refresh and try again.' })
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
    // The profile is loaded once each time this route is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateCurrentUser = (profile: StoredProfile) => {
    try {
      const saved = localStorage.getItem('edusphere.currentUser')
      const prior = saved ? JSON.parse(saved) : {}
      const nextUser: CurrentUser = {
        id: profile.user_id,
        full_name: profile.full_name,
        email: profile.email,
        is_active: prior.is_active ?? true,
        email_verified: profile.email_verified,
        role_id: prior.role_id ?? 0,
      }
      localStorage.setItem('edusphere.currentUser', JSON.stringify(nextUser))
      onUserUpdated?.(nextUser)
    } catch {
      // The server profile remains the source of truth if browser storage is unavailable.
    }
  }

  const saveProfile = async () => {
    const userId = currentUserId()
    const normalizedEmail = form.email.trim().toLowerCase()
    const cgpa = Number(form.cgpa)

    if (!userId) return setNotice({ type: 'error', message: 'Your session has expired. Please sign in again.' })
    if (form.fullName.trim().length < 2) return setNotice({ type: 'error', message: 'Please enter a name with at least two characters.' })
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) return setNotice({ type: 'error', message: 'Please enter a valid email address.' })
    if (form.cgpa.trim() && (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10)) return setNotice({ type: 'error', message: 'CGPA should be a value between 0 and 10.' })

    const emailChanged = normalizedEmail !== savedEmail
    setSavingProfile(true)
    setNotice(null)
    try {
      const profile = await api<StoredProfile>(`/profiles/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({
          full_name: form.fullName.trim(),
          email: normalizedEmail,
          department: form.department.trim(),
          semester: form.semester.trim(),
          roll_number: form.rollNumber.trim(),
          cgpa: form.cgpa.trim(),
          target_goal: form.targetGoal.trim(),
          bio: form.bio.trim(),
          daily_goal_hours: Number(form.dailyGoalHours),
        }),
      })
      hydrateProfile(profile)
      updateCurrentUser(profile)

      if (emailChanged) {
        try {
          await api<{ message: string }>('/auth/email-verification/resend', {
            method: 'POST',
            body: JSON.stringify({ email: profile.email }),
          })
          setNotice({ type: 'success', message: 'Profile saved. A verification code was sent to your new email address.' })
        } catch {
          setNotice({ type: 'success', message: 'Profile saved. Please request a verification code for your new email address.' })
        }
      } else {
        setNotice({ type: 'success', message: 'Your profile and academic details have been saved.' })
      }
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof ApiError ? error.message : 'Profile changes could not be saved. Please try again.' })
    } finally {
      setSavingProfile(false)
    }
  }

  const chooseAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    const userId = currentUserId()
    event.target.value = ''
    if (!file || !userId) return
    if (!file.type.startsWith('image/')) {
      setNotice({ type: 'error', message: 'Please choose a JPG, PNG, WebP, or another image file.' })
      return
    }
    if (file.size > 750 * 1024) {
      setNotice({ type: 'error', message: 'Please choose an image smaller than 750 KB.' })
      return
    }

    const reader = new FileReader()
    reader.onerror = () => setNotice({ type: 'error', message: 'This image could not be read. Please try another file.' })
    reader.onload = async () => {
      const imageData = String(reader.result ?? '')
      if (!imageData) return
      setSavingAvatar(true)
      setNotice(null)
      try {
        const profile = await api<StoredProfile>(`/profiles/${userId}`, {
          method: 'PUT',
          body: JSON.stringify({ avatar_url: imageData }),
        })
        setAvatarUrl(profile.avatar_url ?? imageData)
        updateCurrentUser(profile)
        setNotice({ type: 'success', message: 'Your profile photo has been updated.' })
      } catch (error) {
        setNotice({ type: 'error', message: error instanceof ApiError ? error.message : 'Avatar could not be saved. Please try again.' })
      } finally {
        setSavingAvatar(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const updatePassword = async () => {
    const userId = currentUserId()
    if (!userId) return setNotice({ type: 'error', message: 'Your session has expired. Please sign in again.' })
    if (!currentPassword) return setNotice({ type: 'error', message: 'Enter your current password to continue.' })
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return setNotice({ type: 'error', message: 'Use at least 8 characters with both a letter and a number.' })
    }
    if (newPassword !== confirmPassword) return setNotice({ type: 'error', message: 'New password and confirmation do not match.' })

    setSavingPassword(true)
    setNotice(null)
    try {
      const response = await api<{ message: string }>(`/auth/users/${userId}/password`, {
        method: 'PUT',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setNotice({ type: 'success', message: response.message })
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof ApiError ? error.message : 'Password could not be updated. Please try again.' })
    } finally {
      setSavingPassword(false)
    }
  }

  const resendVerification = async () => {
    if (emailVerified || !form.email) return
    setSendingVerification(true)
    setNotice(null)
    try {
      const response = await api<{ message: string }>('/auth/email-verification/resend', {
        method: 'POST',
        body: JSON.stringify({ email: form.email }),
      })
      setNotice({ type: 'success', message: response.message })
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof ApiError ? error.message : 'Verification code could not be sent. Please try again.' })
    } finally {
      setSendingVerification(false)
    }
  }

  const savePreference = async (key: string, value: boolean) => {
    const userId = currentUserId()
    if (!userId) return
    const before = preferences
    const next = { ...preferences, [key]: value }
    setPreferences(next)
    setSavingPreference(key)
    setNotice(null)
    try {
      const profile = await api<StoredProfile>(`/profiles/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ preferences: next }),
      })
      setPreferences({ ...defaultPreferences, ...profile.preferences })
      setNotice({ type: 'success', message: key === 'darkMode' ? 'Theme preference saved.' : 'Preference saved to your account.' })
    } catch (error) {
      setPreferences(before)
      if (key === 'darkMode') setDark(Boolean(before.darkMode))
      setNotice({ type: 'error', message: error instanceof ApiError ? error.message : 'Preference could not be saved. Please try again.' })
    } finally {
      setSavingPreference(null)
    }
  }

  const selectTheme = (nextDark: boolean) => {
    if (savingPreference === 'darkMode' || dark === nextDark) return
    setDark(nextDark)
    void savePreference('darkMode', nextDark)
  }

  if (loading) {
    return (
      <main className="min-h-full p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl animate-pulse space-y-6">
          <div className="h-40 rounded-3xl bg-[var(--muted)]" />
          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]"><div className="h-56 rounded-3xl bg-[var(--muted)]" /><div className="h-[480px] rounded-3xl bg-[var(--muted)]" /></div>
        </div>
      </main>
    )
  }

  const activeTabMeta = tabs.find(tab => tab.id === activeTab) ?? tabs[0]
  const verifiedLabel = emailVerified ? 'Verified account' : 'Verification needed'

  return (
    <main className="min-h-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] px-5 py-6 shadow-[0_20px_60px_-45px_rgba(79,70,229,0.65)] sm:px-8 sm:py-7">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-indigo-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-violet-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative shrink-0">
                <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-bold text-white shadow-lg shadow-indigo-500/25">
                  {avatarUrl ? <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" /> : getInitials(form.fullName)}
                </div>
                <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={savingAvatar} aria-label="Change profile photo" className="absolute -bottom-1.5 -right-1.5 grid h-7 w-7 place-items-center rounded-full border-2 border-[var(--card)] bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60">
                  {savingAvatar ? <LoaderCircle size={13} className="animate-spin" /> : <Camera size={13} />}
                </button>
                <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={chooseAvatar} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">Account settings</p>
                <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">{form.fullName || 'Your profile'}</h1>
                <p className="mt-1 truncate text-sm text-[var(--muted-foreground)]">{form.email || 'Manage your learning identity and preferences'}</p>
              </div>
            </div>
            <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${emailVerified ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300'}`}>
              {emailVerified ? <CheckCircle2 size={15} /> : <Mail size={15} />} {verifiedLabel}
            </div>
          </div>
        </section>

        {notice && (
          <div role="status" className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200'}`}>
            <span className="inline-flex items-center gap-2"><CheckCircle2 size={17} className="shrink-0" /> {notice.message}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification" className="rounded-lg p-0.5 transition hover:bg-black/5 dark:hover:bg-white/10"><X size={16} /></button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
          <nav aria-label="Settings sections" className="flex gap-2 overflow-x-auto rounded-3xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-sm lg:flex-col lg:overflow-visible">
            {tabs.map(({ id, label, description, icon: Icon }) => (
              <button key={id} type="button" onClick={() => setActiveTab(id)} className={`group flex min-w-[165px] items-center gap-3 rounded-2xl p-3 text-left transition lg:min-w-0 ${activeTab === id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-[var(--foreground)] hover:bg-indigo-50/70 dark:hover:bg-indigo-950/25'}`}>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${activeTab === id ? 'bg-white/15 text-white' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/55 dark:text-indigo-300'}`}><Icon size={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className={`mt-0.5 block truncate text-xs ${activeTab === id ? 'text-indigo-100' : 'text-[var(--muted-foreground)]'}`}>{description}</span>
                </span>
                <ChevronRight size={16} className={activeTab === id ? 'text-white' : 'text-[var(--muted-foreground)]'} />
              </button>
            ))}
          </nav>

          <section className="min-w-0 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-7">
            <div className="mb-7 flex items-start justify-between gap-4 border-b border-[var(--border)] pb-5">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-300"><activeTabMeta.icon size={14} /> Settings</div>
                <h2 className="mt-2 text-xl font-bold text-[var(--foreground)]">{activeTabMeta.label}</h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">{activeTabMeta.description}</p>
              </div>
            </div>

            {activeTab === 'profile' && (
              <div className="space-y-7">
                <section>
                  <div className="flex items-center gap-2"><UserRound size={18} className="text-indigo-600 dark:text-indigo-300" /><h3 className="font-semibold text-[var(--foreground)]">Personal details</h3></div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium text-[var(--foreground)]">Full name<input value={form.fullName} onChange={event => setForm(current => ({ ...current, fullName: event.target.value }))} className={inputClass} placeholder="Your full name" /></label>
                    <label className="text-sm font-medium text-[var(--foreground)]">Email address<input type="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} className={inputClass} placeholder="you@example.com" /></label>
                  </div>
                  <p className="mt-3 rounded-xl bg-[var(--muted)] px-3 py-2 text-xs leading-5 text-[var(--muted-foreground)]">Changing your email requires verification before it can be used for your next sign-in.</p>
                </section>

                <section className="border-t border-[var(--border)] pt-6">
                  <div className="flex items-center gap-2"><GraduationCap size={18} className="text-violet-600 dark:text-violet-300" /><h3 className="font-semibold text-[var(--foreground)]">Academic profile</h3></div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium text-[var(--foreground)]">Department<input value={form.department} onChange={event => setForm(current => ({ ...current, department: event.target.value }))} className={inputClass} placeholder="Computer Science & Engineering" /></label>
                    <label className="text-sm font-medium text-[var(--foreground)]">Semester<input value={form.semester} onChange={event => setForm(current => ({ ...current, semester: event.target.value }))} className={inputClass} placeholder="6th Semester" /></label>
                    <label className="text-sm font-medium text-[var(--foreground)]">Roll number<input value={form.rollNumber} onChange={event => setForm(current => ({ ...current, rollNumber: event.target.value }))} className={inputClass} placeholder="e.g. CSE-2024-001" /></label>
                    <label className="text-sm font-medium text-[var(--foreground)]">CGPA<input inputMode="decimal" value={form.cgpa} onChange={event => setForm(current => ({ ...current, cgpa: event.target.value }))} className={inputClass} placeholder="e.g. 8.45" /></label>
                    <label className="text-sm font-medium text-[var(--foreground)] sm:col-span-2">Target goal<input value={form.targetGoal} onChange={event => setForm(current => ({ ...current, targetGoal: event.target.value }))} className={inputClass} placeholder="e.g. GATE preparation and software placement" /></label>
                    <label className="text-sm font-medium text-[var(--foreground)]">Daily study goal<select value={form.dailyGoalHours} onChange={event => setForm(current => ({ ...current, dailyGoalHours: event.target.value }))} className={inputClass}>{[1, 2, 3, 4, 5, 6, 8, 10, 12].map(hours => <option key={hours} value={hours}>{hours} {hours === 1 ? 'hour' : 'hours'} / day</option>)}</select></label>
                    <label className="text-sm font-medium text-[var(--foreground)] sm:col-span-2">Short bio<textarea value={form.bio} onChange={event => setForm(current => ({ ...current, bio: event.target.value }))} rows={3} maxLength={500} className={`${inputClass} resize-y`} placeholder="A short introduction about your learning goals…" /></label>
                  </div>
                </section>

                <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-[var(--muted-foreground)]">Your academic information personalises your workspace and study insights.</p>
                  <button type="button" onClick={() => void saveProfile()} disabled={savingProfile} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"><Save size={16} /> {savingProfile ? 'Saving changes…' : 'Save profile'}</button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-7">
                <section className={`rounded-2xl border p-4 ${emailVerified ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/70 dark:bg-emerald-950/20' : 'border-amber-200 bg-amber-50/70 dark:border-amber-900/70 dark:bg-amber-950/20'}`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${emailVerified ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>{emailVerified ? <CheckCircle2 size={20} /> : <Mail size={20} />}</span><div><h3 className="font-semibold text-[var(--foreground)]">{emailVerified ? 'Email verified' : 'Verify your email'}</h3><p className="mt-1 text-sm text-[var(--muted-foreground)]">{emailVerified ? `${form.email} is verified and ready for account recovery.` : `We need to verify ${form.email} before your next sign-in.`}</p></div></div>
                    {!emailVerified && <button type="button" onClick={() => void resendVerification()} disabled={sendingVerification} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950"><RefreshCw size={15} className={sendingVerification ? 'animate-spin' : ''} /> {sendingVerification ? 'Sending…' : 'Send code'}</button>}
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2"><Lock size={18} className="text-indigo-600 dark:text-indigo-300" /><h3 className="font-semibold text-[var(--foreground)]">Update password</h3></div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Choose a unique password with at least 8 characters, including a letter and a number.</p>
                  <div className="mt-5 space-y-4">
                    <label className="block text-sm font-medium text-[var(--foreground)]">Current password<input type={showPasswords ? 'text' : 'password'} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" className={inputClass} placeholder="Enter current password" /></label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-sm font-medium text-[var(--foreground)]">New password<input type={showPasswords ? 'text' : 'password'} value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete="new-password" className={inputClass} placeholder="At least 8 characters" /></label>
                      <label className="text-sm font-medium text-[var(--foreground)]">Confirm new password<input type={showPasswords ? 'text' : 'password'} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" className={inputClass} placeholder="Repeat new password" /></label>
                    </div>
                    <button type="button" onClick={() => setShowPasswords(value => !value)} className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted-foreground)] transition hover:text-indigo-600 dark:hover:text-indigo-300">{showPasswords ? <EyeOff size={15} /> : <Eye size={15} />}{showPasswords ? 'Hide passwords' : 'Show passwords'}</button>
                  </div>
                  <div className="mt-6 flex justify-end border-t border-[var(--border)] pt-5"><button type="button" onClick={() => void updatePassword()} disabled={savingPassword} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"><Lock size={16} /> {savingPassword ? 'Updating password…' : 'Update password'}</button></div>
                </section>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-7">
                <section>
                  <div className="flex items-center gap-2"><Palette size={18} className="text-indigo-600 dark:text-indigo-300" /><h3 className="font-semibold text-[var(--foreground)]">Appearance</h3></div>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">Choose the visual mode that feels most comfortable for your study sessions.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[{ label: 'Light mode', description: 'Bright and focused for daytime', value: false, icon: Sun }, { label: 'Dark mode', description: 'Easy on the eyes at night', value: true, icon: Moon }].map(theme => {
                      const Icon = theme.icon
                      const selected = dark === theme.value
                      return <button key={theme.label} type="button" aria-pressed={selected} onClick={() => selectTheme(theme.value)} disabled={savingPreference === 'darkMode'} className={`relative rounded-2xl border p-4 text-left transition disabled:opacity-65 ${selected ? 'border-indigo-400 bg-indigo-50/70 shadow-sm dark:border-indigo-700 dark:bg-indigo-950/30' : 'border-[var(--border)] bg-[var(--muted)] hover:border-indigo-300'}`}><span className={`grid h-10 w-10 place-items-center rounded-xl ${theme.value ? 'bg-slate-800 text-white' : 'bg-amber-100 text-amber-600'}`}><Icon size={20} /></span><span className="mt-3 block text-sm font-semibold text-[var(--foreground)]">{theme.label}</span><span className="mt-1 block text-xs text-[var(--muted-foreground)]">{theme.description}</span>{selected && <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-indigo-600 text-white"><Check size={14} strokeWidth={3} /></span>}</button>
                    })}
                  </div>
                </section>

                <section className="border-t border-[var(--border)] pt-6">
                  <div className="flex items-center gap-2"><Bell size={18} className="text-violet-600 dark:text-violet-300" /><h3 className="font-semibold text-[var(--foreground)]">Notifications</h3></div>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">Decide which study updates matter most to you.</p>
                  <div className="mt-4 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
                    {[
                      { key: 'focusReminders', title: 'Focus reminders', description: 'Gentle nudges for planned focus sessions.' },
                      { key: 'flashcardReminders', title: 'Flashcard reviews', description: 'Alerts when revision cards are ready.' },
                      { key: 'classroomUpdates', title: 'Classroom activity', description: 'Announcements and collaborative updates.' },
                      { key: 'weeklyInsights', title: 'Weekly learning insights', description: 'A summary of your progress and habits.' },
                    ].map(item => {
                      const enabled = preferences[item.key] ?? false
                      const isSaving = savingPreference === item.key
                      return <div key={item.key} className="flex items-center justify-between gap-4 p-4"><div><p className="text-sm font-semibold text-[var(--foreground)]">{item.title}</p><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{item.description}</p></div><button type="button" role="switch" aria-checked={enabled} aria-label={`Toggle ${item.title}`} disabled={isSaving} onClick={() => void savePreference(item.key, !enabled)} className={`relative h-7 w-12 shrink-0 rounded-full transition ${enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'} disabled:opacity-60`}><span className={`absolute top-1 grid h-5 w-5 place-items-center rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`}>{isSaving && <LoaderCircle size={11} className="animate-spin text-indigo-600" />}</span></button></div>
                    })}
                  </div>
                </section>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
