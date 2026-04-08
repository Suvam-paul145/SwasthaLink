import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';

const AmbientCells = lazy(() => import('../components/effects/AmbientCells'));

function SettingsPage() {
  const navigate = useNavigate();
  const { user, session, updateUserProfile, logout } = useAuth();
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('success'); // 'success' | 'error' | 'info'
  const [isSaving, setIsSaving] = useState(false);

  // OTP verification state
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpPhone, setOtpPhone] = useState(''); // phone that OTP was sent to

  useEffect(() => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
  }, [user]);

  const phoneChanged = formData.phone.trim() && formData.phone.trim() !== (user?.phone || '');

  const profileStats = useMemo(
    () => [
      { label: t('settings.role'), value: user?.role ? user.role.toUpperCase() : 'PATIENT' },
      { label: t('settings.phone'), value: user?.phone || t('settings.not_linked') },
      { label: t('settings.session_label'), value: t('settings.active') },
      { label: 'Status', value: user?.phone_verified ? t('settings.verified') : t('settings.pending_verify') },
    ],
    [user, language]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    // Reset OTP flow if phone changes again
    if (name === 'phone') {
      setShowOtpInput(false);
      setOtpCode('');
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setStatusMessage('');

    try {
      await updateUserProfile({
        name: formData.name.trim() || 'User',
        phone: formData.phone.trim() || null,
      });

      // If phone changed, auto-send OTP for verification
      if (phoneChanged) {
        setStatusMessage('Profile saved! Sending OTP to verify your new phone number...');
        setStatusType('info');
        await handleSendOtp(formData.phone.trim());
      } else {
        setStatusMessage('Profile updated successfully.');
        setStatusType('success');
      }
    } catch (err) {
      setStatusMessage(err.message || 'Failed to save profile. Please try again.');
      setStatusType('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendOtp = async (phone) => {
    setOtpSending(true);
    try {
      const targetPhone = phone || otpPhone || formData.phone.trim();
      await api.sendOtp(targetPhone, 'whatsapp');
      setOtpPhone(targetPhone);
      setShowOtpInput(true);
      setOtpCode('');
      setStatusMessage(`OTP sent to ${targetPhone} via WhatsApp. Enter the code below.`);
      setStatusType('info');
    } catch (err) {
      setStatusMessage(err.message || 'Failed to send OTP. Please try again.');
      setStatusType('error');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) return;
    setOtpVerifying(true);
    try {
      const result = await api.verifyOtp(otpPhone, otpCode.trim(), {
        user_id: user?.id,
        email: user?.email,
      });
      if (result?.verified) {
        setShowOtpInput(false);
        setOtpCode('');
        // Update local session with verified status
        await updateUserProfile({ phone_verified: true });
        setStatusMessage('Phone number verified successfully!');
        setStatusType('success');
      } else {
        setStatusMessage('Invalid OTP code. Please try again.');
        setStatusType('error');
      }
    } catch (err) {
      setStatusMessage(err.message || 'OTP verification failed. Please try again.');
      setStatusType('error');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
    setStatusMessage('');
    setShowOtpInput(false);
    setOtpCode('');
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#070e17] text-white p-6 lg:p-10 relative overflow-hidden">
      <div className="absolute -top-40 -left-20 w-80 h-80 bg-teal-500/10 rounded-full blur-[120px]" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px]" />

      <Suspense fallback={null}>
        <AmbientCells className="hidden lg:block absolute right-8 bottom-24 w-40 h-40 opacity-20 z-0" />
      </Suspense>

      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="bg-teal-500/20 text-teal-300 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase border border-teal-500/20">
                {t('settings.profile')}
              </span>
              <div className="flex items-center gap-2 text-teal-400/80 text-xs font-medium uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                {t('settings.manage')}
              </div>
            </div>
            <h1 className="text-4xl lg:text-5xl font-headline font-extrabold tracking-tight text-white">
              {t('settings.title')}
            </h1>
            <p className="text-slate-400 text-lg font-light">
              {t('settings.subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-slate-100 font-semibold hover:bg-white/5 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              {t('settings.logout')}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
          <article className="glass-card p-6 lg:p-8 rounded-3xl border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
            <div className="flex items-start gap-4 mb-8">
              <div className="bg-teal-400/10 p-4 rounded-2xl border border-teal-400/10">
                <span className="material-symbols-outlined text-teal-400 text-[28px]">person</span>
              </div>
              <div>
                <h2 className="text-2xl font-headline font-bold text-white">{t('settings.edit')}</h2>
                <p className="text-sm text-slate-400 mt-1">
                  {t('settings.edit_desc')}
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-400">{t('settings.display_name')}</span>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={t('settings.full_name')}
                    className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10 transition-all"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-400">{t('settings.phone')}</span>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+919876543210"
                    className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10 transition-all"
                  />
                  {phoneChanged && !showOtpInput && (
                    <p className="text-xs text-amber-400/80 mt-1">
                      {t('settings.phone_changed')}
                    </p>
                  )}
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-400">{t('settings.email_address')}</span>
                  <input
                    value={formData.email}
                    readOnly
                    className="w-full rounded-2xl bg-white/[0.03] border border-white/10 px-4 py-3 text-slate-300 outline-none cursor-not-allowed"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-400">{t('settings.role')}</span>
                  <input
                    value={(user?.role || 'patient').toUpperCase()}
                    readOnly
                    className="w-full rounded-2xl bg-white/[0.03] border border-white/10 px-4 py-3 text-slate-300 outline-none cursor-not-allowed"
                  />
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-[#041115] font-bold hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  {isSaving ? t('settings.saving') : t('settings.save')}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-slate-100 font-semibold hover:bg-white/5 transition-all"
                >
                  {t('settings.reset')}
                </button>
              </div>

              {/* OTP Verification Section */}
              {showOtpInput && (
                <div className="bg-white/[0.03] border border-teal-400/20 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-teal-400">verified</span>
                    <h3 className="text-base font-bold text-white">{t('settings.verify_phone')}</h3>
                  </div>
                  <p className="text-sm text-slate-400">
                    {t('settings.otp_sent_to')} <span className="text-teal-300 font-semibold">{otpPhone}</span> {t('settings.via_whatsapp')}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder={t('settings.enter_otp')}
                      maxLength={6}
                      className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-center text-lg font-mono tracking-[0.5em] placeholder:text-slate-500 placeholder:tracking-normal placeholder:text-sm outline-none focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10 transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={otpVerifying || otpCode.length < 4}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-[#041115] font-bold hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[20px]">{otpVerifying ? 'progress_activity' : 'check_circle'}</span>
                      {otpVerifying ? t('settings.verifying') : t('settings.verify')}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendOtp(otpPhone)}
                    disabled={otpSending}
                    className="text-sm text-teal-400 hover:text-teal-300 transition-colors disabled:opacity-50"
                  >
                    {otpSending ? t('settings.sending') : t('settings.resend_otp')}
                  </button>
                </div>
              )}

              {statusMessage ? (
                <p className={`text-sm rounded-2xl px-4 py-3 ${
                  statusType === 'error'
                    ? 'text-rose-300 bg-rose-400/10 border border-rose-400/15'
                    : statusType === 'info'
                    ? 'text-amber-300 bg-amber-400/10 border border-amber-400/15'
                    : 'text-teal-300 bg-teal-400/10 border border-teal-400/15'
                }`}>
                  {statusMessage}
                </p>
              ) : null}
            </form>
          </article>

          <aside className="space-y-6">
            <article className="glass-card p-6 lg:p-8 rounded-3xl border border-white/10">
              <div className="flex items-center gap-3 mb-5">
                <span className="material-symbols-outlined text-teal-400">badge</span>
                <h3 className="text-xl font-headline font-bold text-white">{t('settings.snapshot')}</h3>
              </div>

              <div className="space-y-4">
                {profileStats.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4 rounded-2xl bg-white/[0.03] border border-white/5 px-4 py-3">
                    <span className="text-sm text-slate-400">{item.label}</span>
                    <span className="text-sm font-semibold text-white text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="glass-card p-6 lg:p-8 rounded-3xl border border-rose-500/10 bg-gradient-to-br from-rose-500/5 to-transparent">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-rose-400">lock</span>
                <h3 className="text-xl font-headline font-bold text-rose-300">{t('settings.safety')}</h3>
              </div>
              <p className="text-sm text-slate-400 leading-6 mb-6">
                {t('settings.safety_desc')}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-5 py-3 rounded-xl bg-rose-500/10 text-rose-300 font-semibold border border-rose-500/20 hover:bg-rose-500/20 transition-all"
                >
                  {t('settings.logout_now')}
                </button>
                <span className="inline-flex items-center px-4 py-3 rounded-xl border border-white/10 text-slate-400 text-sm">
                  {session?.loggedInAt ? `${t('settings.signed_in')} ${new Date(session.loggedInAt).toLocaleString()}` : t('settings.session_recent')}
                </span>
              </div>
            </article>


          </aside>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
