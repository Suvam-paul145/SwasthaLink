import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial } from '@react-three/drei';

function AnimatedHeart() {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      meshRef.current.scale.setScalar(1 + Math.sin(time * 2) * 0.1);
      meshRef.current.rotation.y += 0.005;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]} position={[0, 0, 0]}>
      <MeshDistortMaterial
        color="#4fdbc8"
        attach="material"
        distort={0.3}
        speed={2}
        roughness={0.4}
        metalness={0.8}
      />
    </Sphere>
  );
}

function LoadingFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-950/20 rounded-xl">
      <div className="text-primary animate-pulse">Loading 3D...</div>
    </div>
  );
}

function MedicalHeart3D({ bpm = 72, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          camera={{ position: [0, 0, 3.5], fov: 50 }}
          fallback={<LoadingFallback />}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[-10, -10, -5]} color="#4fdbc8" intensity={0.5} />
          <AnimatedHeart />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.5}
          />
        </Canvas>
      </Suspense>

      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-primary/30 z-10">
        <span className="text-primary font-bold text-2xl">{bpm}</span>
        <span className="text-slate-400 text-sm ml-2">BPM</span>
      </div>
    </div>
  );
}

export default MedicalHeart3D;
