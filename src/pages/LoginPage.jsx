import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { getDashboardRouteForRole, ROLE_OPTIONS } from '../utils/auth';

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

          <div className="mb-8">
            <p className="text-[11px] uppercase tracking-[0.24em] text-teal-200">Welcome back</p>
            <h1 className="text-3xl font-headline font-extrabold mt-2">SwasthaLink Login</h1>
            <p className="text-sm text-slate-300 mt-2 leading-6">
              Sign in to your dashboard using the role linked to your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              {isSubmitting ? 'Signing in...' : 'Login'}
            </button>
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
    </div>
  );
}

export default LoginPage;
