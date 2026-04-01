import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardRouteForRole, ROLE_OPTIONS } from '../utils/auth';
import api from '../services/api';

const STEPS = { FORM: 'form', OTP: 'otp', DONE: 'done' };

export default function SignupPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [step, setStep] = useState(STEPS.FORM);
  const [role, setRole] = useState('patient');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpChannel, setOtpChannel] = useState('whatsapp');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (!isAuthenticated || !user?.role) return;
    navigate(getDashboardRouteForRole(user.role), { replace: true });
  }, [isAuthenticated, navigate, user]);

  // ── Step 1: Signup ──
  const handleSignup = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!name.trim() || !email.trim() || !password || !phone.trim()) {
      setError('All fields are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!/^\+\d{10,15}$/.test(phone.trim())) {
      setError('Phone must be in E.164 format (e.g. +919876543210)');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.signup({
        role,
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
      });

      // Send OTP automatically
      const otpResult = await api.sendOtp(phone.trim(), otpChannel);
      if (otpResult.demo_mode) {
        setInfo('Demo mode: Use OTP code 123456');
      }
      setStep(STEPS.OTP);
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [role, name, email, password, phone, otpChannel]);

  // ── Step 2: Verify OTP ──
  const handleVerifyOtp = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!otp || otp.length < 4) {
      setError('Please enter the OTP code');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api.verifyOtp(phone.trim(), otp);
      if (result.verified) {
        setStep(STEPS.DONE);
        setTimeout(() => navigate('/login'), 2500);
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [otp, phone, navigate]);

  // ── Resend OTP ──
  const handleResendOtp = useCallback(async () => {
    setError('');
    setInfo('');
    setIsSubmitting(true);
    try {
      const result = await api.sendOtp(phone.trim(), otpChannel);
      if (result.demo_mode) {
        setInfo('Demo mode: Use OTP code 123456');
      } else {
        setInfo('OTP resent successfully!');
      }
    } catch (err) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setIsSubmitting(false);
    }
  }, [phone, otpChannel]);

  // ── Step indicator ──
  const stepLabel = step === STEPS.FORM
    ? 'Create Your Account'
    : step === STEPS.OTP
      ? 'Verify Phone Number'
      : 'Account Created!';

  const stepNumber = step === STEPS.FORM ? 1 : step === STEPS.OTP ? 2 : 3;

  return (
    <div className="min-h-screen bg-[#070e17] text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient glow blobs — match login */}
      <div className="absolute -top-28 -right-20 w-72 h-72 bg-teal-400/10 rounded-full blur-[100px]" />
      <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-cyan-400/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md glass-card rounded-3xl border border-white/10 p-6 sm:p-8 relative z-10">
        {/* Header */}
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-200">Role-Based Access</p>
          <h1 className="text-3xl font-headline font-extrabold mt-2">SwasthaLink Signup</h1>
          <p className="text-sm text-slate-300 mt-2">{stepLabel}</p>
        </div>

        {/* Step progress bar */}
        <div className="flex items-center gap-0 mb-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                  n < stepNumber
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                    : n === stepNumber
                      ? 'bg-gradient-to-r from-teal-300 to-cyan-400 border-teal-300/50 text-[#053438] shadow-[0_0_16px_rgba(45,212,191,0.4)]'
                      : 'bg-white/5 border-white/15 text-slate-500'
                }`}
              >
                {n < stepNumber ? '✓' : n}
              </div>
              {n < 3 && (
                <div className={`w-10 h-0.5 ${n < stepNumber ? 'bg-emerald-400/40' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Error message */}
        {error ? (
          <div className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100 mb-4">
            {error}
          </div>
        ) : null}

        {/* Info message (demo OTP, resent, etc.) */}
        {info ? (
          <div className="rounded-xl border border-teal-300/30 bg-teal-500/10 px-3 py-2 text-xs text-teal-100 mb-4">
            {info}
          </div>
        ) : null}

        {/* ── STEP 1: Signup Form ── */}
        {step === STEPS.FORM && (
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Role selector — matches login */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl bg-[#0f2334] border border-white/15 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-300/40"
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
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-xl bg-[#0f2334] border border-white/15 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-300/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">Email ID</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@hospital.com"
                className="w-full rounded-xl bg-[#0f2334] border border-white/15 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-300/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full rounded-xl bg-[#0f2334] border border-white/15 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-300/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">WhatsApp Phone</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full rounded-xl bg-[#0f2334] border border-white/15 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-300/40"
              />
              <p className="text-[11px] text-slate-500">E.164 format with country code (e.g. +91 for India)</p>
            </div>

            {/* OTP Channel */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">OTP Channel</label>
              <div className="flex gap-4">
                {[
                  { value: 'whatsapp', icon: '💬', label: 'WhatsApp' },
                  { value: 'sms', icon: '📱', label: 'SMS' },
                ].map((ch) => (
                  <label
                    key={ch.value}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all text-sm ${
                      otpChannel === ch.value
                        ? 'bg-teal-300/10 border-teal-300/40 text-teal-100'
                        : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <input
                      type="radio"
                      value={ch.value}
                      checked={otpChannel === ch.value}
                      onChange={() => setOtpChannel(ch.value)}
                      className="hidden"
                    />
                    <span>{ch.icon}</span> {ch.label}
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-300 to-cyan-400 text-[#053438] font-bold hover:shadow-[0_12px_24px_rgba(45,212,191,0.35)] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating Account...' : 'Sign Up & Send OTP'}
            </button>
          </form>
        )}

        {/* ── STEP 2: OTP Verification ── */}
        {step === STEPS.OTP && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-slate-300 text-center">
              We've sent a verification code to <span className="text-white font-semibold">{phone}</span> via{' '}
              {otpChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">Enter OTP Code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setError('');
                }}
                placeholder="• • • • • •"
                maxLength={6}
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                className="w-full rounded-xl bg-[#0f2334] border border-white/15 px-3 py-4 text-center text-2xl font-bold tracking-[12px] text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-300/40"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || otp.length < 4}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-300 to-cyan-400 text-[#053438] font-bold hover:shadow-[0_12px_24px_rgba(45,212,191,0.35)] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Verifying...' : 'Verify OTP'}
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isSubmitting}
              className="w-full text-center text-sm text-teal-300 hover:text-teal-200 transition-colors disabled:opacity-50"
            >
              Didn't receive code? Resend OTP
            </button>
          </form>
        )}

        {/* ── STEP 3: Success ── */}
        {step === STEPS.DONE && (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-headline font-bold text-emerald-300 mb-2">Phone Verified!</h2>
            <p className="text-sm text-slate-300">
              Your account has been created and verified. Redirecting to login...
            </p>
          </div>
        )}

        {/* Footer — matches login */}
        <div className="mt-4 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-teal-300 hover:text-teal-200 font-medium transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
