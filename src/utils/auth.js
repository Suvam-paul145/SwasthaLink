export const AUTH_STORAGE_KEY = 'swasthalink_auth_session_v1';

export const ROLE_OPTIONS = [
  { value: 'patient', label: 'Patient', icon: 'personal_injury', color: 'emerald' },
  { value: 'doctor', label: 'Doctor', icon: 'stethoscope', color: 'cyan' },
  { value: 'admin', label: 'Admin', icon: 'shield_person', color: 'violet' },
];

export const ROLE_DASHBOARD_ROUTE = {
  patient: '/family-dashboard',
  doctor: '/doctor-panel',
  admin: '/admin-panel',
};

export const getDashboardRouteForRole = (role) => ROLE_DASHBOARD_ROUTE[role] || '/overview';

/**
 * Generate a system Admin ID in format ADM-XXXXXXXXXX
 * Uses timestamp + random chars for uniqueness
 */
export function generateAdminId() {
  const ts = Date.now().toString(36).toUpperCase();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ADM-${ts}${rand}`;
}

/**
 * Generate a system Doctor ID in format DOC-XXXXXXXXXX
 */
export function generateDoctorId() {
  const ts = Date.now().toString(36).toUpperCase();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `DOC-${ts}${rand}`;
}

/** Storage key for user's available roles (multi-role support) */
export const ROLES_STORAGE_KEY = 'swasthalink_user_roles_v1';

/**
 * Get all roles a user has access to
 */
export function getUserRoles() {
  try {
    const raw = window.localStorage.getItem(ROLES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save available roles for the user
 */
export function setUserRoles(roles) {
  window.localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
}

/** Role metadata for UI rendering */
export const ROLE_META = {
  patient: {
    gradient: 'from-emerald-400 via-teal-400 to-green-400',
    glow: 'rgba(52,211,153,0.3)',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    border: 'border-emerald-400/30',
  },
  doctor: {
    gradient: 'from-cyan-400 via-blue-400 to-sky-400',
    glow: 'rgba(34,211,238,0.3)',
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-300',
    border: 'border-cyan-400/30',
  },
  admin: {
    gradient: 'from-violet-400 via-purple-400 to-fuchsia-400',
    glow: 'rgba(167,139,250,0.3)',
    bg: 'bg-violet-500/15',
    text: 'text-violet-300',
    border: 'border-violet-400/30',
  },
};

