import { lazy, Suspense, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';

const AmbientMolecule = lazy(() => import('../components/effects/AmbientMolecule'));

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestOtp = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const response = await api.requestPasswordResetOTP({ email, phone });
      setMessage(response?.message || 'OTP sent successfully.');
      setStep(2);
    } catch (err) {
      setError(err?.message || 'Failed to send OTP. Please check your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      await api.resetPasswordWithOTP({
        email,
        phone,
        code: otp,
        new_password: newPassword,
      });
      setMessage('Password reset successfully. Redirecting to login...');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);
    } catch (err) {
      setError(err?.message || 'Failed to reset password. Please check your OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06101d] text-white relative overflow-hidden px-4 py-8 sm:px-6 lg:px-8 flex items-center">
      <div className="absolute -top-28 -right-20 w-72 h-72 bg-teal-400/10 rounded-full blur-[100px]" />
      <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-cyan-400/10 rounded-full blur-[120px]" />
      <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_top_left,white,transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.8),transparent_34%)]" />

      <Suspense fallback={null}>
        <AmbientMolecule className="hidden lg:block absolute right-8 bottom-1/4 w-36 h-36 opacity-30 z-0" />
      </Suspense>

      <div className="relative z-10 w-full max-w-xl mx-auto">
        <section className="glass-card auth-card-glow rounded-[32px] border border-white/10 p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between mb-8">
            <Link to="/" className="hover:opacity-90 transition-opacity w-fit">
              <Logo size="md" showText={true} />
            </Link>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <Link to="/" className="text-sm text-teal-200 hover:text-teal-100 transition-colors">
                {t('forgot.back_landing')}
              </Link>
              <Link to="/login" className="text-sm text-teal-300 hover:text-teal-200 transition-colors">
                {t('forgot.back_login')}
              </Link>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-teal-200">{t('forgot.recovery')}</p>
            <h1 className="text-3xl font-headline font-extrabold mt-2">
              {step === 1 ? t('forgot.title') : t('forgot.reset_title')}
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-6">
              {step === 1
                ? t('forgot.desc_request')
                : t('forgot.desc_reset')}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">{t('forgot.email')}</label>
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
                <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">{t('forgot.phone')}</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+919876543210"
                  className="w-full rounded-2xl bg-[#0f2334] border border-white/15 px-4 py-3 text-sm text-white placeholder:text-slate-500 shadow-inner shadow-black/10 focus:outline-none focus:ring-2 focus:ring-teal-300/40"
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              ) : null}

              {message ? (
                <div className="rounded-2xl border border-teal-300/30 bg-teal-500/10 px-4 py-3 text-sm text-teal-100">
                  {message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-300 via-cyan-300 to-emerald-300 text-[#053438] font-extrabold tracking-wide hover:shadow-[0_16px_30px_rgba(45,212,191,0.35)] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? t('forgot.sending') : t('forgot.send_otp')}
              </button>
            </form>
          ) : null}

          {step === 2 ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">{t('forgot.otp_code')}</label>
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="0 0 0 0 0 0"
                  className="w-full rounded-2xl bg-[#0f2334] border border-white/15 px-4 py-4 text-center text-2xl font-bold tracking-[12px] text-white placeholder:text-slate-500 shadow-inner shadow-black/10 focus:outline-none focus:ring-2 focus:ring-teal-300/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">{t('forgot.new_password')}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder={t('forgot.create_new')}
                    className="w-full rounded-2xl bg-[#0f2334] border border-white/15 px-4 py-3 pr-16 text-sm text-white placeholder:text-slate-500 shadow-inner shadow-black/10 focus:outline-none focus:ring-2 focus:ring-teal-300/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-0 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-teal-200 hover:text-teal-100 transition-colors"
                  >
                    {showPassword ? t('forgot.hide') : t('forgot.show')}
                  </button>
                </div>
              </div>

              {message ? (
                <div className="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {message}
                </div>
              ) : null}

              {error ? (
                <div className="rounded-2xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-300 via-cyan-300 to-emerald-300 text-[#053438] font-extrabold tracking-wide hover:shadow-[0_16px_30px_rgba(45,212,191,0.35)] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? t('forgot.resetting') : t('forgot.reset_btn')}
              </button>
            </form>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
