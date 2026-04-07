import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";

function BreathingLungs() {
  const leftRef = useRef();
  const rightRef = useRef();
  const tracheaRef = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const breath = 1 + Math.sin(t * 0.8) * 0.12;
    if (leftRef.current) {
      leftRef.current.scale.set(breath * 0.8, breath, breath * 0.6);
    }
    if (rightRef.current) {
      rightRef.current.scale.set(breath * 0.85, breath * 1.02, breath * 0.6);
    }
    if (tracheaRef.current) {
      tracheaRef.current.rotation.y = Math.sin(t * 0.3) * 0.05;
    }
  });

  return (
    <group ref={tracheaRef}>
      {/* Left lung — wireframe sphere */}
      <mesh ref={leftRef} position={[-0.55, -0.1, 0]}>
        <sphereGeometry args={[0.65, 24, 24]} />
        <meshStandardMaterial
          color="#4fdbc8"
          emissive="#0d9488"
          emissiveIntensity={0.25}
          transparent
          opacity={0.35}
          wireframe
        />
      </mesh>
      {/* Right lung */}
      <mesh ref={rightRef} position={[0.55, -0.1, 0]}>
        <sphereGeometry args={[0.65, 24, 24]} />
        <meshStandardMaterial
          color="#818cf8"
          emissive="#6366f1"
          emissiveIntensity={0.25}
          transparent
          opacity={0.35}
          wireframe
        />
      </mesh>
      {/* Trachea — central cylinder */}
      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.7, 8]} />
        <meshStandardMaterial color="#4fdbc8" transparent opacity={0.25} />
      </mesh>
      {/* Bronchi — two short angled cylinders */}
      <mesh position={[-0.2, 0.35, 0]} rotation={[0, 0, 0.5]}>
        <cylinderGeometry args={[0.04, 0.04, 0.4, 6]} />
        <meshStandardMaterial color="#4fdbc8" transparent opacity={0.2} />
      </mesh>
      <mesh position={[0.2, 0.35, 0]} rotation={[0, 0, -0.5]}>
        <cylinderGeometry args={[0.04, 0.04, 0.4, 6]} />
        <meshStandardMaterial color="#818cf8" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

export default function AmbientLungs({ className = "", style = {} }) {
  return (
    <div className={`pointer-events-none select-none ${className}`} style={style}>
      <Canvas camera={{ position: [0, 0, 3], fov: 45 }} gl={{ alpha: true, antialias: false }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.3} />
        <pointLight position={[2, 2, 3]} intensity={0.4} color="#4fdbc8" />
        <BreathingLungs />
      </Canvas>
    </div>
  );
}
