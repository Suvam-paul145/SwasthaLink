import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial } from "@react-three/drei";

function HeartMesh() {
  const meshRef = useRef();

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    const beat = 1 + Math.sin(t * 2.5) * 0.08 + Math.sin(t * 5) * 0.03;
    meshRef.current.scale.set(beat, beat * 1.12, beat);
    meshRef.current.rotation.y += 0.004;
  });

  return (
    <Sphere ref={meshRef} args={[1, 32, 32]}>
      <MeshDistortMaterial
        color="#4fdbc8"
        emissive="#0d9488"
        emissiveIntensity={0.35}
        roughness={0.3}
        metalness={0.6}
        distort={0.3}
        speed={2}
        transparent
        opacity={0.5}
      />
    </Sphere>
  );
}

export default function AmbientHeart({ className = "", style = {} }) {
  return (
    <div className={`pointer-events-none select-none ${className}`} style={style}>
      <Canvas camera={{ position: [0, 0, 3.5], fov: 45 }} gl={{ alpha: true, antialias: false }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.3} />
        <pointLight position={[3, 3, 3]} intensity={0.6} color="#4fdbc8" />
        <HeartMesh />
      </Canvas>
    </div>
  );
}
