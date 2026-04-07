import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense } from 'react';
import * as THREE from 'three';
import { COLORS } from '../utils/three-config';

function ShieldShape() {
  const ref = useRef();

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = Math.sin(t * 0.4) * 0.2;
    ref.current.position.y = Math.sin(t * 0.6) * 0.08;
  });

  // Shield outline via extruded shape
  const shape = new THREE.Shape();
  shape.moveTo(0, 1.1);
  shape.quadraticCurveTo(0.9, 0.9, 1, 0.4);
  shape.quadraticCurveTo(1, -0.2, 0.7, -0.6);
  shape.quadraticCurveTo(0.35, -1.1, 0, -1.3);
  shape.quadraticCurveTo(-0.35, -1.1, -0.7, -0.6);
  shape.quadraticCurveTo(-1, -0.2, -1, 0.4);
  shape.quadraticCurveTo(-0.9, 0.9, 0, 1.1);

  const extrudeSettings = { depth: 0.15, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 4 };

  return (
    <group ref={ref}>
      {/* Shield body */}
      <mesh>
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <meshStandardMaterial
          color={COLORS.primary}
          metalness={0.7}
          roughness={0.25}
          emissive={COLORS.primary}
          emissiveIntensity={0.12}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Cross / plus symbol */}
      <mesh position={[0, 0, 0.12]}>
        <boxGeometry args={[0.12, 0.7, 0.06]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, 0, 0.12]}>
        <boxGeometry args={[0.5, 0.12, 0.06]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.2} />
      </mesh>

      {/* Glow ring around shield */}
      <mesh position={[0, -0.1, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[1.25, 0.015, 8, 64]} />
        <meshStandardMaterial
          color={COLORS.primary}
          emissive={COLORS.primary}
          emissiveIntensity={0.5}
          transparent
          opacity={0.25}
        />
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

export default function CareShield3D({ label = 'Protected', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas camera={{ position: [0, 0, 4], fov: 45 }} fallback={<LoadingFallback />}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <pointLight position={[-5, -3, 3]} color={COLORS.primary} intensity={0.5} />
          <pointLight position={[3, 5, -3]} color={COLORS.secondary} intensity={0.3} />
          <ShieldShape />
        </Canvas>
      </Suspense>
      {label && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-4 py-1.5 rounded-lg border border-primary/30 z-10">
          <span className="text-primary font-semibold text-sm flex items-center gap-1.5">
            <span className="material-symbols-outlined text-xs">verified_user</span>
            {label}
          </span>
        </div>
      )}
    </div>
  );
}
