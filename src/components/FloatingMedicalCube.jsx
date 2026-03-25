import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, RoundedBox } from '@react-three/drei';

function FloatingCube() {
  const cubeRef = useRef();

  useFrame((state) => {
    if (cubeRef.current) {
      const time = state.clock.getElapsedTime();
      cubeRef.current.position.y = Math.sin(time) * 0.2;
      cubeRef.current.rotation.x = Math.sin(time * 0.5) * 0.1;
      cubeRef.current.rotation.z = Math.cos(time * 0.3) * 0.1;
    }
  });

  return (
    <group ref={cubeRef}>
      <RoundedBox args={[1.5, 1.5, 1.5]} radius={0.1} smoothness={4}>
        <meshStandardMaterial
          color="#4fdbc8"
          metalness={0.8}
          roughness={0.2}
          emissive="#4fdbc8"
          emissiveIntensity={0.2}
        />
      </RoundedBox>

      {/* Data visualization on cube faces */}
      <mesh position={[0, 0, 0.76]}>
        <planeGeometry args={[1.2, 1.2]} />
        <meshBasicMaterial color="#0a0e1a" opacity={0.8} transparent />
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

function FloatingMedicalCube({ value = "99.2%", label = "Accuracy", className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          camera={{ position: [0, 0, 4], fov: 50 }}
          fallback={<LoadingFallback />}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <pointLight position={[-5, -5, -5]} color="#4fdbc8" intensity={0.5} />
          <spotLight position={[0, 5, 0]} angle={0.3} penumbra={1} intensity={1} />

          <FloatingCube />

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={2}
          />
        </Canvas>
      </Suspense>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="text-center">
          <div className="text-4xl font-bold text-white">{value}</div>
          <div className="text-sm text-primary uppercase tracking-wider mt-1">{label}</div>
        </div>
      </div>
    </div>
  );
}

export default FloatingMedicalCube;
