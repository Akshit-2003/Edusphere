import { useEffect, useState } from 'react'
import { ArrowRight, Check, Mail, RefreshCw, ShieldCheck } from 'lucide-react'
import type { CurrentUser, Page } from '../types'
import { api, ApiError } from '../lib/api'

interface Props {
  email: string
  onVerified: (user: CurrentUser) => void
  setPage: (p: Page) => void
}

type OtpDelivery = { message: string; delivery: 'email' | 'console' }

export default function EmailVerificationPage({ email, onVerified, setPage }: Props) {
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const requestCode = async () => {
    if (!email || sending || cooldown > 0) return
    setSending(true)
    setError('')
    try {
      const response = await api<OtpDelivery>('/auth/email-verification/resend', {
        method: 'POST', body: JSON.stringify({ email }),
      })
      setMessage(response.delivery === 'console'
        ? 'Development mode: the OTP is printed in the backend server log.'
        : response.message)
      setCooldown(60)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Could not send the code. Please try again.')
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    if (!email) return
    void requestCode()
    // The screen is mounted once per verification attempt; this sends the first OTP.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => setCooldown(value => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  const verify = async (event: React.FormEvent) => {
    event.preventDefault()
    if (code.length !== 6) { setError('Enter the 6-digit verification code.'); return }
    setVerifying(true)
    setError('')
    try {
      const user = await api<CurrentUser>('/auth/email-verification/verify', {
        method: 'POST', body: JSON.stringify({ email, code }),
      })
      onVerified(user)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Verification failed. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  if (!email) {
    return <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-md rounded-2xl border p-6 text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <h1 className="font-heading font-bold text-xl mb-2" style={{ color: 'var(--foreground)' }}>Verification session expired</h1>
        <p className="text-sm mb-5" style={{ color: 'var(--muted-foreground)' }}>Please sign in again to request a new code.</p>
        <button onClick={() => setPage('login')} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--primary)', color: '#fff' }}>Back to login</button>
      </div>
    </div>
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-md rounded-3xl border p-7 sm:p-8 shadow-xl page-enter" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" style={{ background: 'var(--secondary-bg)' }}>
          <ShieldCheck size={26} style={{ color: 'var(--primary)' }} />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4" style={{ background: 'var(--secondary-bg)', color: 'var(--primary)' }}>
          <Mail size={13} /> Secure email verification
        </div>
        <h1 className="text-2xl font-heading font-bold mb-2" style={{ color: 'var(--foreground)' }}>Enter your OTP</h1>
        <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--muted-foreground)' }}>We sent a 6-digit verification code to:</p>
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border mb-6" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
          <Mail size={15} style={{ color: 'var(--primary)' }} /><span className="text-sm font-medium break-all">{email}</span>
        </div>

        <form onSubmit={verify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>Verification code</label>
            <input
              autoFocus
              value={code}
              onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="w-full rounded-xl border px-4 py-3 text-center text-2xl font-mono tracking-[0.45em] outline-none focus:border-primary"
              style={{ background: 'var(--muted)', borderColor: error ? '#ef4444' : 'var(--border)', color: 'var(--foreground)' }}
            />
          </div>
          {message && <p className="rounded-lg px-3 py-2 text-xs" style={{ background: '#10b98115', color: '#10b981' }}>{message}</p>}
          {error && <p className="rounded-lg px-3 py-2 text-xs" style={{ background: '#ef444415', color: '#ef4444' }}>{error}</p>}
          <button type="submit" disabled={verifying || code.length !== 6} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50" style={{ background: 'var(--primary)', color: '#fff' }}>
            {verifying ? <RefreshCw size={16} className="animate-spin" /> : <><Check size={16} /> Verify email <ArrowRight size={16} /></>}
          </button>
        </form>

        <div className="mt-5 pt-5 border-t text-center" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs mb-3" style={{ color: 'var(--muted-foreground)' }}>The code expires in 10 minutes.</p>
          <button onClick={() => void requestCode()} disabled={sending || cooldown > 0} className="inline-flex items-center gap-2 text-sm font-medium disabled:opacity-50" style={{ color: 'var(--primary)' }}>
            <RefreshCw size={14} className={sending ? 'animate-spin' : ''} />
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend verification code'}
          </button>
          <button onClick={() => setPage('login')} className="block mx-auto mt-4 text-xs hover:underline" style={{ color: 'var(--muted-foreground)' }}>Use a different account</button>
        </div>
      </div>
    </div>
  )
}
