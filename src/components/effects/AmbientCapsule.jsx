import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

function Pill({ position, speed, color, scale }) {
  const ref = useRef();
  const offset = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = position[1] + Math.sin(t * speed + offset) * 0.4;
    ref.current.position.x = position[0] + Math.cos(t * speed * 0.5 + offset) * 0.2;
    ref.current.rotation.z = Math.sin(t * speed * 0.3 + offset) * 0.3 + 0.5;
    ref.current.rotation.x = t * speed * 0.15;
  });

  return (
    <group ref={ref} position={position} scale={scale}>
      {/* Top hemisphere */}
      <mesh position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          transparent
          opacity={0.5}
          roughness={0.35}
          metalness={0.5}
        />
      </mesh>
      {/* Body */}
      <mesh>
        <cylinderGeometry args={[0.2, 0.2, 0.36, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          transparent
          opacity={0.5}
          roughness={0.35}
          metalness={0.5}
        />
      </mesh>
      {/* Bottom hemisphere */}
      <mesh position={[0, -0.18, 0]}>
        <sphereGeometry args={[0.2, 16, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.05}
          transparent
          opacity={0.4}
          roughness={0.35}
          metalness={0.3}
        />
      </mesh>
    </group>
  );
}

function PillField() {
  const pills = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        position: [(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2],
        speed: Math.random() * 0.3 + 0.15,
        color: i % 3 === 0 ? '#4fdbc8' : i % 3 === 1 ? '#818cf8' : '#22d3ee',
        scale: Math.random() * 0.4 + 0.5,
      })),
    []
  );

  return pills.map((pill, i) => <Pill key={i} {...pill} />);
}

export default function AmbientCapsule({ className = '', style = {} }) {
  return (
    <div className={`pointer-events-none select-none ${className}`} style={style}>
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.4} />
        <pointLight position={[3, 3, 3]} color="#4fdbc8" intensity={0.4} />
        <PillField />
      </Canvas>
    </div>
  );
}
