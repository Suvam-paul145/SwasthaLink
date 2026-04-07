import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { CAMERA_PRESETS, prefersReducedMotion, supportsWebGL } from '../utils/three-config';

function StaticFallback({ label }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-white/5 rounded-xl">
      <div className="text-center space-y-2">
        <span className="material-symbols-outlined text-primary text-3xl animate-pulse">view_in_ar</span>
        <p className="text-xs text-slate-400">{label || 'Loading 3D...'}</p>
      </div>
    </div>
  );
}

function NoWebGLFallback({ icon = 'view_in_ar', label }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl border border-white/5">
      <div className="text-center space-y-2 opacity-60">
        <span className="material-symbols-outlined text-primary text-4xl">{icon}</span>
        {label && <p className="text-xs text-slate-500">{label}</p>}
      </div>
    </div>
  );
}

export default function HealthSceneWrapper({
  children,
  className = '',
  camera = 'default',
  fallbackIcon,
  fallbackLabel,
  orbitControls = false,
  flat = false,
  style,
}) {
  const hasWebGL = useMemo(() => supportsWebGL(), []);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  if (!hasWebGL) {
    return (
      <div className={className} style={style}>
        <NoWebGLFallback icon={fallbackIcon} label={fallbackLabel || '3D not supported'} />
      </div>
    );
  }

  const cam = CAMERA_PRESETS[camera] || CAMERA_PRESETS.default;

  return (
    <div className={className} style={style}>
      <Suspense fallback={<StaticFallback label={fallbackLabel} />}>
        <Canvas
          camera={cam}
          dpr={[1, reducedMotion ? 1 : 1.5]}
          flat={flat}
          fallback={<StaticFallback label={fallbackLabel} />}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[-10, -10, -5]} color="#4fdbc8" intensity={0.5} />
          {children}
        </Canvas>
      </Suspense>
    </div>
  );
}

export { StaticFallback, NoWebGLFallback };
