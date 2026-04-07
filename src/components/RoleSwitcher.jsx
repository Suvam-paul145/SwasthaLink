import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { ROLE_OPTIONS, ROLE_META, getDashboardRouteForRole } from '../utils/auth';

function RoleSwitcher({ compact = false }) {
  const { user, switchRole, availableRoles } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef(null);

  const currentRole = user?.role || 'patient';
  const meta = ROLE_META[currentRole] || ROLE_META.patient;
  const currentOption = ROLE_OPTIONS.find((r) => r.value === currentRole);

  // All roles available (fallback to all if none stored)
  const roles = ROLE_OPTIONS.filter(
    (r) => availableRoles.length === 0 || availableRoles.includes(r.value)
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitch = async (role) => {
    if (role === currentRole || switching) return;
    setSwitching(true);
    try {
      await switchRole(role);
      setIsOpen(false);
      navigate(getDashboardRouteForRole(role), { replace: true });
    } finally {
      setSwitching(false);
    }
  };

  if (compact) {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl ${meta.bg} ${meta.border} border backdrop-blur-sm transition-all hover:scale-[1.02] active:scale-[0.98]`}
        >
          <span className={`material-symbols-outlined text-lg ${meta.text}`}>
            {currentOption?.icon}
          </span>
          <span className={`text-xs font-bold uppercase tracking-wider ${meta.text}`}>
            {currentOption?.label}
          </span>
          <span className={`material-symbols-outlined text-sm ${meta.text} transition-transform ${isOpen ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-2 z-50 w-56 rounded-2xl border border-white/10 bg-[#0c1929]/95 backdrop-blur-2xl shadow-2xl shadow-black/40 overflow-hidden"
            >
              <div className="p-2 space-y-1">
                {roles.map((role) => {
                  const rmeta = ROLE_META[role.value];
                  const isActive = role.value === currentRole;
                  return (
                    <button
                      key={role.value}
                      onClick={() => handleSwitch(role.value)}
                      disabled={switching}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                        isActive
                          ? `${rmeta.bg} ${rmeta.border} border`
                          : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-lg ${rmeta.text}`} style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                        {role.icon}
                      </span>
                      <div className="text-left flex-1">
                        <span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-300'}`}>
                          {role.label}
                        </span>
                      </div>
                      {isActive && (
                        <span className={`material-symbols-outlined text-sm ${rmeta.text}`}>check_circle</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {switching && (
                <div className="px-3 py-2 border-t border-white/5 text-center">
                  <span className="text-[10px] text-slate-400 animate-pulse">Switching role...</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 font-bold">Active Role</p>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-[10px] text-teal-300 hover:text-teal-200 transition-colors flex items-center gap-1"
          >
            Switch
            <span className={`material-symbols-outlined text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>
        </div>

        <div className={`flex items-center gap-3 px-3 py-2 rounded-xl ${meta.bg} ${meta.border} border`}>
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${meta.gradient} flex items-center justify-center`}>
            <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              {currentOption?.icon}
            </span>
          </div>
          <div>
            <p className="text-sm font-bold text-white">{currentOption?.label}</p>
            {user?.systemId && (
              <p className="text-[10px] text-slate-400 font-mono">{user.systemId}</p>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border border-white/10 bg-[#0c1929]/95 backdrop-blur-2xl shadow-2xl shadow-black/40 overflow-hidden"
          >
            <div className="p-2 space-y-1">
              {roles.map((role) => {
                const rmeta = ROLE_META[role.value];
                const isActive = role.value === currentRole;
                return (
                  <button
                    key={role.value}
                    onClick={() => handleSwitch(role.value)}
                    disabled={switching}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                      isActive
                        ? `${rmeta.bg} ${rmeta.border} border`
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${rmeta.gradient} flex items-center justify-center`}>
                      <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                        {role.icon}
                      </span>
                    </div>
                    <div className="text-left flex-1">
                      <span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-300'}`}>
                        {role.label}
                      </span>
                    </div>
                    {isActive && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`material-symbols-outlined text-sm ${rmeta.text}`}
                      >
                        check_circle
                      </motion.span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RoleSwitcher;
