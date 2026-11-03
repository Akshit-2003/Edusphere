import { useEffect, useRef, useState } from 'react'
import { Camera, Bell, Lock, Palette, Shield, Bot } from 'lucide-react'
import { api, ApiError, currentUserId } from '../lib/api'

const sections = [
  { id: 'account', label: 'Account', icon: Camera },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'ai', label: 'AI Preferences', icon: Bot },
]

const notificationPreferences = [
  ['Flashcard reminders', 'Get notified when cards are due for review'],
  ['Quiz deadlines', 'Reminders before scheduled quizzes'],
  ['AI insights', 'Weekly performance reports from AI'],
  ['Classroom messages', 'New messages in your classrooms'],
  ['Assignment due dates', 'Reminders for upcoming deadlines'],
]

const aiPreferences = [
  ['Context-aware responses', 'Use your notes as context for AI answers'],
  ['Auto-generate flashcards', 'Suggest flashcards after reading notes'],
  ['Study plan suggestions', 'AI recommends daily study plans'],
  ['Difficulty adaptation', 'Adjust quiz difficulty based on performance'],
]

const defaultPreferences = Object.fromEntries([...notificationPreferences, ...aiPreferences].map(([title]) => [title, true]))

interface StoredProfile {
  full_name: string
  email: string
  bio: string | null
  daily_goal_hours: number
  preferences: Record<string, boolean>
  avatar_url: string | null
}

export default function ProfilePage({ dark, setDark }: { dark: boolean; setDark: (d: boolean) => void }) {
  const [active, setActive] = useState('account')
  const [name, setName] = useState('Akshit Kumar')
  const [bio, setBio] = useState('B.Tech CSE student. Passionate about networking and machine learning.')
  const [goal, setGoal] = useState('8')
  const [email, setEmail] = useState('')
  const [saved, setSaved] = useState(false)
  const [profileNotice, setProfileNotice] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [avatarNotice, setAvatarNotice] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordNotice, setPasswordNotice] = useState('')
  const [preferences, setPreferences] = useState<Record<string, boolean>>(defaultPreferences)
  const [preferenceNotice, setPreferenceNotice] = useState('')
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const userId = currentUserId()
    if (!userId) return
    api<StoredProfile>(`/profiles/${userId}`).then(profile => {
      setName(profile.full_name)
      setEmail(profile.email)
      setBio(profile.bio ?? '')
      setGoal(String(profile.daily_goal_hours))
      setPreferences({ ...defaultPreferences, ...profile.preferences })
      if (profile.avatar_url) {
        setAvatarPreview(profile.avatar_url)
      } else {
        setAvatarPreview(localStorage.getItem(`edusphere.avatar.${userId}`) ?? '')
      }
    }).catch(() => setProfileNotice('Profile settings could not be loaded. Please try again.'))
  }, [])

  const saveProfile = async () => {
    const userId = currentUserId()
    if (!userId) return
    if (name.trim().length < 2) { setProfileNotice('Your name needs at least 2 characters.'); return }
    setSavingProfile(true)
    setProfileNotice('')
    try {
      const profile = await api<StoredProfile>(`/profiles/${userId}`, { method: 'PUT', body: JSON.stringify({ full_name: name.trim(), bio, daily_goal_hours: Number(goal) }) })
      setName(profile.full_name)
      const storedUser = localStorage.getItem('edusphere.currentUser')
      if (storedUser) {
        localStorage.setItem('edusphere.currentUser', JSON.stringify({ ...JSON.parse(storedUser), full_name: profile.full_name }))
      }
      setSaved(true)
      setProfileNotice('Profile changes saved to your account.')
      window.setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      setProfileNotice(error instanceof ApiError ? error.message : 'Profile changes could not be saved. Please try again.')
    } finally {
      setSavingProfile(false)
    }
  }

  const chooseAvatar = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    const userId = currentUserId()
    if (!file || !userId) return
    if (!file.type.startsWith('image/')) {
      setAvatarNotice('Please choose an image file.')
      return
    }
    if (file.size > 750 * 1024) {
      setAvatarNotice('Choose an image smaller than 750 KB.')
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      const preview = String(reader.result ?? '')
      try {
        const profile = await api<StoredProfile>(`/profiles/${userId}`, { method: 'PUT', body: JSON.stringify({ avatar_url: preview }) })
        setAvatarPreview(profile.avatar_url ?? preview)
        try { localStorage.setItem(`edusphere.avatar.${userId}`, profile.avatar_url ?? preview) } catch { /* database remains the source of truth */ }
        setAvatarNotice('Avatar saved to your account.')
      } catch (error) {
        setAvatarNotice(error instanceof ApiError ? error.message : 'Avatar could not be saved. Please try again.')
      }
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const updatePassword = async () => {
    const userId = currentUserId()
    if (!userId) return
    if (newPassword.length < 8) { setPasswordNotice('New password must be at least 8 characters.'); return }
    setPasswordNotice('')
    try {
      const response = await api<{ message: string }>(`/auth/users/${userId}/password`, {
        method: 'PUT',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      setCurrentPassword('')
      setNewPassword('')
      setPasswordNotice(response.message)
    } catch (error) {
      setPasswordNotice(error instanceof ApiError ? error.message : 'Unable to update password.')
    }
  }

  const togglePreference = async (title: string) => {
    const userId = currentUserId()
    if (!userId) return
    const before = preferences
    const next = { ...preferences, [title]: !preferences[title] }
    setPreferences(next)
    setPreferenceNotice('')
    try {
      const profile = await api<StoredProfile>(`/profiles/${userId}`, {
        method: 'PUT', body: JSON.stringify({ preferences: next }),
      })
      setPreferences({ ...defaultPreferences, ...profile.preferences })
      setPreferenceNotice('Preference saved to your account.')
    } catch (error) {
      setPreferences(before)
      setPreferenceNotice(error instanceof ApiError ? error.message : 'Preference could not be saved. Please try again.')
    }
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-16 sm:w-52 border-r shrink-0 p-3" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="hidden sm:block text-xs font-semibold uppercase tracking-wider mb-2 px-2" style={{ color: 'var(--muted-foreground)' }}>Settings</div>
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            aria-label={label}
            className={`w-full flex items-center justify-center sm:justify-start gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all mb-0.5 ${active === id ? 'bg-primary text-white' : 'hover:bg-muted'}`}
            style={{ color: active === id ? '#fff' : 'var(--muted-foreground)' }}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 max-w-2xl">
        {active === 'account' && (
          <div className="page-enter space-y-6">
            <h2 className="text-xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>Account Settings</h2>

            {/* Avatar */}
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-3xl font-bold overflow-hidden" style={avatarPreview ? { backgroundImage: `url(${avatarPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>{avatarPreview ? '' : (name.trim()[0] ?? 'U').toUpperCase()}</div>
                <button onClick={() => avatarInputRef.current?.click()} aria-label="Choose profile image" className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-2 flex items-center justify-center" style={{ background: 'var(--primary)', borderColor: 'var(--card)', color: '#fff' }}>
                  <Camera size={12} />
                </button>
                <input ref={avatarInputRef} onChange={chooseAvatar} type="file" accept="image/*" className="hidden" />
              </div>
              <div>
                <div className="font-semibold" style={{ color: 'var(--foreground)' }}>{name}</div>
                <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{email}</div>
                <div className="text-xs mt-1 px-2 py-0.5 rounded-full inline-block" style={{ background: 'var(--secondary-bg)', color: 'var(--primary)' }}>Student</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Full Name</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none focus:border-primary" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Email</label>
                <input value={email} disabled className="w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none focus:border-primary" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Bio</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none focus:border-primary resize-none" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Daily Study Goal (hours)</label>
                <select value={goal} onChange={e => setGoal(e.target.value)} className="w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                  {['2', '4', '6', '8', '10', '12'].map(h => <option key={h}>{h}</option>)}
                </select>
              </div>
              <button onClick={() => void saveProfile()} disabled={savingProfile} className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50" style={{ background: 'var(--primary)', color: '#fff' }}>{savingProfile ? 'Saving…' : saved ? 'Saved' : 'Save Changes'}</button>
              {avatarNotice && <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{avatarNotice}</p>}
              {profileNotice && <p className="text-xs" style={{ color: profileNotice.includes('saved') ? '#047857' : '#dc2626' }}>{profileNotice}</p>}
            </div>
          </div>
        )}

        {active === 'appearance' && (
          <div className="page-enter space-y-6">
            <h2 className="text-xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>Appearance</h2>
            <div>
              <div className="text-sm font-medium mb-3" style={{ color: 'var(--foreground)' }}>Theme</div>
              <div className="flex gap-3">
                {[{ label: 'Light', dark: false }, { label: 'Dark', dark: true }].map(t => (
                  <button
                    key={t.label}
                    onClick={() => setDark(t.dark)}
                    className="flex-1 p-4 rounded-xl border-2 text-sm font-medium transition-all"
                    style={{ borderColor: dark === t.dark ? 'var(--primary)' : 'var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
                  >
                    <div className="w-full h-12 rounded-lg mb-2" style={{ background: t.dark ? '#0a0a12' : '#f8f9fc', border: '1px solid var(--border)' }} />
                    {t.label}
                    {dark === t.dark && <div className="text-xs mt-1" style={{ color: 'var(--primary)' }}>Active</div>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {active === 'notifications' && (
          <div className="page-enter space-y-6">
            <h2 className="text-xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>Notifications</h2>
            {notificationPreferences.map(([title, desc]) => (
              <div key={title} className="flex items-center justify-between p-4 rounded-xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{title}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{desc}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={preferences[title] ?? true} onChange={() => void togglePreference(title)} className="sr-only peer" />
                  <div className="w-9 h-5 rounded-full peer peer-checked:bg-primary transition-colors" style={{ background: 'var(--muted)' }}>
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-4 shadow-sm" />
                  </div>
                </label>
              </div>
            ))}
            <p className="text-xs" style={{ color: preferenceNotice.includes('could not') ? '#dc2626' : 'var(--muted-foreground)' }}>{preferenceNotice || 'Preference changes are saved to your account.'}</p>
          </div>
        )}

        {active === 'ai' && (
          <div className="page-enter space-y-6">
            <h2 className="text-xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>AI Preferences</h2>
            {aiPreferences.map(([title, desc]) => (
              <div key={title} className="flex items-center justify-between p-4 rounded-xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{title}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{desc}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={preferences[title] ?? true} onChange={() => void togglePreference(title)} className="sr-only peer" />
                  <div className="w-9 h-5 rounded-full peer peer-checked:bg-primary transition-all" style={{ background: 'var(--muted)' }}>
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-4 shadow-sm" />
                  </div>
                </label>
              </div>
            ))}
            <p className="text-xs" style={{ color: preferenceNotice.includes('could not') ? '#dc2626' : 'var(--muted-foreground)' }}>{preferenceNotice || 'Preference changes are saved to your account.'}</p>
          </div>
        )}

        {(active === 'security' || active === 'privacy') && (
          <div className="page-enter">
            <h2 className="text-xl font-heading font-bold mb-6" style={{ color: 'var(--foreground)' }}>{sections.find(s => s.id === active)?.label}</h2>
            <div className="space-y-4">
              {active === 'security' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Current Password</label>
                    <input value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} type="password" autoComplete="current-password" className="w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>New Password</label>
                    <input value={newPassword} onChange={event => setNewPassword(event.target.value)} type="password" autoComplete="new-password" className="w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                  </div>
                  <button onClick={() => void updatePassword()} className="px-5 py-2.5 rounded-lg text-sm font-medium" style={{ background: 'var(--primary)', color: '#fff' }}>Update Password</button>
                  {passwordNotice && <p className="text-sm" style={{ color: passwordNotice.includes('success') ? '#10b981' : '#ef4444' }}>{passwordNotice}</p>}
                </>
              ) : (
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Privacy settings and data management options.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
