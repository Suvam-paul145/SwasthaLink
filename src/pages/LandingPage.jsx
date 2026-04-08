import { lazy, Suspense, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Brain, Languages, MessageCircle, ShieldCheck, Accessibility, LayoutDashboard, ArrowRight, UserPlus, LogIn, Sparkles, Zap, ChevronRight } from 'lucide-react';
import Logo from '../components/Logo';
import GlassCard from '../components/ui/GlassCard';
import GlowButton from '../components/ui/GlowButton';
import GradientText from '../components/ui/GradientText';
import NeonBadge from '../components/ui/NeonBadge';
import DataFlowIndicator from '../components/ui/DataFlowIndicator';
import { heroStagger, tiltCardIn, gridReveal, neonReveal, scaleFadeIn, statSpring } from '../utils/animations';
import { useLanguage } from '../context/LanguageContext';

const AmbientDNA = lazy(() => import('../components/effects/AmbientDNA'));
const AmbientHeart = lazy(() => import('../components/effects/AmbientHeart'));
const AmbientCells = lazy(() => import('../components/effects/AmbientCells'));
const AmbientMolecule = lazy(() => import('../components/effects/AmbientMolecule'));
const AmbientLungs = lazy(() => import('../components/effects/AmbientLungs'));
const AmbientCapsule = lazy(() => import('../components/effects/AmbientCapsule'));

const coreFeatures = [
  {
    icon: Brain,
    title: 'landing.feat_ai_t',
    description: 'landing.feat_ai_d',
    benefit: 'landing.feat_ai_b',
    color: 'teal',
  },
  {
    icon: Languages,
    title: 'landing.feat_lang_t',
    description: 'landing.feat_lang_d',
    benefit: 'landing.feat_lang_b',
    color: 'purple',
  },
  {
    icon: MessageCircle,
    title: 'landing.feat_wa_t',
    description: 'landing.feat_wa_d',
    benefit: 'landing.feat_wa_b',
    color: 'cyan',
  },
  {
    icon: ShieldCheck,
    title: 'landing.feat_check_t',
    description: 'landing.feat_check_d',
    benefit: 'landing.feat_check_b',
    color: 'rose',
  },
  {
    icon: Accessibility,
    title: 'landing.feat_access_t',
    description: 'landing.feat_access_d',
    benefit: 'landing.feat_access_b',
    color: 'amber',
  },
  {
    icon: LayoutDashboard,
    title: 'landing.feat_dash_t',
    description: 'landing.feat_dash_d',
    benefit: 'landing.feat_dash_b',
    color: 'emerald',
  },
];

const workflow = [
  { number: '01', title: 'landing.wf1_title', description: 'landing.wf1_desc' },
  { number: '02', title: 'landing.wf2_title', description: 'landing.wf2_desc' },
  { number: '03', title: 'landing.wf3_title', description: 'landing.wf3_desc' },
  { number: '04', title: 'landing.wf4_title', description: 'landing.wf4_desc' },
];

const impact = [
  { metric: '1', label: 'landing.impact1', icon: Zap },
  { metric: '3', label: 'landing.impact2', icon: Sparkles },
  { metric: '24h', label: 'landing.impact3', icon: ShieldCheck },
];

const roleJourneys = [
  {
    value: 'patient',
    label: 'landing.role_patient',
    icon: 'personal_injury',
    eyebrow: 'landing.role_patient_eye',
    description: 'landing.role_patient_desc',
    features: [
      'landing.role_patient_f1',
      'landing.role_patient_f2',
      'landing.role_patient_f3',
      'landing.role_patient_f4',
    ],
    color: 'emerald',
  },
  {
    value: 'doctor',
    label: 'landing.role_doctor',
    icon: 'stethoscope',
    eyebrow: 'landing.role_doctor_eye',
    description: 'landing.role_doctor_desc',
    features: [
      'landing.role_doctor_f1',
      'landing.role_doctor_f2',
      'landing.role_doctor_f3',
      'landing.role_doctor_f4',
    ],
    color: 'cyan',
  },
  {
    value: 'admin',
    label: 'landing.role_admin',
    icon: 'admin_panel_settings',
    eyebrow: 'landing.role_admin_eye',
    description: 'landing.role_admin_desc',
    features: [
      'landing.role_admin_f1',
      'landing.role_admin_f2',
      'landing.role_admin_f3',
      'landing.role_admin_f4',
    ],
    color: 'teal',
  },
];

/* ------------------------------------------------------------------ */
/*  Animated section wrapper - fades/slides in when scrolled into view */
/* ------------------------------------------------------------------ */
function RevealSection({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ------------------------------------------------------------------ */
/*  Holographic hero visual — animated rings + floating icons          */
/* ------------------------------------------------------------------ */
function HeroHologram() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow */}
      <div className="absolute h-80 w-80 rounded-full bg-teal-400/10 blur-3xl" />

      {/* Concentric rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-teal-300/20"
          style={{ width: 200 + i * 80, height: 200 + i * 80 }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360, scale: [1, 1.04, 1] }}
          transition={{ rotate: { duration: 18 + i * 6, repeat: Infinity, ease: 'linear' }, scale: { duration: 4 + i, repeat: Infinity, ease: 'easeInOut' } }}
        />
      ))}

      {/* Central icon */}
      <motion.div
        className="relative z-10 flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-400/30 via-cyan-400/20 to-indigo-400/10 shadow-[0_0_60px_rgba(45,212,191,0.3)] backdrop-blur-2xl border border-teal-300/30"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Brain className="h-12 w-12 text-teal-200" />
      </motion.div>

      {/* Orbiting satellites */}
      {[
        { Icon: MessageCircle, angle: 0, dist: 140, color: 'text-cyan-300' },
        { Icon: ShieldCheck, angle: 120, dist: 140, color: 'text-emerald-300' },
        { Icon: Languages, angle: 240, dist: 140, color: 'text-purple-300' },
      ].map(({ Icon, angle, dist, color }, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ width: 44, height: 44 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear', delay: (angle / 360) * 20 }}
        >
          <motion.div
            className={`flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 backdrop-blur border border-white/10`}
            style={{ transform: `translateX(${dist}px)` }}
            animate={{ rotate: -360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear', delay: (angle / 360) * 20 }}
          >
            <Icon className={`h-5 w-5 ${color}`} />
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */
function LandingPage() {
  const { t } = useLanguage();
  const [activeRoleIndex, setActiveRoleIndex] = useState(0);
  const activeRole = roleJourneys[activeRoleIndex];

  return (
    <div className="relative overflow-hidden bg-[#071325]/90 text-white">
      <style>{`
        .pulse-grid {
          background-image:
            linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(circle at 50% 30%, black 30%, transparent 70%);
        }
        .tab-active {
          background: linear-gradient(135deg, rgba(45, 212, 191, 0.2), rgba(34, 211, 238, 0.1));
          border-color: rgba(45, 212, 191, 0.6);
          box-shadow: 0 0 20px rgba(45, 212, 191, 0.15);
        }
      `}</style>

      {/* subtle grid overlay */}
      <div className="absolute inset-0 pulse-grid opacity-40 pointer-events-none" />

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10"
      >
        <Link to="/" className="no-underline hover:opacity-90 transition-opacity">
          <Logo size="md" showText={true} />
        </Link>

        <nav className="flex items-center gap-3">
          <Link to="/signup">
            <GlowButton variant="ghost" size="sm" icon={UserPlus}>{t('landing.signup')}</GlowButton>
          </Link>
          <Link to="/login">
            <GlowButton variant="primary" size="sm" icon={LogIn}>{t('landing.login')}</GlowButton>
          </Link>
        </nav>
      </motion.header>

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto w-full max-w-7xl px-6 py-12 lg:px-10 lg:py-20">
        {/* Ambient DNA — top-right corner */}
        <Suspense fallback={null}>
          <AmbientDNA className="hidden lg:block absolute -top-10 -right-16 w-56 h-72 opacity-40 z-0" />
        </Suspense>
        {/* Ambient Capsule — bottom-left of hero */}
        <Suspense fallback={null}>
          <AmbientCapsule className="hidden lg:block absolute -bottom-8 -left-12 w-44 h-44 opacity-25 z-0" />
        </Suspense>
        <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          {/* Left — copy */}
          <motion.div className="space-y-8" variants={heroStagger} initial="hidden" animate="show">
            <motion.div variants={scaleFadeIn}>
              <NeonBadge color="teal" pulse icon={Sparkles} size="sm">
                {t('landing.hero_badge')}
              </NeonBadge>
            </motion.div>

            <motion.div variants={scaleFadeIn}>
              <h1 className="text-5xl font-black leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
                <GradientText gradient="teal" animate className="block">{t('landing.hero_h1_1')}</GradientText>
                <span className="text-white">{t('landing.hero_h1_2')}</span>
              </h1>
            </motion.div>

            <motion.p variants={scaleFadeIn} className="max-w-2xl text-lg leading-8 text-slate-300/90">
              {t('landing.hero_sub')}
            </motion.p>

            <motion.div variants={scaleFadeIn} className="flex flex-wrap items-center gap-4">
              <Link to="/login">
                <GlowButton variant="primary" size="lg" icon={LogIn} iconRight={ArrowRight}>
                  {t('landing.hero_login_btn')}
                </GlowButton>
              </Link>
              <Link to="/signup">
                <GlowButton variant="secondary" size="lg" icon={UserPlus}>
                  {t('landing.hero_signup_btn')}
                </GlowButton>
              </Link>
            </motion.div>

            {/* Impact metric cards */}
            <motion.div variants={scaleFadeIn} className="grid pt-4 grid-cols-3 gap-4">
              {impact.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.label}
                    variants={statSpring}
                    initial="hidden"
                    animate="show"
                    custom={i}
                    className="glass-card-enhanced rounded-2xl p-4"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-teal-300/70" />
                      <p className="text-2xl font-black text-glow-teal">{item.metric}</p>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-400 leading-tight">{t(item.label)}</p>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>

          {/* Right — hologram */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:flex items-center justify-center"
          >
            <HeroHologram />
          </motion.div>
        </div>
      </section>

      {/* ── WORKFLOW ────────────────────────────────────────────── */}
      <RevealSection className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20 lg:px-10">
        {/* Ambient Cells — floating blood cells */}
        <Suspense fallback={null}>
          <AmbientCells className="hidden lg:block absolute -left-20 top-10 w-48 h-48 opacity-35 z-0" />
        </Suspense>
        <div className="space-y-14">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <NeonBadge color="teal" icon={Zap} size="sm">{t('landing.wf_badge')}</NeonBadge>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight">
              <GradientText gradient="ocean">{t('landing.wf_heading')}</GradientText>
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            {workflow.map((step, index) => (
              <motion.div
                key={step.number}
                variants={tiltCardIn}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                custom={index}
              >
                <GlassCard className="relative p-6 h-full" hoverScale={1.04} glowColor="45, 212, 191">
                  {/* step number badge */}
                  <div className="absolute -top-4 -left-4 h-11 w-11 rounded-full bg-gradient-to-br from-teal-400 via-cyan-400 to-emerald-400 flex items-center justify-center text-sm font-black text-[#04262b] shadow-[0_0_24px_rgba(45,212,191,0.45)]">
                    {step.number}
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-white">{t(step.title)}</h3>
                  <p className="mt-2 text-sm text-slate-400">{t(step.description)}</p>

                  {/* connector */}
                  {index < workflow.length - 1 && (
                    <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-20">
                      <ChevronRight className="h-5 w-5 text-teal-400/50" />
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            ))}
          </div>

          {/* scan line */}
          <DataFlowIndicator color="rgb(45, 212, 191)" speed={3} />
        </div>
      </RevealSection>

      {/* ── FEATURES ───────────────────────────────────────────── */}
      <RevealSection className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20 lg:px-10">
        {/* Ambient Heart — pulsing in corner */}
        <Suspense fallback={null}>
          <AmbientHeart className="hidden lg:block absolute -right-12 bottom-10 w-44 h-44 opacity-30 z-0" />
        </Suspense>
        <div className="space-y-14">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <NeonBadge color="cyan" icon={Sparkles} size="sm">{t('landing.feat_badge')}</NeonBadge>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight">
              <GradientText gradient="purple">{t('landing.feat_heading')}</GradientText>
            </h2>
          </div>

          <motion.div
            className="grid gap-6 lg:grid-cols-3"
            variants={gridReveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {coreFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div key={feature.title} variants={tiltCardIn}>
                  <GlassCard className="p-8 h-full" hoverScale={1.03}>
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400/20 via-cyan-400/10 to-transparent border border-white/10">
                      <Icon className="h-7 w-7 text-teal-200" />
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-white">{t(feature.title)}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{t(feature.description)}</p>
                    <div className="mt-5">
                      <NeonBadge color={feature.color} size="sm">{t(feature.benefit)}</NeonBadge>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </RevealSection>

      {/* ── ROLE JOURNEYS ──────────────────────────────────────── */}
      <RevealSection className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20 lg:px-10">
        {/* Ambient Lungs — breathing wireframe */}
        <Suspense fallback={null}>
          <AmbientLungs className="hidden lg:block absolute right-0 top-20 w-52 h-52 opacity-25 z-0" />
        </Suspense>
        <div className="space-y-14">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <NeonBadge color="emerald" size="sm">{t('landing.role_badge')}</NeonBadge>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight">
              <GradientText gradient="teal">{t('landing.role_heading')}</GradientText>
            </h2>
            <p className="text-lg text-slate-400">
              {t('landing.role_sub')}
            </p>
          </div>

          {/* Tab bar */}
          <div className="flex gap-3 flex-wrap justify-center">
            {roleJourneys.map((role, index) => (
              <motion.button
                key={role.value}
                onClick={() => setActiveRoleIndex(index)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className={`flex items-center gap-2 rounded-xl px-5 py-3 font-semibold transition-all ${
                  activeRoleIndex === index
                    ? 'tab-active'
                    : 'border border-white/15 bg-white/[0.05] hover:border-white/25 hover:bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{role.icon}</span>
                {t(role.label)}
              </motion.button>
            ))}
          </div>

          {/* Active role content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeRole.value}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="grid gap-8 lg:grid-cols-2 items-center"
            >
              <div className="space-y-6">
                <div>
                  <NeonBadge color={activeRole.color} pulse size="sm">{t(activeRole.eyebrow)}</NeonBadge>
                  <h3 className="mt-3 text-3xl font-black text-white">{t(activeRole.label)} {t('landing.entry_path')}</h3>
                  <p className="mt-2 text-base leading-7 text-slate-400">{t(activeRole.description)}</p>
                </div>
                <div className="space-y-3">
                  {activeRole.features.map((feature, i) => (
                    <motion.div
                      key={feature}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur"
                    >
                      <span className="material-symbols-outlined text-teal-300 mt-0.5">check_circle</span>
                      <span className="text-sm text-slate-300 font-medium">{t(feature)}</span>
                    </motion.div>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Link to="/login" state={{ preferredRole: activeRole.value }}>
                    <GlowButton variant="primary" icon={LogIn}>{t('landing.login_as')} {t(activeRole.label)}</GlowButton>
                  </Link>
                  <Link to="/signup" state={{ preferredRole: activeRole.value }}>
                    <GlowButton variant="secondary" icon={UserPlus}>{t('landing.signup_as')} {t(activeRole.label)}</GlowButton>
                  </Link>
                </div>
              </div>

              {/* Role holographic card */}
              <GlassCard className="p-8" tilt glow>
                <div className="h-72 rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent flex items-center justify-center">
                  <div className="text-center">
                    <motion.span
                      className="material-symbols-outlined text-7xl text-teal-200"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      {activeRole.icon}
                    </motion.span>
                    <GradientText gradient="teal" as="p" className="mt-4 text-sm font-bold uppercase tracking-[0.2em]">
                      {t(activeRole.label)} {t('landing.portal')}
                    </GradientText>
                    <p className="mt-3 max-w-xs mx-auto text-sm leading-6 text-slate-500">
                      {t('landing.routing_text')}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </AnimatePresence>
        </div>
      </RevealSection>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <RevealSection className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20 lg:px-10">
        {/* Ambient Molecule — floating structure */}
        <Suspense fallback={null}>
          <AmbientMolecule className="hidden lg:block absolute -left-16 top-4 w-40 h-40 opacity-35 z-0" />
        </Suspense>
        <GlassCard className="relative overflow-hidden p-12 lg:p-20" glow glowColor="45, 212, 191" borderGradient>
          {/* glow blobs */}
          <div className="absolute -top-20 -left-20 h-60 w-60 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-indigo-400/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 text-center space-y-8">
            <h2 className="text-4xl lg:text-5xl font-black">
              <GradientText gradient="neon">{t('landing.cta_heading')}</GradientText>
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              {t('landing.cta_sub')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login">
                <GlowButton variant="neon" size="lg" icon={LogIn} iconRight={ArrowRight}>
                  {t('landing.open_login')}
                </GlowButton>
              </Link>
              <Link to="/signup">
                <GlowButton variant="secondary" size="lg" icon={UserPlus}>
                  {t('landing.open_signup')}
                </GlowButton>
              </Link>
            </div>

            <p className="text-sm text-slate-500">{t('landing.cta_note')}</p>
          </div>
        </GlassCard>
      </RevealSection>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/10 bg-[#02080f]/60 px-6 py-12 lg:px-10 backdrop-blur">
        <div className="mx-auto max-w-7xl flex flex-col items-center gap-4">
          <Logo size="sm" showText />
          <p className="text-sm text-slate-500 text-center">
            {t('landing.copyright')}
          </p>
          <DataFlowIndicator color="rgb(45, 212, 191)" speed={4} width="w-32" />
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
