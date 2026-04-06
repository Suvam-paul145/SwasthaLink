import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

const coreFeatures = [
  {
    icon: 'smart_toy',
    title: 'AI-Powered Simplification',
    description: 'Clinical language is transformed into practical, plain-language guidance that patients can actually act on.',
    benefit: 'Cuts down discharge confusion',
  },
  {
    icon: 'translate',
    title: 'Bilingual Support',
    description: 'English and Bengali-friendly guidance can be delivered in a way that matches the patient context.',
    benefit: 'More inclusive communication',
  },
  {
    icon: 'chat',
    title: 'WhatsApp Delivery',
    description: 'Recovery guidance, medication reminders, and next steps can follow patients beyond the hospital desk.',
    benefit: 'Stronger follow-through after discharge',
  },
  {
    icon: 'quiz',
    title: 'Comprehension Checks',
    description: 'Short verification steps help teams confirm whether patients understood the most important instructions.',
    benefit: 'Safer transitions to home care',
  },
  {
    icon: 'hearing',
    title: 'Accessible Guidance',
    description: 'Simple layouts and guided flows help patients, doctors, and admins move through the system without friction.',
    benefit: 'Lower cognitive load',
  },
  {
    icon: 'monitoring',
    title: 'Role-Based Dashboards',
    description: 'Every user lands in the right workspace after login, with navigation tuned to the role they selected.',
    benefit: 'Cleaner day-to-day workflows',
  },
];

const workflow = [
  { number: '1', title: 'Start at the landing page', description: 'Root path opens a single public home for the full product experience.' },
  { number: '2', title: 'Choose a route', description: 'Users continue into login or signup based on where they are in the journey.' },
  { number: '3', title: 'Verify identity', description: 'Role, credentials, and OTP confirmation keep onboarding structured.' },
  { number: '4', title: 'Enter the right dashboard', description: 'Patients, doctors, and admins land directly in their own workspace.' },
];

const impact = [
  { metric: '1', label: 'clear starting point at the root path' },
  { metric: '3', label: 'connected role journeys from one landing page' },
  { metric: '24h', label: 'session continuity with local profile updates' },
];

const roleJourneys = [
  {
    value: 'patient',
    label: 'Patient',
    icon: 'personal_injury',
    eyebrow: 'Recovery-first flow',
    description: 'Patients can move from landing to signup or login, verify their phone, and continue into the family dashboard with clearer care guidance.',
    features: [
      'Plain-language recovery summaries',
      'Medication and follow-up reminders',
      'OTP-supported signup flow',
      'Profile updates from settings',
    ],
    accent: 'text-emerald-200',
  },
  {
    value: 'doctor',
    label: 'Doctor',
    icon: 'stethoscope',
    eyebrow: 'Clinical workflow',
    description: 'Doctors can enter through the same public landing page, sign in with the correct role, and reach their portal without dead-end navigation.',
    features: [
      'Role-aware login defaults',
      'Protected doctor route handling',
      'Faster handoff into the dashboard',
      'Consistent account management',
    ],
    accent: 'text-cyan-200',
  },
  {
    value: 'admin',
    label: 'Admin',
    icon: 'admin_panel_settings',
    eyebrow: 'Platform oversight',
    description: 'Admins follow the same clean entry flow while staying connected to settings, authentication, and admin-only areas after sign-in.',
    features: [
      'Admin entry from the public homepage',
      'Protected route enforcement',
      'Shared settings experience',
      'Centralized navigation shell',
    ],
    accent: 'text-teal-200',
  },
];

function LandingPage() {
  const [activeRoleIndex, setActiveRoleIndex] = useState(0);
  const activeRole = roleJourneys[activeRoleIndex];

  return (
    <div className="relative overflow-hidden bg-[#041125] text-white">
      <style>{`
        .pulse-grid {
          background-image:
            linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(circle at 50% 30%, black 30%, transparent 70%);
        }

        .rise-up {
          opacity: 0;
          transform: translateY(24px);
          animation: rise-up 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .rise-up.delay-1 { animation-delay: 0.08s; }
        .rise-up.delay-2 { animation-delay: 0.16s; }
        .rise-up.delay-3 { animation-delay: 0.24s; }
        .rise-up.delay-4 { animation-delay: 0.32s; }
        .rise-up.delay-5 { animation-delay: 0.4s; }

        .float-slower {
          animation: float-slow 12s ease-in-out infinite reverse;
        }

        .orb-glow {
          animation: orb-glow 4.8s ease-in-out infinite;
        }

        .tab-active {
          background: linear-gradient(135deg, rgba(45, 212, 191, 0.2), rgba(34, 211, 238, 0.1));
          border-color: rgba(45, 212, 191, 0.6);
        }

        @keyframes rise-up {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-16px); }
        }

        @keyframes orb-glow {
          0%, 100% { filter: blur(88px) saturate(95%); opacity: 0.5; }
          50% { filter: blur(120px) saturate(140%); opacity: 0.8; }
        }
      `}</style>

      <div className="absolute inset-0 pulse-grid opacity-50" />
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#2dd4bf]/25 orb-glow" />
      <div className="pointer-events-none absolute top-1/4 -right-40 h-[32rem] w-[32rem] rounded-full bg-[#22d3ee]/20 orb-glow" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-[#f59e0b]/15 orb-glow" />

      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link to="/" className="rise-up no-underline hover:opacity-90 transition-opacity">
          <Logo size="md" showText={true} />
        </Link>

        <nav className="rise-up delay-1 flex items-center gap-3">
          <Link
            to="/signup"
            className="rounded-xl border border-white/20 bg-white/8 px-5 py-2.5 text-sm font-semibold text-slate-100 transition-all hover:bg-white/15 hover:border-white/40"
          >
            Signup
          </Link>
          <Link
            to="/login"
            className="rounded-xl bg-gradient-to-r from-teal-300 via-cyan-300 to-emerald-300 px-5 py-2.5 text-sm font-black text-[#04262b] shadow-[0_8px_20px_rgba(45,212,191,0.35)] transition-all hover:scale-[1.04] active:scale-[0.98]"
          >
            Login
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto w-full max-w-7xl px-6 py-12 lg:px-10 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-8">
            <div className="rise-up inline-flex items-center gap-2 rounded-full border border-teal-100/20 bg-teal-200/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-teal-100">
              <span className="h-2 w-2 rounded-full bg-teal-200 animate-pulse" />
              Public landing page on root
            </div>

            <h1 className="rise-up delay-1 text-5xl font-black leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
              One root page. Connected login, signup, and role journeys.
            </h1>

            <p className="rise-up delay-2 max-w-2xl text-lg leading-8 text-slate-200/90">
              SwasthaLink now opens on a proper landing page at <span className="font-semibold text-white">/</span>.
              From there, users can move cleanly into login or signup, with login treated as the default next action and every role routed into the right protected space.
            </p>

            <div className="rise-up delay-3 flex flex-wrap items-center gap-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-300 via-cyan-300 to-emerald-300 px-7 py-4 text-base font-black uppercase tracking-[0.16em] text-[#04262b] shadow-[0_16px_40px_rgba(45,212,191,0.4)] transition-all hover:scale-[1.05] active:scale-[0.95]"
              >
                <span className="material-symbols-outlined">login</span>
                Continue to Login
              </Link>

              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/8 px-7 py-4 text-base font-bold uppercase tracking-[0.16em] text-slate-100 transition-all hover:bg-white/15 hover:border-white/40"
              >
                <span className="material-symbols-outlined">person_add</span>
                Create Account
              </Link>
            </div>

            <div className="rise-up delay-4 grid pt-4 grid-cols-3 gap-4">
              {impact.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur">
                  <p className="text-2xl font-black text-teal-200">{item.metric}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-300 leading-tight">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rise-up delay-2 relative">
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/15 bg-[#071b34]/70 p-8 shadow-[0_32px_80px_rgba(2,10,25,0.6)] backdrop-blur-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-200/5 via-transparent to-cyan-200/5" />
              <div className="relative space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300/30 via-teal-300/20 to-cyan-300/10">
                    <span className="material-symbols-outlined text-3xl text-emerald-200">hub</span>
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-slate-300 font-semibold">Connected UX</p>
                    <p className="text-xl font-black text-white">Landing to dashboard flow</p>
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  {[
                    'Landing page at the root path',
                    'Login and signup linked from every auth screen',
                    'Forgot password remains reachable from login',
                    'Protected routes still redirect unauthenticated users to login',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.05] px-4 py-3">
                      <span className="text-lg text-emerald-300">+</span>
                      <span className="text-sm font-semibold text-slate-100">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-7xl px-6 py-16 lg:px-10">
        <div className="space-y-12">
          <div className="rise-up text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-100/20 bg-teal-200/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-teal-100">
              <span className="material-symbols-outlined text-base">workflow</span>
              Product flow
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight">
              A clear route from first visit to the right dashboard
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            {workflow.map((step, index) => (
              <div key={step.number} className={`rise-up delay-${Math.min(index + 1, 5)} relative`}>
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.04] p-6 h-full backdrop-blur hover:border-teal-300/60 hover:bg-teal-300/5 transition-all">
                  <div className="absolute -top-4 -left-4 h-12 w-12 rounded-full bg-gradient-to-br from-teal-300 via-cyan-300 to-emerald-300 flex items-center justify-center text-lg font-black text-[#04262b] shadow-[0_0_20px_rgba(45,212,191,0.4)]">
                    {step.number}
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-300">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-7xl px-6 py-16 lg:px-10">
        <div className="space-y-12">
          <div className="rise-up text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100/20 bg-cyan-200/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-cyan-100">
              <span className="material-symbols-outlined text-base">star</span>
              Core features
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight">
              UX updates pulled into the public entry experience
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {coreFeatures.map((feature, index) => (
              <div
                key={feature.title}
                className={`rise-up delay-${Math.min((index % 3) + 1, 5)} rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent p-8 backdrop-blur hover:border-teal-300/60 hover:shadow-[0_20px_40px_rgba(45,212,191,0.1)] transition-all`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-teal-300/30 via-cyan-300/20 to-emerald-300/10">
                  <span className="material-symbols-outlined text-2xl text-teal-100">{feature.icon}</span>
                </div>
                <h3 className="mt-4 text-xl font-bold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{feature.description}</p>
                <div className="mt-5 rounded-lg border border-teal-200/20 bg-teal-200/10 px-3 py-2">
                  <p className="text-xs font-semibold text-teal-100">{feature.benefit}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-7xl px-6 py-16 lg:px-10">
        <div className="space-y-12">
          <div className="rise-up text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100/20 bg-emerald-200/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-100">
              <span className="material-symbols-outlined text-base">groups</span>
              Role journeys
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight">
              Each role can start from the same public page
            </h2>
            <p className="text-lg text-slate-300">
              The landing page can pre-select the intended role before users continue into login or signup.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap justify-center mb-12">
            {roleJourneys.map((role, index) => (
              <button
                key={role.value}
                onClick={() => setActiveRoleIndex(index)}
                className={`flex items-center gap-2 rounded-xl px-5 py-3 font-semibold transition-all ${
                  activeRoleIndex === index
                    ? 'tab-active'
                    : 'border border-white/15 bg-white/[0.05] hover:border-white/25 hover:bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{role.icon}</span>
                {role.label}
              </button>
            ))}
          </div>

          <div className="grid gap-8 lg:grid-cols-2 items-center">
            <div className="space-y-6">
              <div>
                <p className={`text-sm font-bold uppercase tracking-[0.2em] mb-2 ${activeRole.accent}`}>{activeRole.eyebrow}</p>
                <h3 className="text-3xl font-black text-white mb-3">{activeRole.label} entry path</h3>
                <p className="text-base leading-7 text-slate-300">{activeRole.description}</p>
              </div>
              <div className="space-y-3">
                {activeRole.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.05] p-4">
                    <span className="material-symbols-outlined text-teal-200 mt-0.5">check_circle</span>
                    <span className="text-sm text-slate-200 font-medium">{feature}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/login"
                  state={{ preferredRole: activeRole.value }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-300 via-cyan-300 to-emerald-300 px-6 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#04262b] transition-all hover:scale-[1.03]"
                >
                  <span className="material-symbols-outlined">login</span>
                  Login as {activeRole.label}
                </Link>
                <Link
                  to="/signup"
                  state={{ preferredRole: activeRole.value }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/8 px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-100 transition-all hover:bg-white/15 hover:border-white/40"
                >
                  <span className="material-symbols-outlined">person_add</span>
                  Signup as {activeRole.label}
                </Link>
              </div>
            </div>

            <div className="float-slower relative overflow-hidden rounded-2xl border border-white/15 bg-[#071b34]/60 p-8 backdrop-blur">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-200/5 via-transparent to-cyan-200/5" />
              <div className="relative">
                <div className="h-80 rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.1] to-white/[0.05] flex items-center justify-center">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-7xl text-teal-200">
                      {activeRole.icon}
                    </span>
                    <p className="mt-4 text-sm font-bold text-slate-300 uppercase tracking-[0.2em]">{activeRole.label} portal</p>
                    <p className="mt-3 max-w-xs text-sm leading-6 text-slate-400">
                      Landing, auth, and protected routing now form one continuous journey.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20 lg:px-10">
        <div className="rise-up relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-teal-200/10 via-white/5 to-cyan-200/10 p-12 lg:p-20 backdrop-blur-xl shadow-[0_20px_60px_rgba(45,212,191,0.15)]">
          <div className="relative z-10 text-center space-y-8">
            <h2 className="text-4xl lg:text-5xl font-black text-white">
              Ready to move from the landing page into the app?
            </h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              Start at the public homepage, continue into login or signup, and let the app route each role where it belongs.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-300 via-cyan-300 to-emerald-300 px-8 py-4 text-base font-black uppercase tracking-[0.16em] text-[#04262b] shadow-[0_16px_40px_rgba(45,212,191,0.4)] transition-all hover:scale-[1.05] active:scale-[0.95]"
              >
                <span className="material-symbols-outlined">login</span>
                Open Login
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-8 py-4 text-base font-bold uppercase tracking-[0.16em] text-slate-100 transition-all hover:bg-white/20 hover:border-white/50"
              >
                <span className="material-symbols-outlined">person_add</span>
                Open Signup
              </Link>
            </div>

            <p className="text-sm text-slate-400">Login stays the default call-to-action from the root path.</p>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 bg-[#02080f]/80 px-6 py-12 lg:px-10">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-sm text-slate-400">
            Copyright 2026 SwasthaLink. Clearer healthcare communication for patients, doctors, and families.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Root page for discovery. Auth pages for entry. Protected dashboards for role-based work.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
