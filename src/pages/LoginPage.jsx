import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardRouteForRole, ROLE_OPTIONS } from '../utils/auth';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, login } = useAuth();

  const [role, setRole] = useState('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="min-h-screen bg-[#070e17] text-white flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute -top-28 -right-20 w-72 h-72 bg-teal-400/10 rounded-full blur-[100px]" />
      <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-cyan-400/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md glass-card rounded-3xl border border-white/10 p-6 sm:p-8 relative z-10">
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-200">Role-Based Access</p>
          <h1 className="text-3xl font-headline font-extrabold mt-2">SwasthaLink Login</h1>
          <p className="text-sm text-slate-300 mt-2">
            Sign in with your role, email ID, and password to open your dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">Role</label>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
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
            <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">Email ID</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@hospital.com"
              className="w-full rounded-xl bg-[#0f2334] border border-white/15 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-300/40"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 uppercase tracking-[0.16em]">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-xl bg-[#0f2334] border border-white/15 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-300/40"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-300 to-cyan-400 text-[#053438] font-bold hover:shadow-[0_12px_24px_rgba(45,212,191,0.35)] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Signing in...' : 'Login'}
          </button>
        </form>




        <div className="mt-4 text-center text-sm text-slate-400">
          New patient?{' '}
          <Link
            to="/signup"
            className="text-teal-300 hover:text-teal-200 font-medium transition-colors"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
