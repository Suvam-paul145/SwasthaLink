import { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sphere } from '@react-three/drei';
import * as THREE from 'three';

function ParticleField({ count = 200, color = '#4fdbc8' }) {
  const points = useRef();
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y = state.clock.getElapsedTime() * 0.05;
      points.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.03) * 0.1;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.02} color={color} transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

function GlowOrb({ position = [0, 0, 0], color = '#4fdbc8', scale = 1, speed = 1 }) {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime() * speed;
      meshRef.current.position.y = position[1] + Math.sin(t) * 0.3;
      meshRef.current.scale.setScalar(scale + Math.sin(t * 2) * 0.05);
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
      <Sphere ref={meshRef} args={[0.5, 32, 32]} position={position}>
        <MeshDistortMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          roughness={0.1}
          metalness={0.8}
          distort={0.3}
          speed={2}
          transparent
          opacity={0.85}
        />
      </Sphere>
    </Float>
  );
}

function HolographicRing({ radius = 2, color = '#4fdbc8' }) {
  const ringRef = useRef();

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.getElapsedTime() * 0.3;
      ringRef.current.rotation.x = Math.PI / 2 + Math.sin(state.clock.getElapsedTime() * 0.2) * 0.1;
    }
  });

  return (
    <mesh ref={ringRef}>
      <torusGeometry args={[radius, 0.02, 16, 100]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
        transparent
        opacity={0.7}
      />
    </mesh>
  );
}

function DashboardScene({ variant = 'admin' }) {
  const colors = {
    admin: { primary: '#a78bfa', secondary: '#c084fc', accent: '#818cf8' },
    doctor: { primary: '#22d3ee', secondary: '#06b6d4', accent: '#67e8f9' },
    patient: { primary: '#34d399', secondary: '#10b981', accent: '#6ee7b7' },
  };
  const c = colors[variant] || colors.admin;

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={0.8} color={c.primary} />
      <pointLight position={[-5, -3, 3]} intensity={0.4} color={c.secondary} />

      <ParticleField count={150} color={c.accent} />
      <GlowOrb position={[0, 0, 0]} color={c.primary} scale={0.8} speed={0.8} />
      <GlowOrb position={[2, 1, -1]} color={c.secondary} scale={0.4} speed={1.2} />
      <GlowOrb position={[-1.5, -0.5, 0.5]} color={c.accent} scale={0.3} speed={1} />
      <HolographicRing radius={1.8} color={c.primary} />
      <HolographicRing radius={2.5} color={c.accent} />
    </>
  );
}

function LoadingFallback3D() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-teal-400/30 border-t-teal-400 animate-spin" />
    </div>
  );
}

export function DashboardHero3D({ variant = 'admin', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Suspense fallback={<LoadingFallback3D />}>
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50 }}
          style={{ background: 'transparent' }}
          gl={{ alpha: true, antialias: true }}
        >
          <DashboardScene variant={variant} />
        </Canvas>
      </Suspense>
    </div>
  );
}

export function FloatingIcon3D({ icon = 'shield', color = '#4fdbc8', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Suspense fallback={<LoadingFallback3D />}>
        <Canvas
          camera={{ position: [0, 0, 3], fov: 50 }}
          style={{ background: 'transparent' }}
          gl={{ alpha: true, antialias: true }}
        >
          <ambientLight intensity={0.5} />
          <pointLight position={[3, 3, 3]} intensity={0.8} color={color} />
          <Float speed={2} rotationIntensity={0.5} floatIntensity={0.8}>
            <Sphere args={[0.6, 32, 32]}>
              <MeshDistortMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.3}
                roughness={0.2}
                metalness={0.9}
                distort={0.2}
                speed={3}
              />
            </Sphere>
          </Float>
          <ParticleField count={50} color={color} />
        </Canvas>
      </Suspense>
    </div>
  );
}

export default DashboardHero3D;
