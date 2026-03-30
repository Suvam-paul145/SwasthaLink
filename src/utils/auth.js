export const AUTH_STORAGE_KEY = 'swasthalink_auth_session_v1';

export const ROLE_OPTIONS = [
  { value: 'patient', label: 'Patient' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'admin', label: 'Admin' },
];

export const ROLE_DASHBOARD_ROUTE = {
  patient: '/family-dashboard',
  doctor: '/doctor-panel',
  admin: '/admin-panel',
};

export const getDashboardRouteForRole = (role) => ROLE_DASHBOARD_ROUTE[role] || '/overview';

