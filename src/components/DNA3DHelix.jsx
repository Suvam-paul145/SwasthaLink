import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

function DNAHelix() {
  const groupRef = useRef();

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.01;
    }
  });

  const helixPoints = [];
  const numPoints = 50;

  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 4;
    const y = (i / numPoints) * 4 - 2;
    const x = Math.cos(angle) * 0.5;
    const z = Math.sin(angle) * 0.5;
    helixPoints.push({ x, y, z, angle });
  }

  return (
    <group ref={groupRef}>
      {helixPoints.map((point, i) => (
        <group key={i}>
          {/* First strand */}
          <mesh position={[point.x, point.y, point.z]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#4fdbc8" emissive="#4fdbc8" emissiveIntensity={0.5} />
          </mesh>

          {/* Second strand (opposite side) */}
          <mesh position={[-point.x, point.y, -point.z]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#00d9ff" emissive="#00d9ff" emissiveIntensity={0.5} />
          </mesh>

          {/* Connecting line every 3rd point */}
          {i % 3 === 0 && (
            <mesh position={[0, point.y, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
              <meshStandardMaterial color="#ffffff" opacity={0.3} transparent />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

function LoadingFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-950/20 rounded-xl">
      <div className="text-primary animate-pulse">Loading 3D...</div>
    </div>
  );
}

function DNA3DHelix({ className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          camera={{ position: [2, 0, 3], fov: 50 }}
          fallback={<LoadingFallback />}
        >
          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <pointLight position={[-5, -5, -5]} color="#4fdbc8" intensity={0.5} />
          <DNAHelix />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={1}
          />
        </Canvas>
      </Suspense>

      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-primary/30 z-10">
        <span className="text-primary font-bold text-sm uppercase tracking-wider">Genetic Analysis</span>
      </div>
    </div>
  );
}

export default DNA3DHelix;
