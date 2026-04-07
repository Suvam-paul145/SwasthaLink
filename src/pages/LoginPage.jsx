import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { getDashboardRouteForRole, ROLE_OPTIONS, ROLE_META } from '../utils/auth';
import { pageTransition } from '../utils/animations';

const resolvePreferredRole = (value) =>
  ROLE_OPTIONS.some((item) => item.value === value) ? value : 'patient';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, login } = useAuth();

  const [role, setRole] = useState(() => resolvePreferredRole(location.state?.preferredRole));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const returnPath = useMemo(() => {
    const from = location.state?.from;
    if (typeof from === 'string' && from.startsWith('/')) return from;
    return null;
  }, [location.state]);

  useEffect(() => {
    if (!isAuthenticated || !user?.role) return;
    navigate(getDashboardRouteForRole(user.role), { replace: true });
  }, [isAuthenticated, navigate, user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const authSession = await login({
        role,
        email: email.trim(),
        password,
      });

      const destination = returnPath || getDashboardRouteForRole(authSession.user.role);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleMeta = ROLE_META[role] || ROLE_META.patient;

  return (
    <motion.div {...pageTransition} className="min-h-screen bg-[#06101d] text-white relative overflow-hidden px-4 py-8 sm:px-6 lg:px-8 flex items-center">
      <div className={`absolute -top-28 -right-20 w-72 h-72 rounded-full blur-[100px] transition-colors duration-700 ${roleMeta.bg}`} />
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

          <div className="mb-8">
            <p className="text-[11px] uppercase tracking-[0.24em] text-teal-200">Welcome back</p>
            <h1 className="text-3xl font-headline font-extrabold mt-2">SwasthaLink Login</h1>
            <p className="text-sm text-slate-300 mt-2 leading-6">
              Sign in to your dashboard using the role linked to your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">Select Role</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLE_OPTIONS.map((item) => {
                  const meta = ROLE_META[item.value] || {};
                  const isSelected = role === item.value;
                  return (
                    <motion.button
                      key={item.value}
                      type="button"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setRole(item.value)}
                      className={`relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border text-sm transition-all duration-300 cursor-pointer ${
                        isSelected
                          ? `bg-gradient-to-b ${meta.gradient} ${meta.border} border-2 text-white shadow-lg ${meta.glow}`
                          : 'bg-[#0f2334] border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0" }}>
                        {item.icon || 'person'}
                      </span>
                      <span className="text-xs font-semibold">{item.label}</span>
                      {isSelected && (
                        <motion.div
                          layoutId="role-indicator"
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white"
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
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
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-teal-300 hover:text-teal-200 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
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

            <AnimatePresence>
              {error ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-2xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
                >
                  {error}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-300 via-cyan-300 to-emerald-300 text-[#053438] font-extrabold tracking-wide hover:shadow-[0_16px_30px_rgba(45,212,191,0.35)] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Signing in...' : 'Login'}
            </motion.button>
          </form>

          <div className="mt-6 flex flex-col gap-3 text-center text-sm text-slate-400">
            <p>
              Need a new account?{' '}
              <Link
                to="/signup"
                state={{ preferredRole: role }}
                className="text-teal-300 hover:text-teal-200 font-medium transition-colors"
              >
                Create one here
              </Link>
            </p>
            <p className="text-xs leading-5 text-slate-500">
              Protected pages still send unauthenticated visitors here before they can continue.
            </p>
          </div>
        </section>
      </div>
    </motion.div>
  );
}

export default LoginPage;
