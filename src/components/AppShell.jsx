import { useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { getDashboardRouteForRole, ROLE_OPTIONS, ROLE_META } from "../utils/auth";
import Logo from "./Logo";
import RoleSwitcher from "./RoleSwitcher";
import ScrollProgress from "./effects/ScrollProgress";
import LanguageSelector from "./LanguageSelector";

const navItems = [
  { to: "/family-dashboard", icon: "personal_injury", labelKey: "nav.family_dashboard", roles: ["patient"] },
  { to: "/clarity-hub", icon: "auto_awesome", labelKey: "nav.clarity_center", roles: ["patient"] },
  { to: "/admin-panel", icon: "admin_panel_settings", labelKey: "nav.admin_hub", roles: ["admin"] },
  { to: "/doctor-panel", icon: "stethoscope", labelKey: "nav.doctor_portal", roles: ["doctor"] },
  { to: "/settings", icon: "settings", labelKey: "nav.settings" },
];

function AppShell() {
  const navigate = useNavigate();
  const { user, logout, availableRoles } = useAuth();
  const { t } = useLanguage();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const roleLabel = ROLE_OPTIONS.find((item) => item.value === user?.role)?.label || "User";
  const roleMeta = ROLE_META[user?.role] || ROLE_META.patient;

  const allowedNavItems = useMemo(
    () => navItems.filter((item) => !item.roles || item.roles.includes(user?.role)),
    [user?.role]
  );

  const handleGoToRoleDashboard = () => {
    const roleRoute = getDashboardRouteForRole(user?.role);
    if (!roleRoute) return;
    navigate(roleRoute);
    setIsSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-[#070e17] text-white">
      <div className="lg:hidden fixed top-0 left-0 right-0 min-h-16 bg-[#101c2e]/90 backdrop-blur-xl z-50 flex items-center gap-3 px-3 py-2 border-b border-white/5 justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={handleGoToRoleDashboard}
            className="text-left"
            aria-label="Go to role dashboard"
          >
            <Logo size="sm" showText={false} />
          </button>
          <button
            onClick={handleGoToRoleDashboard}
            className={`min-w-0 max-w-[8.5rem] bg-[#0f2334] border text-xs text-slate-100 px-2 py-1 rounded-lg hover:bg-[#15314a] transition-colors ${roleMeta.border}`}
            aria-label="Go to role dashboard"
          >
            <span className="block truncate">{roleLabel}</span>
          </button>
          {availableRoles.length > 1 && (
            <RoleSwitcher mode="compact" />
          )}
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-full hover:bg-white/10 text-slate-200 transition-colors"
          aria-label="Toggle Menu"
        >
          <span className="material-symbols-outlined text-2xl">
            {isSidebarOpen ? "close" : "menu"}
          </span>
        </button>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full flex flex-col z-40 bg-[#0a1628]/95 backdrop-blur-2xl shadow-2xl shadow-teal-900/40 font-headline font-medium text-lg w-[85vw] max-w-72 transition-transform duration-300 border-r border-white/[0.06] overflow-y-auto ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Top edge glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />

        <div className="p-8 flex flex-col gap-3 pt-8 lg:pt-8">
          <button
            type="button"
            onClick={handleGoToRoleDashboard}
            className="hidden text-left lg:block"
            aria-label="Go to role dashboard"
          >
            <Logo size="md" showText={true} />
          </button>
          <div className="hidden lg:flex flex-col gap-1 mt-3 rounded-xl glass-card-enhanced p-3">
            <p className="text-xs text-slate-400 uppercase tracking-[0.16em]">Signed In</p>
            <p className="text-sm text-white font-semibold truncate">{user?.name || "User"}</p>
            <button
              onClick={handleGoToRoleDashboard}
              className="text-xs text-teal-200 text-left hover:text-teal-100 transition-colors"
            >
              {roleLabel} Dashboard
            </button>
            {user?.systemId && (
              <p className="text-[10px] text-slate-500 font-mono mt-1">{user.systemId}</p>
            )}
          </div>
          {availableRoles.length > 1 && (
            <div className="hidden lg:block mt-2">
              <RoleSwitcher mode="expanded" />
            </div>
          )}
        </div>

        <nav className="flex-1 mt-4 lg:mt-8 px-3 flex flex-col gap-1">
          {allowedNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-4 py-3.5 px-4 rounded-xl transition-all duration-300 relative ${
                  isActive
                    ? `bg-gradient-to-r ${roleMeta.gradient} text-white shadow-lg shadow-teal-500/10`
                    : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full nav-active-indicator"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span
                    className={`material-symbols-outlined text-xl transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-105"}`}
                    style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {item.icon}
                  </span>
                  <span className="text-sm font-medium">{t(item.labelKey)}</span>
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl bg-white/[0.03] pointer-events-none" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 sm:p-6 mt-auto flex flex-col gap-4">
          <LanguageSelector />
          {user?.role === "patient" && (
            <button
              onClick={() => {
                navigate('/family-dashboard?tab=reports');
                setIsSidebarOpen(false);
              }}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3 px-5 rounded-xl font-semibold shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 hover:brightness-110 active:scale-[0.97] transition-all flex items-center justify-center gap-2 text-sm"
            >
              <span className="material-symbols-outlined text-lg">description</span>
              Health Reports
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 text-slate-500 py-3 px-4 hover:text-slate-200 rounded-xl hover:bg-white/[0.03] transition-all text-sm"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            <span>Logout</span>
          </button>
        </div>

        {/* Bottom edge glow */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
      </aside>

      <main className="flex-1 lg:ml-72 min-h-screen relative flex flex-col pt-[72px] lg:pt-0 bg-[#070e17]/90 backdrop-blur-sm">
        <ScrollProgress />
        <Outlet />
      </main>
    </div>
  );
}

export default AppShell;
