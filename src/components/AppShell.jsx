import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { getDashboardRouteForRole, ROLE_OPTIONS, ROLE_META } from "../utils/auth";
import Logo from "./Logo";
import RoleSwitcher from "./RoleSwitcher";

const navItems = [
  { to: "/family-dashboard", icon: "personal_injury", label: "Family Dashboard", roles: ["patient"] },
  { to: "/clarity-hub", icon: "auto_awesome", label: "Clarity Center", roles: ["patient"] },
  { to: "/admin-panel", icon: "admin_panel_settings", label: "Admin Hub", roles: ["admin"] },
  { to: "/doctor-panel", icon: "stethoscope", label: "Doctor Portal", roles: ["doctor"] },
  { to: "/settings", icon: "settings", label: "Settings" },
];

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, switchRole, availableRoles } = useAuth();
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
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#101c2e]/90 backdrop-blur-xl z-50 flex items-center px-4 border-b border-white/5 justify-between">
        <div className="flex items-center gap-3">
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
            className={`bg-[#0f2334] border text-xs text-slate-100 px-2 py-1 rounded-lg hover:bg-[#15314a] transition-colors ${roleMeta.border}`}
            aria-label="Go to role dashboard"
          >
            {roleLabel}
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
        className={`fixed left-0 top-0 h-full flex flex-col z-40 bg-[#101c2e]/95 backdrop-blur-2xl shadow-2xl shadow-teal-900/40 font-headline font-medium text-lg w-72 transition-transform duration-300 border-r border-white/5 overflow-y-auto ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-8 flex flex-col gap-3 pt-8 lg:pt-8">
          <button
            type="button"
            onClick={handleGoToRoleDashboard}
            className="hidden text-left lg:block"
            aria-label="Go to role dashboard"
          >
            <Logo size="md" showText={true} />
          </button>
          <div className="hidden lg:flex flex-col gap-1 mt-3 rounded-xl bg-white/[0.03] border border-white/10 p-3">
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

        <nav className="flex-1 mt-4 lg:mt-8">
          {allowedNavItems.map((item, i) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-4 py-4 px-6 transition-all duration-300 hover:translate-x-1 ${
                  isActive
                    ? `bg-gradient-to-r ${roleMeta.gradient} text-white border-r-4 ${roleMeta.border} translate-x-1`
                    : "text-slate-400 hover:text-slate-100 hover:bg-teal-500/5"
                }`
              }
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: location.pathname === item.to ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-8 mt-auto flex flex-col gap-6">
          <button className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary py-4 px-6 rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-xl">chat</span>
            Send to WhatsApp
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 text-slate-400 py-4 px-6 hover:text-slate-100 transition-all"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-72 min-h-screen relative flex flex-col pt-16 lg:pt-0">
        <Outlet />
        <div className="fixed -bottom-20 -right-20 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
        <div className="fixed top-1/2 -left-40 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none z-0"></div>
      </main>
    </div>
  );
}

export default AppShell;
