import { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORS } from '../utils/three-config';

const PARTICLE_COUNT = 60;
const SPREAD = 4;

function Particles({ count, color }) {
  const mesh = useRef();

  const { positions, speeds, offsets } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    const off = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * SPREAD;
      pos[i * 3 + 1] = (Math.random() - 0.5) * SPREAD;
      pos[i * 3 + 2] = (Math.random() - 0.5) * SPREAD * 0.5;
      spd[i] = Math.random() * 0.3 + 0.1;
      off[i] = Math.random() * Math.PI * 2;
    }
    return { positions: pos, speeds: spd, offsets: off };
  }, [count]);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime;
    const posArr = mesh.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const base = i * 3;
      posArr[base + 1] += Math.sin(t * speeds[i] + offsets[i]) * 0.002;
      posArr[base] += Math.cos(t * speeds[i] * 0.7 + offsets[i]) * 0.001;
    }
    mesh.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.04}
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function ConnectionLines({ count }) {
  const ref = useRef();
  const linePositions = useMemo(() => {
    const pts = [];
    const nodeCount = Math.min(count, 12);
    const nodes = Array.from({ length: nodeCount }, () => [
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 1.5,
    ]);
    // Connect nearby nodes
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dx = nodes[i][0] - nodes[j][0];
        const dy = nodes[i][1] - nodes[j][1];
        const dz = nodes[i][2] - nodes[j][2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 2.2) {
          pts.push(...nodes[i], ...nodes[j]);
        }
      }
    }
    return new Float32Array(pts);
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.02;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
  });

  return (
    <lineSegments ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={linePositions.length / 3}
          array={linePositions}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color={COLORS.primary} transparent opacity={0.12} />
    </lineSegments>
  );
}

function GlowOrb({ position, color, scale = 1 }) {
  const ref = useRef();

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = position[1] + Math.sin(t * 0.5 + position[0]) * 0.2;
    const pulse = 1 + Math.sin(t * 1.5 + position[2]) * 0.15;
    ref.current.scale.setScalar(scale * pulse);
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.06, 12, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.8}
        transparent
        opacity={0.5}
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

export default function MedicalParticles3D({ count = PARTICLE_COUNT, className = '' }) {
  const orbPositions = useMemo(
    () =>
      Array.from({ length: 5 }, () => [
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 1.5,
      ]),
    []
  );

  return (
    <div className={`relative ${className}`}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas camera={{ position: [0, 0, 4], fov: 50 }} fallback={<LoadingFallback />}>
          <ambientLight intensity={0.3} />
          <pointLight position={[0, 0, 5]} color={COLORS.primary} intensity={0.4} />

          <Particles count={count} color={COLORS.primary} />
          <Particles count={Math.floor(count * 0.4)} color={COLORS.secondary} />
          <ConnectionLines count={count} />

          {orbPositions.map((pos, i) => (
            <GlowOrb
              key={i}
              position={pos}
              color={i % 2 === 0 ? COLORS.primary : COLORS.secondary}
              scale={Math.random() * 0.5 + 0.8}
            />
          ))}
        </Canvas>
      </Suspense>
    </div>
  );
}
