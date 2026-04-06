import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { getDashboardRouteForRole, ROLE_OPTIONS } from '../utils/auth';
import api from '../services/api';

const STEPS = { FORM: 'form', OTP: 'otp', DONE: 'done' };
const DELIVERY_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
];

const resolvePreferredRole = (value) =>
  ROLE_OPTIONS.some((item) => item.value === value) ? value : 'patient';

export default function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, login } = useAuth();

  const [step, setStep] = useState(STEPS.FORM);
  const [role, setRole] = useState(() => resolvePreferredRole(location.state?.preferredRole));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [otpChannel, setOtpChannel] = useState('whatsapp');
  const [otp, setOtp] = useState('');
  const [createdUserId, setCreatedUserId] = useState('');
  const [lastDeliveredChannel, setLastDeliveredChannel] = useState(null);
  const [lastDeliveryMessage, setLastDeliveryMessage] = useState('');
  const [hasSentOtp, setHasSentOtp] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stepLabel = useMemo(() => {
    if (step === STEPS.FORM) return 'Create Your Account';
    if (step === STEPS.OTP) return 'Verify Phone Number';
    return 'Account Created';
  }, [step]);

  const stepNumber = step === STEPS.FORM ? 1 : step === STEPS.OTP ? 2 : 3;
  const channelLabel = DELIVERY_OPTIONS.find((item) => item.value === otpChannel)?.label || 'WhatsApp';

  useEffect(() => {
    if (!isAuthenticated || !user?.role) return;
    navigate(getDashboardRouteForRole(user.role), { replace: true });
  }, [isAuthenticated, navigate, user]);

  const sendOtpForCurrentNumber = useCallback(async (channel = otpChannel) => {
    const trimmedPhone = phone.trim();
    const otpResult = await api.sendOtp(trimmedPhone, channel);
    const deliveredChannel = DELIVERY_OPTIONS.some((item) => item.value === otpResult.channel)
      ? otpResult.channel
      : channel;

    setHasSentOtp(true);
    setLastDeliveredChannel(deliveredChannel);
    setLastDeliveryMessage(otpResult.message || '');

    if (otpResult.demo_mode) {
      setInfo(`Demo mode active. Use OTP code 123456 via ${deliveredChannel === 'sms' ? 'SMS' : 'WhatsApp'}.`);
    } else {
      setInfo(`Verification code sent via ${deliveredChannel === 'sms' ? 'SMS' : 'WhatsApp'} to ${trimmedPhone}.`);
    }

    return otpResult;
  }, [phone, otpChannel]);

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
        await sendOtpForCurrentNumber(otpChannel);
      } catch (sendErr) {
        setError(sendErr.message || 'Account created, but OTP could not be sent yet. Please resend it below.');
        setInfo('');
      }
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [role, name, email, password, phone, sendOtpForCurrentNumber, otpChannel]);

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
      } catch (loginErr) {
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
      await sendOtpForCurrentNumber(otpChannel);
    } catch (err) {
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setIsSubmitting(false);
    }
  }, [otpChannel, sendOtpForCurrentNumber]);

  return (
    <div className="min-h-screen bg-[#06101d] text-white relative overflow-hidden px-4 py-8 sm:px-6 lg:px-8 flex items-center">
      <div className="absolute -top-28 -right-20 w-72 h-72 bg-teal-400/10 rounded-full blur-[100px]" />
      <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-cyan-400/10 rounded-full blur-[120px]" />
      <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_top_left,white,transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.8),transparent_34%)]" />

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
              Back to landing page
            </Link>
          </div>

          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-teal-200">Role-Based Access</p>
            <h1 className="text-3xl font-headline font-extrabold mt-2">SwasthaLink Signup</h1>
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
                <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">Role</label>
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
                <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-2xl bg-[#0f2334] border border-white/15 px-4 py-3 text-sm text-white placeholder:text-slate-500 shadow-inner shadow-black/10 focus:outline-none focus:ring-2 focus:ring-teal-300/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">Email ID</label>
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
                <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full rounded-2xl bg-[#0f2334] border border-white/15 px-4 py-3 pr-16 text-sm text-white placeholder:text-slate-500 shadow-inner shadow-black/10 focus:outline-none focus:ring-2 focus:ring-teal-300/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-0 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-teal-200 hover:text-teal-100 transition-colors"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+919876543210"
                  className="w-full rounded-2xl bg-[#0f2334] border border-white/15 px-4 py-3 text-sm text-white placeholder:text-slate-500 shadow-inner shadow-black/10 focus:outline-none focus:ring-2 focus:ring-teal-300/40"
                />
                <p className="text-[11px] text-slate-500">
                  Use E.164 format with country code, for example +91 for India.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">OTP Channel</label>
                <div className="grid grid-cols-2 gap-3">
                  {DELIVERY_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer transition-all text-sm ${
                        otpChannel === option.value
                          ? 'bg-teal-300/10 border-teal-300/40 text-teal-100'
                          : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06]'
                      }`}
                    >
                      <input
                        type="radio"
                        value={option.value}
                        checked={otpChannel === option.value}
                        onChange={() => setOtpChannel(option.value)}
                        className="hidden"
                      />
                      <span className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">{option.value}</span>
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-300 via-cyan-300 to-emerald-300 text-[#053438] font-extrabold tracking-wide hover:shadow-[0_16px_30px_rgba(45,212,191,0.35)] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating Account...' : 'Sign Up and Send OTP'}
              </button>
            </form>
          ) : null}

          {step === STEPS.OTP ? (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300 leading-6">
                {hasSentOtp && lastDeliveredChannel ? (
                  <>
                    We sent a verification code to <span className="text-white font-semibold">{phone}</span> via{' '}
                    <span className="text-teal-200 font-semibold">
                      {lastDeliveredChannel === 'sms' ? 'SMS' : 'WhatsApp'}
                    </span>.
                  </>
                ) : (
                  <>
                    We could not confirm OTP delivery yet. Choose a delivery channel and resend the code for{' '}
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
                <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">Choose Delivery Channel</label>
                <div className="grid grid-cols-2 gap-3">
                  {DELIVERY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setOtpChannel(option.value)}
                      className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-all ${
                        otpChannel === option.value
                          ? 'bg-teal-300/10 border-teal-300/40 text-teal-100'
                          : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">Enter OTP Code</label>
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
                {isSubmitting ? 'Verifying...' : 'Verify OTP'}
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isSubmitting}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm text-teal-200 hover:text-teal-100 hover:bg-white/[0.06] transition-all disabled:opacity-50"
              >
                Resend OTP via {channelLabel}
              </button>
            </form>
          ) : null}

          {step === STEPS.DONE ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-[56px] text-emerald-300">check_circle</span>
              <h2 className="text-xl font-headline font-bold text-emerald-300 mt-4 mb-2">Phone Verified</h2>
              <p className="text-sm text-slate-300 leading-6">
                Your account has been created and verified. We are routing you to the next page now.
              </p>
            </div>
          ) : null}

          <div className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link
              to="/login"
              state={{ preferredRole: role }}
              className="text-teal-300 hover:text-teal-200 font-medium transition-colors"
            >
              Sign in here
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
