import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense } from 'react';
import * as THREE from 'three';
import { COLORS } from '../utils/three-config';

const RING_COUNT = 3;
const SEGMENTS = 128;

function PulseRing({ radius, delay, color, speed }) {
  const ref = useRef();

  useFrame((state) => {
    if (!ref.current) return;
    const t = (state.clock.elapsedTime * speed + delay) % (Math.PI * 2);
    const pulse = Math.max(0, Math.sin(t));
    ref.current.scale.setScalar(1 + pulse * 0.15);
    ref.current.material.opacity = 0.15 + pulse * 0.45;
  });

  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.02, 16, SEGMENTS]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.4}
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function ECGLine({ color, speed }) {
  const ref = useRef();
  const geometry = useMemo(() => {
    const points = [];
    const count = 200;
    for (let i = 0; i < count; i++) {
      const x = (i / count - 0.5) * 4;
      points.push(new THREE.Vector3(x, 0, 0));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * speed;
    const positions = ref.current.geometry.attributes.position;
    const count = positions.count;
    for (let i = 0; i < count; i++) {
      const x = positions.getX(i);
      const phase = x * 3 - t * 4;
      // ECG-like waveform: baseline with periodic QRS complex spikes
      const mod = ((phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      let y = 0;
      if (mod < 0.3) y = Math.sin(mod / 0.3 * Math.PI) * 0.05; // P wave
      else if (mod > 1.5 && mod < 1.7) y = -Math.sin((mod - 1.5) / 0.2 * Math.PI) * 0.08; // Q
      else if (mod > 1.7 && mod < 2.1) y = Math.sin((mod - 1.7) / 0.4 * Math.PI) * 0.35; // R
      else if (mod > 2.1 && mod < 2.3) y = -Math.sin((mod - 2.1) / 0.2 * Math.PI) * 0.1; // S
      else if (mod > 3.5 && mod < 4.0) y = Math.sin((mod - 3.5) / 0.5 * Math.PI) * 0.08; // T wave
      positions.setY(i, y);
    }
    positions.needsUpdate = true;
  });

  return (
    <line ref={ref} geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={0.7} linewidth={1} />
    </line>
  );
}

function CenterDot({ color }) {
  const ref = useRef();

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 2) * 0.2;
    ref.current.scale.setScalar(pulse);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.6}
      />
    </mesh>
  );
}

function LoadingFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-primary animate-pulse">Loading 3D...</div>
    </div>
  );
}

export default function VitalPulseRing3D({ bpm = 72, className = '', color = COLORS.primary }) {
  const speed = (bpm / 60) * 0.8;

  return (
    <div className={`relative ${className}`}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas camera={{ position: [0, 0, 3.5], fov: 50 }} fallback={<LoadingFallback />}>
          <ambientLight intensity={0.4} />
          <pointLight position={[0, 0, 5]} color={color} intensity={0.6} />
          <pointLight position={[0, 0, -5]} color={COLORS.secondary} intensity={0.3} />

          {Array.from({ length: RING_COUNT }, (_, i) => (
            <PulseRing
              key={i}
              radius={0.6 + i * 0.35}
              delay={i * 1.2}
              color={i === 0 ? color : i === 1 ? COLORS.secondary : COLORS.cyan}
              speed={speed}
            />
          ))}

          <ECGLine color={color} speed={speed} />
          <CenterDot color={color} />
        </Canvas>
      </Suspense>

      <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-primary/30 z-10">
        <span className="text-primary font-bold text-lg">{bpm}</span>
        <span className="text-slate-400 text-xs ml-1.5">BPM</span>
      </div>
    </div>
  );
}
