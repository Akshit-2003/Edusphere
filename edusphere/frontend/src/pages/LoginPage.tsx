import { useState } from 'react'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import type { Page } from '../types'
import { api, ApiError } from '../lib/api'
import type { CurrentUser } from '../types'

interface Props {
  onLogin: (user: CurrentUser) => void
  onSignup: () => void
  onForgot: () => void
  onBack: () => void
  onVerify: (email: string) => void
  setPage?: (p: Page) => void
}

export default function LoginPage({ onLogin, onSignup, onForgot, onBack, onVerify }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await api<CurrentUser>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      onLogin(user)
    } catch (err) {
      if (err instanceof ApiError && err.status === 403 && /verify/i.test(err.message)) {
        onVerify(email)
        return
      }
      setError(err instanceof ApiError ? err.message : 'Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex selection:bg-primary/20" style={{ background: 'var(--background)' }}>

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

      {/* LEFT PANEL */}
      <div className="hidden lg:flex flex-col justify-between w-5/12 p-8 lg:p-10 relative bg-[#090812] border-r border-white/10 select-none">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }} />

        <div className="relative z-10 flex items-center gap-3 cursor-pointer group" onClick={onBack}>
          <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg group-hover:scale-105 transition-transform duration-300">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.5" />
              <path d="M5 9h8M9 5v8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="9" cy="9" r="2" fill="white" />
            </svg>
          </div>
          <span className="font-heading font-bold text-base text-white tracking-tight group-hover:text-indigo-300 transition-colors">EduSphere</span>
        </div>

        <div className="relative z-10 space-y-6 my-auto">
          <div>
            <h2 className="text-3xl font-heading font-extrabold text-white leading-tight mb-2 tracking-tight">
              Welcome back to your <span className="text-transparent bg-clip-text bg-linear-to-br from-indigo-400 to-cyan-400">Smart Workspace.</span>
            </h2>
            <p className="text-white/60 text-xs leading-relaxed max-w-sm">
              Continue your academic journey, access your AI notes, and stay ahead in your classes.
            </p>
          </div>

          <div className="animate-float-infinite p-6 rounded-2xl border border-white/15 shadow-2xl bg-linear-to-br from-[#13112b] to-[#0a0917] relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <span className="text-xs font-mono text-cyan-400 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> Neural AI Grid Active
              </span>
              <span className="text-[10px] font-mono text-white/40">v2.4.9</span>
            </div>

            <div className="py-4 flex flex-col items-center justify-center space-y-3">
              <svg className="w-full h-32" viewBox="0 0 300 120" fill="none">
                <path d="M30 60 Q 90 20, 150 60 T 270 60" stroke="url(#paint0_linear)" strokeWidth="2" strokeDasharray="4 4" className="animate-pulse" />
                <path d="M30 90 Q 90 60, 150 90 T 270 90" stroke="url(#paint1_linear)" strokeWidth="1.5" />
                <circle cx="30" cy="60" r="8" fill="#6366f1" className="animate-ping" />
                <circle cx="30" cy="60" r="6" fill="#818cf8" />
                <circle cx="150" cy="60" r="12" fill="#06b6d4" fillOpacity="0.3" />
                <circle cx="150" cy="60" r="6" fill="#22d3ee" />
                <circle cx="270" cy="60" r="8" fill="#10b981" />
                <defs>
                  <linearGradient id="paint0_linear" x1="30" y1="60" x2="270" y2="60" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#818cf8" />
                    <stop offset="0.5" stopColor="#22d3ee" />
                    <stop offset="1" stopColor="#10b981" />
                  </linearGradient>
                  <linearGradient id="paint1_linear" x1="30" y1="90" x2="270" y2="90" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6366f1" stopOpacity="0.5" />
                    <stop offset="1" stopColor="#06b6d4" stopOpacity="0.5" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="text-[11px] font-mono text-white/70 text-center">
                Real-time multi-tenant academic synchronization enabled
              </div>
            </div>
          </div>
        </div>

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

      {/* RIGHT PANEL */}
      <div className="flex-1 flex items-center justify-center px-6 py-4 overflow-y-auto smooth-scroll-container h-full relative">
        <div className="absolute top-4 left-8 w-72 h-72 rounded-full bg-indigo-600/15 blur-[90px] pointer-events-none animate-orb-1" />
        <div className="absolute top-6 right-8 w-80 h-80 rounded-full bg-cyan-600/15 blur-[95px] pointer-events-none animate-orb-2" />
        <div className="absolute bottom-6 left-12 w-72 h-72 rounded-full bg-purple-600/15 blur-[90px] pointer-events-none animate-orb-3" />
        <div className="absolute bottom-4 right-10 w-80 h-80 rounded-full bg-blue-600/15 blur-[100px] pointer-events-none animate-orb-4" />

        <div className="w-full max-w-md my-auto space-y-4 relative z-10">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold mb-1" style={{ color: 'var(--foreground)' }}>Welcome back</h1>
            <p className="text-xs sm:text-sm" style={{ color: 'var(--muted-foreground)' }}>Please enter your details to log in.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--foreground)' }}>Email Address</label>
              <input
                value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="akshit@example.com" type="email"
                className="w-full px-3 py-2.5 rounded-lg text-xs sm:text-sm border outline-none focus:border-primary hover:border-primary/50 transition-all shadow-sm"
                style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium" style={{ color: 'var(--foreground)' }}>Password</label>
                <button type="button" onClick={onForgot} className="text-[11px] hover:underline" style={{ color: 'var(--primary)' }}>
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  value={password} onChange={e => setPassword(e.target.value)} required
                  type={showPass ? 'text' : 'password'} placeholder="Enter your password"
                  className="w-full px-3 py-2.5 rounded-lg text-xs sm:text-sm border outline-none focus:border-primary hover:border-primary/50 transition-all shadow-sm pr-9"
                  style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-foreground transition-colors" style={{ color: 'var(--muted-foreground)' }}>
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="min-h-2.5">
              {error && (
                <div className="px-3 py-2 rounded-lg text-xs border" style={{ background: '#ef444415', borderColor: '#ef444440', color: '#ef4444' }}>
                  {error}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-xs sm:text-sm shadow-md transition-all duration-300 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
              style={{ background: 'var(--primary)', color: '#fff' }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <> Log In <ArrowRight size={14} /> </>
              )}
            </button>
          </form>

          <p className="text-center text-xs sm:text-sm pt-2" style={{ color: 'var(--muted-foreground)' }}>
            Don't have an account?{' '}
            <button onClick={onSignup} className="font-medium underline hover:opacity-85 transition-opacity" style={{ color: 'var(--primary)' }}>Sign up</button>
          </p>
        </div>
      </div>
    </div>
  )
}
