import { useState } from 'react'
import { Eye, EyeOff, ArrowRight, GraduationCap, BookOpen, Check } from 'lucide-react'
import type { Page } from '../types'
import { api, ApiError } from '../lib/api'
import type { CurrentUser } from '../types'
import heroImg from '../assets/hhh.png'

interface Props {
  onSignup: (user: CurrentUser) => void
  setPage: (p: Page) => void
}

function strengthLabel(pw: string): { label: string; color: string; width: string } {
  if (!pw) return { label: '', color: 'var(--border)', width: '0%' }
  const score = [pw.length >= 8, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length
  if (score <= 1) return { label: 'Weak', color: '#ef4444', width: '25%' }
  if (score === 2) return { label: 'Fair', color: '#f59e0b', width: '50%' }
  if (score === 3) return { label: 'Good', color: '#3b82f6', width: '75%' }
  return { label: 'Strong', color: '#10b981', width: '100%' }
}

export default function SignUpPage({ onSignup, setPage }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState<'student' | 'teacher'>('student')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [legalNotice, setLegalNotice] = useState<'terms' | 'privacy' | null>(null)

  const strength = strengthLabel(password)
  const passwordMatch = confirm && password === confirm
  const passwordMismatch = confirm && password !== confirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed) { setError('Please agree to the terms to continue.'); return }
    if (passwordMismatch) { setError('Passwords do not match.'); return }
    setError('')
    setLoading(true)
    try {
      const user = await api<CurrentUser>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ full_name: name, email, password, role }),
      })
      onSignup(user)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create your account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex selection:bg-primary/20" style={{ background: 'var(--background)' }}>
      
      {/* ── CUSTOM FLOATING & SMOOTH SCROLL STYLES ── */}
      <style>{`
        @keyframes floatInfinite {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float-infinite {
          animation: floatInfinite 4s ease-in-out infinite;
        }
        @keyframes floatOrb1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-30px, 40px) scale(1.15); }
        }
        @keyframes floatOrb2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(40px, -30px) scale(0.95); }
        }
        @keyframes floatOrb3 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(50px, -40px) scale(1.1); }
        }
        @keyframes floatOrb4 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-40px, -50px) scale(1.05); }
        }
        .animate-orb-1 { animation: floatOrb1 7s ease-in-out infinite; }
        .animate-orb-2 { animation: floatOrb2 9s ease-in-out infinite; }
        .animate-orb-3 { animation: floatOrb3 8s ease-in-out infinite; }
        .animate-orb-4 { animation: floatOrb4 10s ease-in-out infinite; }
        
        .smooth-scroll-container {
          scroll-behavior: smooth;
        }
        .smooth-scroll-container::-webkit-scrollbar {
          width: 5px;
        }
        .smooth-scroll-container::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 9999px;
        }
      `}</style>

      {/* ── LEFT — Clean Modern Code Workspace with Blended Image ── */}
      <div className="hidden lg:flex flex-col justify-between w-5/12 p-8 lg:p-10 relative bg-[#090812] border-r border-white/10 select-none">
        
        {/* Subtle Tech Grid Lines */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3 cursor-pointer group" onClick={() => setPage('landing' as any)}>
          <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg group-hover:scale-105 transition-transform duration-300">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.5" />
              <path d="M5 9h8M9 5v8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="9" cy="9" r="2" fill="white" />
            </svg>
          </div>
          <span className="font-heading font-bold text-base text-white tracking-tight group-hover:text-indigo-300 transition-colors">EduSphere</span>
        </div>

        {/* Center Content & Continuously Floating Image Container */}
        <div className="relative z-10 space-y-6 my-auto">
          <div>
            <h2 className="text-3xl font-heading font-extrabold text-white leading-tight mb-2 tracking-tight">
              Build your academic future with <span className="text-transparent bg-clip-text bg-line-to-r from-indigo-400 to-cyan-400">Smart Workspaces.</span>
            </h2>
            <p className="text-white/60 text-xs leading-relaxed max-w-sm">
              Sync modular notes, execute real-time AI quizzes, and collaborate with your batchmates securely.
            </p>
          </div>

          {/* Floating Image Container */}
          <div className="animate-float-infinite overflow-hidden shadow-2xl">
            <img 
              src={heroImg} 
              alt="EduSphere AI Workspace" 
              className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-500 rounded-xl"
            />
          </div>
        </div>

        {/* Footer Metrics */}
        <div className="relative z-10 pt-4 border-t border-white/10">
          <div className="flex justify-between">
            {[['50K+', 'Active Users'], ['<45ms', 'Latency'], ['100%', 'Encrypted']].map(([v, l]) => (
              <div key={l} className="group cursor-pointer">
                <div className="text-white font-heading font-bold text-sm group-hover:text-cyan-400 transition-colors">{v}</div>
                <div className="text-white/40 text-[10px]">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT — Optimized Form Layout with 4 Distributed Background Orbs ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-4 overflow-y-auto smooth-scroll-container h-full relative">
        
        {/* 4 Floating Background Glow Orbs Distributed Around the Form */}
        <div className="absolute top-4 left-8 w-72 h-72 rounded-full bg-indigo-600/15 blur-[90px] pointer-events-none animate-orb-1" />
        <div className="absolute top-6 right-8 w-80 h-80 rounded-full bg-cyan-600/15 blur-[95px] pointer-events-none animate-orb-2" />
        <div className="absolute bottom-6 left-12 w-72 h-72 rounded-full bg-purple-600/15 blur-[90px] pointer-events-none animate-orb-3" />
        <div className="absolute bottom-4 right-10 w-80 h-80 rounded-full bg-blue-600/15 blur-[100px] pointer-events-none animate-orb-4" />

        <div className="w-full max-w-md my-auto space-y-3.5 relative z-10">
          
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold mb-0.5" style={{ color: 'var(--foreground)' }}>Create your account</h1>
            <p className="text-xs sm:text-sm" style={{ color: 'var(--muted-foreground)' }}>Start learning smarter with EduSphere.</p>
          </div>

          {/* Social Buttons Container */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Google button */}
            <button
              type="button"
              onClick={() => setError('Google sign-up is not configured yet.')}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-all duration-300 hover:border-primary/50 hover:bg-muted hover:-translate-y-0.5 active:translate-y-0 shadow-sm"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--card)' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </button>

            {/* GitHub button */}
            <button
              type="button"
              onClick={() => setError('GitHub sign-up is not configured yet.')}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-all duration-300 hover:border-primary/50 hover:bg-muted hover:-translate-y-0.5 active:translate-y-0 shadow-sm"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--card)' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </button>
          </div>

          <div className="my-2.5 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>or email</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          {/* Role selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium" style={{ color: 'var(--foreground)' }}>I am a...</label>
            <div className="grid grid-cols-2 gap-2">
              {([['student', GraduationCap, 'Student', 'Learning'], ['teacher', BookOpen, 'Teacher', 'Teaching']] as const).map(([id, Icon, label, sub]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setRole(id)}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-left transition-all duration-300 hover:border-primary/60 hover:scale-[1.01]"
                  style={{ borderColor: role === id ? 'var(--primary)' : 'var(--border)', background: role === id ? 'var(--secondary-bg)' : 'var(--muted)' }}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform hover:scale-110" style={{ background: role === id ? 'var(--primary)' : 'var(--card)' }}>
                    <Icon size={14} style={{ color: role === id ? '#fff' : 'var(--muted-foreground)' }} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{label}</div>
                    <div className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>{sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Full name */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--foreground)' }}>Full Name</label>
              <input
                value={name} onChange={e => setName(e.target.value)} required
                placeholder="Akshit Kumar" type="text"
                className="w-full px-3 py-2 rounded-lg text-xs sm:text-sm border outline-none focus:border-primary hover:border-primary/50 transition-all shadow-sm"
                style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--foreground)' }}>Email Address</label>
              <input
                value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="akshit@example.com" type="email"
                className="w-full px-3 py-2 rounded-lg text-xs sm:text-sm border outline-none focus:border-primary hover:border-primary/50 transition-all shadow-sm"
                style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--foreground)' }}>Password</label>
              <div className="relative">
                <input
                  value={password} onChange={e => setPassword(e.target.value)} required
                  type={showPass ? 'text' : 'password'} placeholder="Create password"
                  className="w-full px-3 py-2 rounded-lg text-xs sm:text-sm border outline-none focus:border-primary hover:border-primary/50 transition-all shadow-sm pr-9"
                  style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-foreground transition-colors" style={{ color: 'var(--muted-foreground)' }}>
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {/* Strength bar */}
              <div className="mt-1.5 min-[22px]">
                {password && (
                  <>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: strength.width, background: strength.color }} />
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <div className="flex gap-1.5">
                        {[
                          { test: password.length >= 8, label: '8+' },
                          { test: /[A-Z]/.test(password), label: 'A-Z' },
                          { test: /[0-9]/.test(password), label: '0-9' },
                          { test: /[^A-Za-z0-9]/.test(password), label: '#' },
                        ].map(({ test, label }) => (
                          <span key={label} className="text-[10px]" style={{ color: test ? '#10b981' : 'var(--muted-foreground)' }}>
                            {test ? '✓' : '○'} {label}
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] font-medium" style={{ color: strength.color }}>{strength.label}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--foreground)' }}>Confirm Password</label>
              <div className="relative">
                <input
                  value={confirm} onChange={e => setConfirm(e.target.value)} required
                  type={showConfirm ? 'text' : 'password'} placeholder="Repeat password"
                  className="w-full px-3 py-2 rounded-lg text-xs sm:text-sm border outline-none hover:border-primary/50 transition-all shadow-sm pr-9"
                  style={{
                    background: 'var(--muted)',
                    borderColor: passwordMismatch ? '#ef4444' : passwordMatch ? '#10b981' : 'var(--border)',
                    color: 'var(--foreground)'
                  }}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-foreground transition-colors" style={{ color: 'var(--muted-foreground)' }}>
                  {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <div className="min-[16px] mt-0.5">
                {passwordMismatch && <p className="text-[11px]" style={{ color: '#ef4444' }}>Passwords do not match</p>}
                {passwordMatch && <p className="text-[11px]" style={{ color: '#10b981' }}>✓ Passwords match</p>}
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="flex items-center gap-2 group">
                <button
                  type="button"
                  aria-label="Agree to terms and privacy policy"
                  aria-pressed={agreed}
                  onClick={() => setAgreed(value => !value)}
                  className="rounded border-2 flex items-center justify-center shrink-0 transition-all group-hover:border-primary"
                  style={{ background: agreed ? 'var(--primary)' : 'transparent', borderColor: agreed ? 'var(--primary)' : 'var(--border)', width: 16, height: 16 }}
                >
                  {agreed && <Check size={10} className="text-white" />}
                </button>
                <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                  I agree to the <button type="button" onClick={() => setLegalNotice('terms')} className="underline hover:text-foreground transition-colors" style={{ color: 'var(--primary)' }}>Terms</button> & <button type="button" onClick={() => setLegalNotice('privacy')} className="underline hover:text-foreground transition-colors" style={{ color: 'var(--primary)' }}>Privacy Policy</button>
                </span>
            </div>

            {/* Error */}
            <div className="min-[10px]">
              {error && (
                <div className="px-3 py-2 rounded-lg text-xs border" style={{ background: '#ef444415', borderColor: '#ef444440', color: '#ef4444' }}>
                  {error}
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-md transition-all duration-300 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
              style={{ background: 'var(--primary)', color: '#fff' }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <> Create Account <ArrowRight size={14} /> </>
              )}
            </button>
          </form>

          <p className="text-center text-xs sm:text-sm pt-1" style={{ color: 'var(--muted-foreground)' }}>
            Already have an account?{' '}
            <button onClick={() => setPage('login')} className="font-medium underline hover:opacity-80 transition-opacity" style={{ color: 'var(--primary)' }}>Log In</button>
          </p>
        </div>
      </div>
      {legalNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setLegalNotice(null)}>
          <div className="w-full max-w-md rounded-2xl border p-6 shadow-xl" onClick={event => event.stopPropagation()} style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <h2 className="font-heading font-bold text-lg mb-3" style={{ color: 'var(--foreground)' }}>{legalNotice === 'terms' ? 'Terms of Use' : 'Privacy Policy'}</h2>
            <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--muted-foreground)' }}>{legalNotice === 'terms' ? 'Use EduSphere only for lawful academic work, keep your account credentials secure, and respect your classmates’ content.' : 'Your study content is kept in your account workspace. Do not upload sensitive information you are not authorized to share.'}</p>
            <button type="button" onClick={() => setLegalNotice(null)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--primary)', color: '#fff' }}>I understand</button>
          </div>
        </div>
      )}
    </div>
  )
}
