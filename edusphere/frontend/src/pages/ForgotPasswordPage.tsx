import { useState } from 'react'
import { ArrowLeft, Mail, Check } from 'lucide-react'
import type { Page } from '../types'
import { api, ApiError } from '../lib/api'

interface Props {
  setPage: (p: Page) => void
}

export default function ForgotPasswordPage({ setPage }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to send reset link. Please check your email.')
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

      {/* ── LEFT — High-Tech Graphic Workspace (Shared Component) ── */}
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

        {/* Center Content & Continuously Floating Tech Graphic Illustration */}
        <div className="relative z-10 space-y-6 my-auto">
          <div>
            <h2 className="text-3xl font-heading font-extrabold text-white leading-tight mb-2 tracking-tight">
              Reset your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Academic Access.</span>
            </h2>
            <p className="text-white/60 text-xs leading-relaxed max-w-sm">
              Don't worry, we'll help you get back into your Smart Workspace securely.
            </p>
          </div>

          {/* Floating High-Tech Network Graphic (Reused) */}
          <div className="animate-float-infinite p-6 rounded-2xl border border-white/15 shadow-2xl bg-gradient-to-br from-[#13112b] to-[#0a0917] relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <span className="text-xs font-mono text-cyan-400 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> Secure Recovery Protocol
              </span>
              <span className="text-[10px] font-mono text-white/40">ID-094</span>
            </div>

            {/* SVG Network Visual Node Mockup (Reused) */}
            <div className="py-4 flex flex-col items-center justify-center space-y-3">
              <svg className="w-full h-32" viewBox="0 0 300 120" fill="none">
                <path d="M30 60 Q 90 20, 150 60 T 270 60" stroke="url(#paint0_linear)" strokeWidth="2" strokeDasharray="4 4" className="animate-pulse" />
                <path d="M30 90 Q 90 60, 150 90 T 270 90" stroke="url(#paint1_linear)" strokeWidth="1.5" />

                {/* Node Circles */}
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
                Authorized password reset request in progress
              </div>
            </div>
          </div>
        </div>

        {/* Footer Metrics (Reused) */}
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

      {/* ── RIGHT — Optimized Password Reset Layout with 4 Distributed Background Orbs ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-4 overflow-y-auto smooth-scroll-container h-full relative">

        {/* 4 Floating Background Glow Orbs Distributed Around the Form (Reused) */}
        <div className="absolute top-4 left-8 w-72 h-72 rounded-full bg-indigo-600/15 blur-[90px] pointer-events-none animate-orb-1" />
        <div className="absolute top-6 right-8 w-80 h-80 rounded-full bg-cyan-600/15 blur-[95px] pointer-events-none animate-orb-2" />
        <div className="absolute bottom-6 left-12 w-72 h-72 rounded-full bg-purple-600/15 blur-[90px] pointer-events-none animate-orb-3" />
        <div className="absolute bottom-4 right-10 w-80 h-80 rounded-full bg-blue-600/15 blur-[100px] pointer-events-none animate-orb-4" />

        <div className="w-full max-w-md my-auto space-y-6 relative z-10">

          {success ? (
            <div className="text-center space-y-4 p-8 rounded-2xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ background: '#10b98115' }}>
                <Check size={40} style={{ color: '#10b981' }} />
              </div>
              <h1 className="text-xl sm:text-2xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>Check your inbox</h1>
              <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                We've sent a password reset link to <strong style={{ color: 'var(--foreground)' }}>{email}</strong>. Please follow the instructions in the email to regain access.
              </p>
              <button
                onClick={() => setPage('login')}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-md transition-all duration-300 hover:opacity-90 hover:scale-[1.01]"
                style={{ background: 'var(--primary)', color: '#fff' }}
              >
                Back to Login
              </button>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-xl sm:text-2xl font-heading font-bold mb-1.5" style={{ color: 'var(--foreground)' }}>Forgot your password?</h1>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                  Enter your registered email address, and we'll send you instructions to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Email Address</label>
                  <div className="relative">
                    <input
                      value={email} onChange={e => setEmail(e.target.value)} required
                      placeholder="akshit@example.com" type="email"
                      className="w-full pl-10 pr-3 py-2.5 rounded-lg text-xs sm:text-sm border outline-none focus:border-primary hover:border-primary/50 transition-all shadow-sm"
                      style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    />
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
                  </div>
                </div>

                {/* Error */}
                <div className="min-h-[10px]">
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
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-xs sm:text-sm shadow-md transition-all duration-300 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                  style={{ background: 'var(--primary)', color: '#fff' }}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Send Reset Instructions'
                  )}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-xs sm:text-sm pt-4" style={{ color: 'var(--muted-foreground)' }}>
            Remember your password?{' '}
            <button onClick={() => setPage('login')} className="font-medium underline hover:opacity-80 transition-opacity flex items-center gap-1.5 mx-auto mt-2" style={{ color: 'var(--primary)' }}>
              <ArrowLeft size={14} /> Back to Log In
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}