// Shared Three.js / R3F configuration for SwasthaLink medical 3D visuals
export const COLORS = {
  primary: '#4fdbc8',
  primaryRgb: [0.31, 0.86, 0.78],
  secondary: '#818cf8',
  secondaryRgb: [0.51, 0.55, 0.97],
  accent: '#f472b6',
  darkBg: '#070e17',
  surface: '#0a0e1a',
  white: '#ffffff',
  red: '#ef4444',
  cyan: '#22d3ee',
};

export const MATERIAL_PRESETS = {
  glossyTeal: { color: COLORS.primary, metalness: 0.8, roughness: 0.2, emissive: COLORS.primary, emissiveIntensity: 0.15 },
  glassIndigo: { color: COLORS.secondary, metalness: 0.6, roughness: 0.3, transparent: true, opacity: 0.7, emissive: COLORS.secondary, emissiveIntensity: 0.1 },
  softWhite: { color: COLORS.white, metalness: 0.1, roughness: 0.6, transparent: true, opacity: 0.5 },
};

export const CAMERA_PRESETS = {
  default: { position: [0, 0, 4], fov: 50 },
  close: { position: [0, 0, 3], fov: 45 },
  wide: { position: [0, 0, 6], fov: 55 },
};

export const LIGHT_PRESETS = {
  standard: { ambient: 0.5, directional: 1, point: 0.5 },
  soft: { ambient: 0.6, directional: 0.6, point: 0.3 },
};

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const supportsWebGL = () => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
};
