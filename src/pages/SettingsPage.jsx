import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function SettingsPage() {
  const navigate = useNavigate();
  const { user, session, isDemoSession, updateUserProfile, logout } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [statusMessage, setStatusMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
  }, [user]);

  const profileStats = useMemo(
    () => [
      { label: 'Role', value: user?.role ? user.role.toUpperCase() : 'PATIENT' },
      { label: 'Phone', value: user?.phone || 'Not linked' },
      { label: 'Session', value: isDemoSession ? 'Demo mode' : 'Live session' },
      { label: 'Status', value: user?.phone_verified ? 'Verified' : 'Pending verification' },
    ],
    [isDemoSession, user]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSave = (event) => {
    event.preventDefault();
    setIsSaving(true);
    setStatusMessage('');

    try {
      updateUserProfile({
        name: formData.name.trim() || 'User',
        phone: formData.phone.trim() || null,
      });
      setStatusMessage('Profile updated locally for this session.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
    setStatusMessage('');
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#070e17] text-white p-6 lg:p-10 relative overflow-hidden">
      <div className="absolute -top-40 -left-20 w-80 h-80 bg-teal-500/10 rounded-full blur-[120px]" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px]" />

      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="bg-teal-500/20 text-teal-300 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase border border-teal-500/20">
                Profile
              </span>
              <div className="flex items-center gap-2 text-teal-400/80 text-xs font-medium uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                Manage your account
              </div>
            </div>
            <h1 className="text-4xl lg:text-5xl font-headline font-extrabold tracking-tight text-white">
              Profile Info
            </h1>
            <p className="text-slate-400 text-lg font-light">
              Update the details shown across SwasthaLink and keep your session in sync.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-slate-100 font-semibold hover:bg-white/5 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              Logout
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
                <h2 className="text-2xl font-headline font-bold text-white">Edit profile</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Change your display name and contact number. Email and role stay tied to the signed-in account.
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-400">Display name</span>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10 transition-all"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-400">Phone number</span>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+919876543210"
                    className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10 transition-all"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-400">Email address</span>
                  <input
                    value={formData.email}
                    readOnly
                    className="w-full rounded-2xl bg-white/[0.03] border border-white/10 px-4 py-3 text-slate-300 outline-none cursor-not-allowed"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-400">Role</span>
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
                  {isSaving ? 'Saving...' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-slate-100 font-semibold hover:bg-white/5 transition-all"
                >
                  Reset
                </button>
              </div>

              {statusMessage ? (
                <p className="text-sm text-teal-300 bg-teal-400/10 border border-teal-400/15 rounded-2xl px-4 py-3">
                  {statusMessage}
                </p>
              ) : null}
            </form>
          </article>

          <aside className="space-y-6">
            <article className="glass-card p-6 lg:p-8 rounded-3xl border border-white/10">
              <div className="flex items-center gap-3 mb-5">
                <span className="material-symbols-outlined text-teal-400">badge</span>
                <h3 className="text-xl font-headline font-bold text-white">Account snapshot</h3>
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
                <h3 className="text-xl font-headline font-bold text-rose-300">Account safety</h3>
              </div>
              <p className="text-sm text-slate-400 leading-6 mb-6">
                Use logout when you are done on a shared device. Your saved profile stays in the current browser session until you sign in again.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-5 py-3 rounded-xl bg-rose-500/10 text-rose-300 font-semibold border border-rose-500/20 hover:bg-rose-500/20 transition-all"
                >
                  Logout now
                </button>
                <span className="inline-flex items-center px-4 py-3 rounded-xl border border-white/10 text-slate-400 text-sm">
                  {session?.loggedInAt ? `Signed in ${new Date(session.loggedInAt).toLocaleString()}` : 'Session started recently'}
                </span>
              </div>
            </article>

            {isDemoSession ? (
              <article className="glass-card p-6 rounded-3xl border border-amber-500/10 bg-amber-500/5">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-amber-300">science</span>
                  <div>
                    <h3 className="text-base font-bold text-amber-200">Demo session</h3>
                    <p className="text-sm text-amber-100/70">Edits are stored locally for this browser only.</p>
                  </div>
                </div>
              </article>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
