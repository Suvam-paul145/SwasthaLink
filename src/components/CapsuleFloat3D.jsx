import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { COLORS } from '../utils/three-config';

function Capsule({ color = COLORS.primary, speed = 1 }) {
  const ref = useRef();

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * speed;
    ref.current.position.y = Math.sin(t * 0.8) * 0.25;
    ref.current.rotation.z = Math.sin(t * 0.4) * 0.15 + 0.3;
    ref.current.rotation.x = Math.cos(t * 0.3) * 0.1;
  });

  return (
    <group ref={ref}>
      {/* Capsule body — two halves */}
      <mesh position={[0, 0.35, 0]}>
        <sphereGeometry args={[0.45, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={color}
          metalness={0.6}
          roughness={0.25}
          emissive={color}
          emissiveIntensity={0.15}
        />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 0.7, 32]} />
        <meshStandardMaterial
          color={color}
          metalness={0.6}
          roughness={0.25}
          emissive={color}
          emissiveIntensity={0.15}
        />
      </mesh>
      <mesh position={[0, -0.35, 0]}>
        <sphereGeometry args={[0.45, 32, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial
          color="#ffffff"
          metalness={0.4}
          roughness={0.3}
          emissive="#ffffff"
          emissiveIntensity={0.05}
        />
      </mesh>
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 0.01, 32]} />
        <meshStandardMaterial color="#ffffff" metalness={0.4} roughness={0.3} />
      </mesh>

      {/* Separator band */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.46, 0.015, 8, 32]} />
        <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.1} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function LoadingFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-primary animate-pulse">Loading 3D...</div>
    </div>
  );
}

export default function CapsuleFloat3D({ color, speed = 1, label = 'Medication', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas camera={{ position: [0, 0, 3.5], fov: 45 }} fallback={<LoadingFallback />}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <pointLight position={[-5, -5, -3]} color={COLORS.primary} intensity={0.4} />
          <Capsule color={color} speed={speed} />
        </Canvas>
      </Suspense>
      {label && (
        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-primary/30 z-10">
          <span className="text-primary font-semibold text-sm">{label}</span>
        </div>
      )}
    </div>
  );
}
