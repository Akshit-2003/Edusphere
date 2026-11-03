import { useState, useEffect } from 'react'
import {
  ArrowRight, Bot, Users, BarChart2, Search,
  ListTodo,
  FileText, Share2, Zap, Star, Play,
  Menu, X, ShieldCheck, GraduationCap, Cpu, Database, CheckCircle2, Activity, Terminal, Box, Globe
} from 'lucide-react'
import type { Page } from '../types'

interface Props {
  setPage: (p: Page) => void
  onLogin: () => void
  onSignup: () => void
}

const navLinks = ['Features', 'AI Ecosystem', 'Workspaces', 'Analytics', 'Students', 'Teachers']

const navTargets: Record<string, string> = {
  Features: 'features',
  'AI Ecosystem': 'ai-learning',
  Workspaces: 'collaboration',
  Analytics: 'knowledge-graph',
  Students: 'students',
  Teachers: 'teachers',
}

const features = [
  { icon: FileText, title: 'Modular Block Workspaces', desc: 'Notion-inspired rich text and code editing blocks with real-time cloud synchronization across all devices.', color: '#4f46e5' },
  { icon: Users, title: 'Multi-User Live Rooms', desc: 'Collaborate with peers seamlessly using real-time presence indicators, live cursors, and inline thread comments.', color: '#10b981' },
  { icon: ListTodo, title: 'Advanced Study Planner', desc: 'A hybrid of Kanban sprints and dynamic academic calendars to track coursework, assignments, and exams.', color: '#f59e0b' },
  { icon: Bot, title: 'Contextual AI Engine', desc: 'An intelligent companion trained strictly on your uploaded notes, slides, and syllabus documents.', color: '#7c3aed' },
  { icon: Share2, title: 'Interactive Knowledge Graphs', desc: 'Visualize conceptual linkages across subjects to instantly pinpoint knowledge gaps and track absolute mastery.', color: '#3b82f6' },
  { icon: Search, title: 'Semantic Library Search', desc: 'Query your entire resource repository using natural conversational language to get precise citations instantly.', color: '#ef4444' },
]

const heroImpactStats = [
  { label: 'Cloud Persistence', value: 'Neon PostgreSQL', desc: 'Secure asyncpg connection', icon: Database, color: '#4f46e5' },
  { label: 'API Latency', value: '< 45ms', desc: 'Blazing fast FastAPI backend', icon: Zap, color: '#10b981' },
  { label: 'Active Students', value: '50,000+', desc: 'Real-time collaborative pool', icon: Users, color: '#7c3aed' },
  { label: 'System Health', value: '100% Stable', desc: 'CORS & Endpoints verified', icon: Activity, color: '#f59e0b' },
]

const testimonials = [
  { name: 'Rahul Mehta', role: 'B.Tech CSE, Final Year', text: 'EduSphere completely transformed how our batch manages technical documentation and exam revision cycles.', stars: 5 },
  { name: 'Priya Sharma', role: 'Medical Science Student', text: 'The dynamic knowledge mapping feature helps connect complex clinical topics effortlessly. Absolute game-changer.', stars: 5 },
  { name: 'Dr. Vikram Singh', role: 'Professor & Department Head', text: 'Managing batch coursework, deploying notes, and reviewing academic submissions has never been more organized.', stars: 5 },
]

export default function LandingPage({ onLogin, onSignup }: Props) {
  const [mobileMenu, setMobileMenu] = useState(false)
  const [activeTab, setActiveTab] = useState<'notes' | 'ai' | 'analytics'>('notes')
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavClick = (label: string) => {
    document.getElementById(navTargets[label])?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMobileMenu(false)
  }

  return (
    <div style={{ background: 'var(--background)', color: 'var(--foreground)' }} className="min-h-screen page-enter selection:bg-primary/20">

      {/* Custom Styles for Spinning Border Animation */}
      <style>{`
        @keyframes spinBorder {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .rotating-border-card {
          position: relative;
          border-radius: 1.75rem;
          overflow: hidden;
          padding: 2.5px; /* Border thickness */
        }
        .rotating-border-card::before {
          content: '';
          position: absolute;
          inset: -100%;
          background: conic-gradient(from 0deg, #4f46e5, #06b6d4, #10b981, #f59e0b, #ef4444, #8b5cf6, #4f46e5);
          animation: spinBorder 4s linear infinite;
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(1deg); }
        }
        .animate-float-slow {
          animation: floatSlow 6s ease-in-out infinite;
        }
        .perspective-container {
          perspective: 1200px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
      `}</style>

      {/* ── STICKY WRAPPER (Zero Height) ── */}
      <div className="sticky top-0 z-50 h-0 overflow-visible w-full">
        {/* ── NAVBAR (100% Transparent at Top, Solid on Scroll) ── */}
        <nav
          className="flex items-center px-6 lg:px-10 h-16 transition-all duration-300 w-full"
          style={{
            backgroundColor: isScrolled ? 'color-mix(in srgb, var(--card) 85%, transparent)' : 'transparent',
            backdropFilter: isScrolled ? 'blur(12px)' : 'none',
            WebkitBackdropFilter: isScrolled ? 'blur(12px)' : 'none',
            borderBottom: isScrolled ? '1px solid var(--border)' : '1px solid transparent',
            boxShadow: isScrolled ? '0 4px 20px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          <div className="flex items-center gap-2.5 mr-10 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md shadow-primary/20" style={{ background: 'var(--primary)' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.5" />
                <path d="M5 9h8M9 5v8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="9" cy="9" r="2" fill="white" />
              </svg>
            </div>
            <span className="font-heading font-bold text-base tracking-tight">EduSphere</span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 flex-1">
            {navLinks.map(l => (
              <button key={l} onClick={() => handleNavClick(l)} className="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-muted" style={{ color: 'var(--muted-foreground)' }}>{l}</button>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3 ml-auto">
            <button onClick={onLogin} className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-muted" style={{ color: 'var(--foreground)' }}>Log In</button>
            <button onClick={onSignup} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all hover-scale" style={{ background: 'var(--primary)', color: '#fff' }}>
              Get Started <ArrowRight size={14} />
            </button>
          </div>

          <button onClick={() => setMobileMenu(!mobileMenu)} className="ml-auto lg:hidden p-2 rounded-lg hover:bg-muted" style={{ color: 'var(--foreground)' }}>
            {mobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
      </div>

      {mobileMenu && (
        <div className="fixed inset-0 z-40 pt-16" style={{ background: 'var(--card)' }}>
          <div className="p-6 space-y-3">
            {navLinks.map(l => (
              <button key={l} onClick={() => handleNavClick(l)} className="block w-full text-left px-4 py-3 rounded-xl text-base font-medium hover:bg-muted" style={{ color: 'var(--foreground)' }}>{l}</button>
            ))}
            <div className="pt-4 space-y-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <button onClick={onLogin} className="w-full py-3 rounded-xl text-sm font-medium border" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>Log In</button>
              <button onClick={onSignup} className="w-full py-3 rounded-xl text-sm font-semibold shadow-md" style={{ background: 'var(--primary)', color: '#fff' }}>Get Started Free</button>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO SECTION WITH 3D AI AIR-HOLOGRAPHIC CONCEPT ── */}
      <section className="pt-32 pb-28 px-6 lg:px-10 relative overflow-hidden perspective-container">
        {/* Background Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full blur-[160px] opacity-15 pointer-events-none" style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }} />

        <div className="max-w-6xl mx-auto text-center relative z-10">

          {/* AI 3D Air-Display Student Badge */}
          <button onClick={() => handleNavClick('AI Ecosystem')} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs sm:text-sm mb-6 shadow-xl backdrop-blur-md animate-float-slow transition-transform hover:scale-105" style={{ background: 'var(--secondary-bg)', borderColor: 'var(--border)', color: 'var(--primary)' }}>
            <Box size={15} className="animate-pulse" />
            <span className="font-semibold">✨ Student AI Showcase: Real-time 3D & Air Hologram Rendering</span>
          </button>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-heading font-extrabold leading-[1.1] mb-6 tracking-tight max-w-5xl mx-auto" style={{ color: 'var(--foreground)' }}>
            Supercharge Your Academic Journey with <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Intelligent Workspaces</span>
          </h1>

          <p className="text-base sm:text-xl leading-relaxed mb-10 max-w-2xl mx-auto font-normal" style={{ color: 'var(--muted-foreground)' }}>
            The ultimate multi-tenant platform unifying interactive classrooms, live collaborative document editing, automated spaced repetition, and contextual AI tutoring.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <button onClick={onSignup} className="flex items-center gap-2.5 px-8 py-4 rounded-xl font-bold text-base shadow-lg shadow-primary/20 transition-all hover-scale hover-lift" style={{ background: 'var(--primary)', color: '#fff' }}>
              Get Started Free <ArrowRight size={18} />
            </button>
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="flex items-center gap-2.5 px-7 py-4 rounded-xl font-semibold text-base border backdrop-blur-md transition-all hover-scale hover:bg-muted" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              <Play size={16} style={{ color: 'var(--primary)' }} /> Watch Platform Tour
            </button>
          </div>

          {/* Hero Preview Card with Rotating Border Color Animation */}
          <div className="max-w-5xl mx-auto mb-16 relative group preserve-3d transition-transform duration-500 hover:scale-[1.01]" style={{ transformStyle: 'preserve-3d' }}>

            {/* 3D Floating Air-Display Hologram Badge (Left Top) */}
            <div className="hidden lg:flex absolute -left-16 -top-10 z-20 flex-col gap-2 p-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl animate-float-slow text-left w-56 bg-card/90 border-primary/40">
              <div className="flex items-center justify-between text-xs font-bold text-primary">
                <span className="flex items-center gap-1.5"><Globe size={14} /> Air-Hologram 3D</span>
                <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                AI parsing spatial data: Rendering <b>DNA & Neural Network</b> in mid-air.
              </p>
              <div className="flex gap-1 pt-1">
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary">X: 45.2°</span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-accent/10 text-accent">Y: 12.8°</span>
              </div>
            </div>

            {/* 3D Floating Student AI Widget (Right Bottom) */}
            <div className="hidden lg:flex absolute -right-16 -bottom-8 z-20 flex-col gap-2 p-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl animate-float-slow text-left w-52 bg-card/90 border-emerald-500/40" style={{ animationDelay: '3s' }}>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-500">
                <Bot size={15} /> AI Spatial Engine
              </div>
              <div className="text-[11px] font-mono text-foreground">Status: Project Active</div>
              <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-full animate-pulse" />
              </div>
            </div>

            {/* Main Inner Card with Rotating Border Color */}
            <div className="rotating-border-card shadow-2xl backdrop-blur-xl">
              <div className="relative rounded-[calc(1.75rem-2px)] overflow-hidden bg-background p-6 text-left">
                <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    <span className="ml-2 text-xs font-mono text-muted-foreground">edusphere.app/workspace/3d-air-display</span>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-primary/10 text-primary font-semibold flex items-center gap-1.5">
                    <Terminal size={12} /> AI Hologram Stream Active
                  </span>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-border bg-card transition-all hover:border-primary/50">
                    <div className="text-xs font-bold text-muted-foreground mb-1">Active Classroom</div>
                    <div className="text-sm font-bold text-foreground">Computer Networks (CSE-3A)</div>
                    <div className="text-[11px] text-emerald-500 mt-1">● 32 Students Present</div>
                  </div>
                  <div className="p-4 rounded-xl border border-border bg-card transition-all hover:border-accent/50">
                    <div className="text-xs font-bold text-muted-foreground mb-1">Database State</div>
                    <div className="text-sm font-bold text-foreground">Neon PostgreSQL Sync</div>
                    <div className="text-[11px] text-primary mt-1">Status: Code 200 OK</div>
                  </div>
                  <div className="p-4 rounded-xl border border-border bg-card transition-all hover:border-emerald-500/50">
                    <div className="text-xs font-bold text-muted-foreground mb-1">AI Assistant</div>
                    <div className="text-sm font-bold text-foreground">Contextual Indexing Active</div>
                    <div className="text-[11px] text-accent mt-1">Ready for queries</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stat Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto p-6 rounded-3xl border shadow-xl backdrop-blur-md" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            {heroImpactStats.map((s, idx) => (
              <div key={idx} className="p-4 rounded-2xl border text-left transition-all hover:border-primary/40 hover:-translate-y-1 duration-300" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: `${s.color}15`, border: `1px solid ${s.color}30` }}>
                    <s.icon size={20} style={{ color: s.color }} />
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Verified
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-heading font-extrabold mb-1" style={{ color: 'var(--foreground)' }}>{s.value}</div>
                <div className="text-xs font-bold text-foreground mb-0.5">{s.label}</div>
                <div className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE MODULE SHOWCASE ── */}
      <section id="features" className="scroll-mt-24 py-20 px-6 lg:px-10 border-t" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--primary)' }}>Unified Architecture</div>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-4">Engineered for Deep Focus & Execution</h2>
            <p className="text-sm sm:text-base" style={{ color: 'var(--muted-foreground)' }}>Say goodbye to fragmented toolchains. Every academic requirement is natively integrated.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="group p-8 rounded-2xl border transition-all duration-300 hover-lift hover:border-primary/40 relative overflow-hidden" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none transition-transform duration-500 group-hover:scale-125" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 shadow-sm" style={{ background: `${f.color}15`, border: `1px solid ${f.color}30` }}>
                  <f.icon size={24} style={{ color: f.color }} />
                </div>
                <h3 className="font-heading font-bold text-lg mb-2.5" style={{ color: 'var(--foreground)' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE WORKFLOW TABS SECTION ── */}
      <section id="ai-learning" className="scroll-mt-24 py-24 px-6 lg:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>Interactive Ecosystem</div>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-4">How EduSphere Elevates Your Workflow</h2>
            <p className="text-sm sm:text-base" style={{ color: 'var(--muted-foreground)' }}>Switch between core structural engines designed for high-performance learners.</p>

            <div className="flex flex-wrap justify-center gap-2 mt-8 p-1.5 rounded-xl border max-w-md mx-auto" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              {[
                { id: 'notes', label: 'Smart Workspaces' },
                { id: 'ai', label: 'Contextual AI' },
                { id: 'analytics', label: 'Deep Analytics' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-2 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all ${activeTab === tab.id ? 'shadow-sm' : 'hover:opacity-75'}`}
                  style={{
                    background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                    color: activeTab === tab.id ? '#fff' : 'var(--muted-foreground)'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border p-8 lg:p-12 shadow-xl backdrop-blur-md" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            {activeTab === 'notes' && (
              <div className="grid lg:grid-cols-2 gap-10 items-center animate-in fade-in duration-300">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold mb-4" style={{ background: 'var(--secondary-bg)', color: 'var(--primary)' }}>
                    <FileText size={13} /> Notion-Style Flexibility
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-heading font-bold mb-4">Structured Document Editing with Instant Cloud Persistence</h3>
                  <p className="text-sm sm:text-base leading-relaxed mb-6" style={{ color: 'var(--muted-foreground)' }}>
                    Build comprehensive course portfolios, embed code snippets, format mathematical formulations, and collaborate with batch mates with zero lag. All changes sync directly back to your secure cloud instance.
                  </p>
                  <ul className="space-y-3">
                    {['Real-time multi-cursor presence', 'Block-level styling and markdown shortcuts', 'Instant PDF export & markdown sync'].map((item, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-sm font-medium">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-primary/10 text-primary">✓</div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border p-6 bg-background shadow-inner font-mono text-xs leading-relaxed space-y-3 text-muted-foreground">
                  <div className="text-foreground font-bold border-b pb-2 flex items-center justify-between">
                    <span>📁 Computer_Networks / TCP_Protocol.md</span>
                    <span className="text-emerald-500 font-sans text-[10px] px-2 py-0.5 rounded bg-emerald-500/10">Synced Live</span>
                  </div>
                  <p className="text-foreground font-semibold"># Transmission Control Protocol (TCP)</p>
                  <p>• Connection-oriented transport layer architecture.</p>
                  <p>• Guarantees reliable, ordered delivery using sequence numbers and checksums.</p>
                  <div className="p-3 rounded-lg bg-muted border border-border text-foreground">
                    <span className="text-primary font-bold">AI Tip:</span> Review congestion avoidance window logic before the upcoming mid-term evaluation.
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="grid lg:grid-cols-2 gap-10 items-center animate-in fade-in duration-300">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold mb-4" style={{ background: 'var(--secondary-bg)', color: 'var(--accent)' }}>
                    <Bot size={13} /> Contextual Intelligence
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-heading font-bold mb-4">Your Private Subject Matter Expert, Available 24/7</h3>
                  <p className="text-sm sm:text-base leading-relaxed mb-6" style={{ color: 'var(--muted-foreground)' }}>
                    Unlike generic public chatbots, EduSphere AI indexes your uploaded lectures, syllabus files, and personal revision notes to provide citation-backed precise explanations.
                  </p>
                  <ul className="space-y-3">
                    {['Generates custom flashcards from highlighted paragraphs', 'Automatic quiz generation based on weak conceptual areas', 'Direct page and slide source citations'].map((item, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-sm font-medium">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-accent/10 text-accent">✓</div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border p-5 bg-background shadow-inner space-y-4 text-xs">
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-muted">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white font-bold text-[10px]">A</div>
                    <span className="font-medium text-foreground">Explain the three-way handshake mechanism from lecture notes.</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-xl border border-accent/30 bg-accent/5">
                    <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-white font-bold text-[10px] shrink-0">AI</div>
                    <div className="space-y-2 text-foreground">
                      <p>Based on your <b>Networks Lecture 4</b>:</p>
                      <p>1. <b>SYN</b>: Client transmits packet with sequence number X.</p>
                      <p>2. <b>SYN-ACK</b>: Server responds with ack X+1 and seq Y.</p>
                      <p>3. <b>ACK</b>: Client confirms with ack Y+1. Session active.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="grid lg:grid-cols-2 gap-10 items-center animate-in fade-in duration-300">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold mb-4" style={{ background: 'var(--secondary-bg)', color: '#10b981' }}>
                    <BarChart2 size={13} /> Performance Metrology
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-heading font-bold mb-4">Granular Mastery Tracking Across Every Academic Subject</h3>
                  <p className="text-sm sm:text-base leading-relaxed mb-6" style={{ color: 'var(--muted-foreground)' }}>
                    Monitor focus hours, recurring quiz errors, assignment milestone completion rates, and knowledge graph connection density in a single unified dashboard view.
                  </p>
                  <ul className="space-y-3">
                    {['Automated spaced repetition scheduling', 'Comprehensive semester performance indicators', 'Visual knowledge graph interconnection maps'].map((item, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-sm font-medium">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-500">✓</div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl border bg-background">
                    <div className="text-xs text-muted-foreground mb-1">Weekly Focus Target</div>
                    <div className="text-xl font-bold mb-2">32.5 / 40 hrs</div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full w-[80%]" />
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border bg-background">
                    <div className="text-xs text-muted-foreground mb-1">Knowledge Retention</div>
                    <div className="text-xl font-bold text-emerald-500 mb-2">94.2%</div>
                    <div className="text-[10px] text-muted-foreground">+4.5% from last week</div>
                  </div>
                  <div className="col-span-2 p-4 rounded-xl border bg-background flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold">Active Spaced Repetition Queue</div>
                      <div className="text-xs text-muted-foreground mt-0.5">12 flashcards due for revision today</div>
                    </div>
                    <button onClick={onSignup} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-white">Review Now</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── FOR STUDENTS & TEACHERS SECTION ── */}
      <section id="students" className="scroll-mt-24 py-20 px-6 lg:px-10 border-t" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-4">Tailored Roles for Complete Academic Synergy</h2>
            <p className="text-sm sm:text-base" style={{ color: 'var(--muted-foreground)' }}>Whether you are steering a cohort of learners or accelerating your individual degree path.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="rounded-3xl border p-8 lg:p-10 transition-all hover-lift" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-sm" style={{ background: 'var(--secondary-bg)' }}>
                <GraduationCap size={24} style={{ color: 'var(--primary)' }} />
              </div>
              <h3 className="font-heading font-bold text-2xl mb-3">Designed for Students</h3>
              <p className="text-sm sm:text-base leading-relaxed mb-6" style={{ color: 'var(--muted-foreground)' }}>
                Master coursework efficiently with smart study planners, automated spaced-repetition flashcard decks, and peer collaboration rooms.
              </p>
              <ul className="space-y-3 mb-8">
                {['AI assistant trained strictly on your notes', 'Interactive Pomodoro focus timer and Kanban task boards', 'Live collaborative study groups with document sharing'].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-primary/10 text-primary text-xs font-bold">✓</div>
                    <span style={{ color: 'var(--foreground)' }}>{item}</span>
                  </li>
                ))}
              </ul>
              <button onClick={onSignup} className="w-full py-3.5 rounded-xl text-sm font-bold shadow-sm transition-all hover-scale" style={{ background: 'var(--primary)', color: '#fff' }}>
                Join as Student Free
              </button>
            </div>

            <div id="teachers" className="scroll-mt-24 rounded-3xl border p-8 lg:p-10 transition-all hover-lift" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-sm bg-emerald-500/10">
                <Users size={24} className="text-emerald-500" />
              </div>
              <h3 className="font-heading font-bold text-2xl mb-3">Empowering Educators</h3>
              <p className="text-sm sm:text-base leading-relaxed mb-6" style={{ color: 'var(--muted-foreground)' }}>
                Seamlessly establish virtual classrooms, distribute lecture assets, evaluate assignment submissions, and review real-time class engagement metrics.
              </p>
              <ul className="space-y-3 mb-8">
                {['Centralized classroom management & announcements', 'Automated quiz builder and grading pipelines', 'Comprehensive engagement analytics per enrolled student'].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-500 text-xs font-bold">✓</div>
                    <span style={{ color: 'var(--foreground)' }}>{item}</span>
                  </li>
                ))}
              </ul>
              <button onClick={onSignup} className="w-full py-3.5 rounded-xl text-sm font-bold border transition-all hover:bg-muted" style={{ borderColor: '#10b981', color: '#10b981' }}>
                Create Teacher Portal
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS SECTION ── */}
      <section className="py-24 px-6 lg:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-4">Trusted by Ambitious Learners</h2>
            <p className="text-sm sm:text-base" style={{ color: 'var(--muted-foreground)' }}>See how students and faculty members accelerate their academic workflows.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.name} className="rounded-2xl border p-6 flex flex-col justify-between transition-all hover-lift" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <div>
                  <div className="flex gap-1 mb-4">
                    {[...Array(t.stars)].map((_, i) => <Star key={i} size={15} fill="#f59e0b" style={{ color: '#f59e0b' }} />)}
                  </div>
                  <p className="text-sm leading-relaxed mb-6 italic" style={{ color: 'var(--foreground)' }}>"{t.text}"</p>
                </div>
                <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>{t.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CALL TO ACTION ── */}
      <section className="py-24 px-6 lg:px-10 text-center relative overflow-hidden border-t" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, var(--primary), transparent 70%)' }} />

        <div className="relative max-w-3xl mx-auto">
          <div className="w-16 h-16 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-primary/20" style={{ background: 'var(--primary)', color: '#fff' }}>
            <Cpu size={32} />
          </div>
          <h2 className="text-3xl sm:text-5xl font-heading font-extrabold mb-5 tracking-tight" style={{ color: 'var(--foreground)' }}>
            Ready to Revolutionize Your Study Workflow?
          </h2>
          <p className="text-base sm:text-lg mb-10 max-w-xl mx-auto font-normal" style={{ color: 'var(--muted-foreground)' }}>
            Join thousands of students and educators building a smarter academic future on EduSphere.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button onClick={onSignup} className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base shadow-lg shadow-primary/30 transition-all hover-scale hover-lift" style={{ background: 'var(--primary)', color: '#fff' }}>
              Get Started — It's Free <ArrowRight size={18} />
            </button>
            <button onClick={onLogin} className="px-8 py-4 rounded-xl font-bold text-base border transition-all hover-scale hover:bg-muted" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              Sign In to Account
            </button>
          </div>
          <p className="text-xs mt-6 flex items-center justify-center gap-2" style={{ color: 'var(--muted-foreground)' }}>
            <ShieldCheck size={14} className="text-emerald-500" /> Secure cloud persistence · Zero credit card required · Free tier available
          </p>
        </div>
      </section>

      {/* ── PROFESSIONAL FOOTER ── */}
      <footer className="border-t px-6 lg:px-16 py-16" style={{ borderColor: 'var(--border)', background: 'var(--background)' }}>
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md shadow-primary/20" style={{ background: 'var(--primary)' }}>
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.5" /><path d="M5 9h8M9 5v8" stroke="white" strokeWidth="1.5" strokeLinecap="round" /><circle cx="9" cy="9" r="2" fill="white" /></svg>
              </div>
              <span className="font-heading font-bold text-base tracking-tight" style={{ color: 'var(--foreground)' }}>EduSphere Workspace</span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed max-w-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
              An intelligent, full-stack collaborative ecosystem built for modern university students and educators. Sync notes, run AI study sessions, and manage classes seamlessly.
            </p>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-medium">
                <CheckCircle2 size={12} /> All Systems Operational
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--foreground)' }}>Product</div>
            <ul className="space-y-2.5 text-xs sm:text-sm" style={{ color: 'var(--muted-foreground)' }}>
              <li><a href="#features" className="hover:text-primary transition-colors">Smart Workspaces</a></li>
              <li><a href="#ai-learning" className="hover:text-primary transition-colors">Contextual AI</a></li>
              <li><a href="#collaboration" className="hover:text-primary transition-colors">Live Collaboration</a></li>
              <li><a href="#knowledge-graph" className="hover:text-primary transition-colors">Knowledge Graphs</a></li>
            </ul>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--foreground)' }}>Institutional</div>
            <ul className="space-y-2.5 text-xs sm:text-sm" style={{ color: 'var(--muted-foreground)' }}>
              <li><a href="#students" className="hover:text-primary transition-colors">For Students</a></li>
              <li><a href="#teachers" className="hover:text-primary transition-colors">For Educators</a></li>
              <li><span className="cursor-pointer hover:text-primary transition-colors" onClick={onSignup}>Virtual Classrooms</span></li>
              <li><span className="cursor-pointer hover:text-primary transition-colors" onClick={onSignup}>Assignment Portals</span></li>
            </ul>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--foreground)' }}>Security & Tech</div>
            <ul className="space-y-2.5 text-xs sm:text-sm" style={{ color: 'var(--muted-foreground)' }}>
              <li><button onClick={() => handleNavClick('Workspaces')} className="hover:text-primary transition-colors">Neon PostgreSQL</button></li>
              <li><button onClick={() => handleNavClick('AI Ecosystem')} className="hover:text-primary transition-colors">FastAPI Backend</button></li>
              <li><button onClick={onSignup} className="hover:text-primary transition-colors">Privacy & Encryption</button></li>
              <li><button onClick={() => handleNavClick('Features')} className="hover:text-primary transition-colors">API Documentation</button></li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left" style={{ borderColor: 'var(--border)' }}>
          <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            © {new Date().getFullYear()} EduSphere Inc. Developed with React, TypeScript & FastAPI.
          </div>
          <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            <button onClick={onSignup} className="hover:text-primary transition-colors">Privacy Policy</button>
            <button onClick={onSignup} className="hover:text-primary transition-colors">Terms of Service</button>
            <button onClick={() => handleNavClick('Features')} className="hover:text-primary transition-colors">Security Center</button>
          </div>
        </div>
      </footer>
    </div>
  )
}
