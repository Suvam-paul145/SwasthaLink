import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const AmbientDNA = lazy(() => import('../components/effects/AmbientDNA'));
import { getDashboardRouteForRole, ROLE_OPTIONS } from '../utils/auth';
import api from '../services/api';

const STEPS = { FORM: 'form', OTP: 'otp', DONE: 'done' };

const resolvePreferredRole = (value) =>
  ROLE_OPTIONS.some((item) => item.value === value) ? value : 'patient';

export default function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, login } = useAuth();
  const { t } = useLanguage();

  const [step, setStep] = useState(STEPS.FORM);
  const [role, setRole] = useState(() => resolvePreferredRole(location.state?.preferredRole));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [createdUserId, setCreatedUserId] = useState('');
  const [lastDeliveredChannel, setLastDeliveredChannel] = useState(null);
  const [lastDeliveryMessage, setLastDeliveryMessage] = useState('');
  const [hasSentOtp, setHasSentOtp] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stepLabel = useMemo(() => {
    if (step === STEPS.FORM) return t('signup.step_form');
    if (step === STEPS.OTP) return t('signup.step_otp');
    return t('signup.step_done');
  }, [step, t]);

  const stepNumber = step === STEPS.FORM ? 1 : step === STEPS.OTP ? 2 : 3;
  const channelLabel = 'WhatsApp';

  useEffect(() => {
    if (!isAuthenticated || !user?.role) return;
    navigate(getDashboardRouteForRole(user.role), { replace: true });
  }, [isAuthenticated, navigate, user]);

  const sendOtpForCurrentNumber = useCallback(async (channel = 'whatsapp') => {
    const trimmedPhone = phone.trim();
    const otpResult = await api.sendOtp(trimmedPhone, channel);
    const deliveredChannel = otpResult.channel || 'whatsapp';

    setHasSentOtp(true);
    setLastDeliveredChannel(deliveredChannel);
    setLastDeliveryMessage(otpResult.message || '');

    if (otpResult.demo_mode) {
      if (otpResult.sandbox_instructions) {
        setError(otpResult.sandbox_instructions);
        setInfo(`WhatsApp delivery failed. Use demo code: 123456`);
      } else {
        setInfo(`Demo mode active. Use code 123456 to verify.`);
      }
    } else {
      setInfo(`Verification code sent via WhatsApp to ${trimmedPhone}.`);
    }

    return otpResult;
  }, [phone]);

  const handleSignup = useCallback(async (event) => {
    event.preventDefault();
    setError('');
    setInfo('');

    if (!name.trim() || !email.trim() || !password || !phone.trim()) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!/^\+\d{10,15}$/.test(phone.trim())) {
      setError('Phone must be in E.164 format, for example +919876543210.');
      return;
    }

    setIsSubmitting(true);
    try {
      const signupResult = await api.signup({
        role,
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
      });

      setCreatedUserId(signupResult?.user_id || '');
      setStep(STEPS.OTP);
      setHasSentOtp(false);
      setLastDeliveredChannel(null);
      setLastDeliveryMessage('');
      setInfo(signupResult?.message || 'Account created successfully. Sending your OTP now.');

      try {
        await sendOtpForCurrentNumber();
      } catch (sendErr) {
        setError(sendErr.message || 'Account created, but OTP could not be sent yet. Please resend it below.');
        setInfo('');
      }
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [role, name, email, password, phone, sendOtpForCurrentNumber]);

  const handleVerifyOtp = useCallback(async (event) => {
    event.preventDefault();
    setError('');
    setInfo('');

    if (!otp || otp.length < 4) {
      setError('Please enter the OTP code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api.verifyOtp(phone.trim(), otp, {
        user_id: createdUserId || undefined,
        email: email.trim(),
      });

      if (!result.verified) {
        setError('Invalid OTP. Please try again.');
        return;
      }

      setStep(STEPS.DONE);
      setInfo('Phone verified. Logging you in...');

      try {
        const authSession = await login({
          role,
          email: email.trim(),
          password,
        });

        setTimeout(() => {
          navigate(getDashboardRouteForRole(authSession.user.role), { replace: true });
        }, 1200);
      } catch {
        setInfo('Account verified. Redirecting to login...');
        setTimeout(() => {
          navigate('/login', { replace: true, state: { preferredRole: role } });
        }, 1500);
      }
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  }, [createdUserId, email, login, navigate, otp, password, phone, role]);

  const handleResendOtp = useCallback(async () => {
    setError('');
    setInfo('');
    setIsSubmitting(true);

    try {
      await sendOtpForCurrentNumber();
    } catch (err) {
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setIsSubmitting(false);
    }
  }, [sendOtpForCurrentNumber]);

  return (
    <div className="min-h-screen bg-[#06101d] text-white relative overflow-hidden px-4 py-8 sm:px-6 lg:px-8 flex items-center">
      <div className="absolute -top-28 -right-20 w-72 h-72 bg-teal-400/10 rounded-full blur-[100px]" />
      <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-cyan-400/10 rounded-full blur-[120px]" />
      <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_top_left,white,transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.8),transparent_34%)]" />

      <Suspense fallback={null}>
        <AmbientDNA className="hidden lg:block absolute -left-10 top-1/3 w-40 h-64 opacity-30 z-0" />
      </Suspense>

      <div className="relative z-10 w-full max-w-xl mx-auto">
        <section className="glass-card auth-card-glow rounded-[32px] border border-white/10 p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between mb-8">
            <Link to="/" className="hover:opacity-90 transition-opacity w-fit">
              <Logo size="md" showText={true} />
            </Link>
            <Link
              to="/"
              className="text-sm text-teal-200 hover:text-teal-100 transition-colors w-fit"
            >
              {t('signup.back')}
            </Link>
          </div>

          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-teal-200">{t('signup.role_access')}</p>
            <h1 className="text-3xl font-headline font-extrabold mt-2">{t('signup.title')}</h1>
            <p className="text-sm text-slate-300 mt-2 leading-6">{stepLabel}</p>
          </div>

          <div className="flex items-center gap-0 mb-6">
            {[1, 2, 3].map((number) => (
              <div key={number} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                    number < stepNumber
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                      : number === stepNumber
                        ? 'bg-gradient-to-r from-teal-300 to-cyan-400 border-teal-300/50 text-[#053438] shadow-[0_0_16px_rgba(45,212,191,0.4)]'
                        : 'bg-white/5 border-white/15 text-slate-500'
                  }`}
                >
                  {number < stepNumber ? 'OK' : number}
                </div>
                {number < 3 ? (
                  <div className={`w-10 h-0.5 ${number < stepNumber ? 'bg-emerald-400/40' : 'bg-white/10'}`} />
                ) : null}
              </div>
            ))}
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 mb-4">
              {error}
            </div>
          ) : null}

          {info ? (
            <div className="rounded-2xl border border-teal-300/30 bg-teal-500/10 px-4 py-3 text-sm text-teal-100 mb-4">
              {info}
            </div>
          ) : null}

          {step === STEPS.FORM ? (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">{t('signup.role')}</label>
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className="w-full rounded-2xl bg-[#0f2334] border border-white/15 px-4 py-3 text-sm text-white shadow-inner shadow-black/10 focus:outline-none focus:ring-2 focus:ring-teal-300/40"
                >
                  {ROLE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value} className="bg-[#0f2334] text-white">
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">{t('signup.full_name')}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t('signup.enter_name')}
                  className="w-full rounded-2xl bg-[#0f2334] border border-white/15 px-4 py-3 text-sm text-white placeholder:text-slate-500 shadow-inner shadow-black/10 focus:outline-none focus:ring-2 focus:ring-teal-300/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">{t('signup.email')}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@hospital.com"
                  className="w-full rounded-2xl bg-[#0f2334] border border-white/15 px-4 py-3 text-sm text-white placeholder:text-slate-500 shadow-inner shadow-black/10 focus:outline-none focus:ring-2 focus:ring-teal-300/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">{t('signup.password')}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={t('signup.min_chars')}
                    className="w-full rounded-2xl bg-[#0f2334] border border-white/15 px-4 py-3 pr-16 text-sm text-white placeholder:text-slate-500 shadow-inner shadow-black/10 focus:outline-none focus:ring-2 focus:ring-teal-300/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-0 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-teal-200 hover:text-teal-100 transition-colors"
                  >
                    {showPassword ? t('signup.hide') : t('signup.show')}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">{t('signup.phone')}</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+919876543210"
                  className="w-full rounded-2xl bg-[#0f2334] border border-white/15 px-4 py-3 text-sm text-white placeholder:text-slate-500 shadow-inner shadow-black/10 focus:outline-none focus:ring-2 focus:ring-teal-300/40"
                />
                <p className="text-[11px] text-slate-500">
                  {t('signup.phone_hint')}
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-300 via-cyan-300 to-emerald-300 text-[#053438] font-extrabold tracking-wide hover:shadow-[0_16px_30px_rgba(45,212,191,0.35)] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? t('signup.creating') : t('signup.submit')}
              </button>
            </form>
          ) : null}

          {step === STEPS.OTP ? (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300 leading-6">
                {hasSentOtp && lastDeliveredChannel ? (
                  <>
                    {t('signup.otp_sent')} <span className="text-white font-semibold">{phone}</span> {t('signup.via')}{' '}
                    <span className="text-teal-200 font-semibold">
                      {lastDeliveredChannel === 'sms' ? 'SMS' : 'WhatsApp'}
                    </span>.
                  </>
                ) : (
                  <>
                    {t('signup.otp_not_confirmed')}{' '}
                    <span className="text-white font-semibold">{phone}</span>.
                  </>
                )}
              </div>

              {lastDeliveryMessage ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-6 text-slate-400">
                  {lastDeliveryMessage}
                </div>
              ) : null}

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">{t('signup.enter_otp')}</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(event) => {
                    setOtp(event.target.value.replace(/\D/g, '').slice(0, 6));
                    setError('');
                  }}
                  placeholder="0 0 0 0 0 0"
                  maxLength={6}
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="w-full rounded-2xl bg-[#0f2334] border border-white/15 px-4 py-4 text-center text-2xl font-bold tracking-[12px] text-white placeholder:text-slate-500 shadow-inner shadow-black/10 focus:outline-none focus:ring-2 focus:ring-teal-300/40"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || otp.length < 4}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-300 via-cyan-300 to-emerald-300 text-[#053438] font-extrabold tracking-wide hover:shadow-[0_16px_30px_rgba(45,212,191,0.35)] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? t('signup.verifying') : t('signup.verify_otp')}
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isSubmitting}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm text-teal-200 hover:text-teal-100 hover:bg-white/[0.06] transition-all disabled:opacity-50"
              >
                {t('signup.resend_via')} {channelLabel}
              </button>
            </form>
          ) : null}

          {step === STEPS.DONE ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-[56px] text-emerald-300">check_circle</span>
              <h2 className="text-xl font-headline font-bold text-emerald-300 mt-4 mb-2">{t('signup.phone_verified')}</h2>
              <p className="text-sm text-slate-300 leading-6">
                {t('signup.done_desc')}
              </p>
            </div>
          ) : null}

          <div className="mt-6 text-center text-sm text-slate-400">
            {t('signup.have_account')}{' '}
            <Link
              to="/login"
              state={{ preferredRole: role }}
              className="text-teal-300 hover:text-teal-200 font-medium transition-colors"
            >
              {t('signup.sign_in')}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
