import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";

function Cell({ position, speed, color, scale }) {
  const ref = useRef();
  const offset = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = position[1] + Math.sin(t * speed + offset) * 0.5;
    ref.current.position.x = position[0] + Math.cos(t * speed * 0.7 + offset) * 0.3;
    ref.current.rotation.x = t * speed * 0.3;
    ref.current.rotation.z = t * speed * 0.2;
  });

  return (
    <mesh ref={ref} position={position} scale={scale}>
      <torusGeometry args={[0.28, 0.11, 12, 24]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.25}
        transparent
        opacity={0.45}
        roughness={0.4}
        metalness={0.5}
      />
    </mesh>
  );
}

function CellField() {
  const cells = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        position: [(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 2],
        speed: Math.random() * 0.4 + 0.15,
        color: i % 3 === 0 ? "#ef4444" : i % 3 === 1 ? "#f87171" : "#fca5a5",
        scale: Math.random() * 0.35 + 0.55,
      })),
    []
  );

  return cells.map((cell, i) => <Cell key={i} {...cell} />);
}

export default function AmbientCells({ className = "", style = {} }) {
  return (
    <div className={`pointer-events-none select-none ${className}`} style={style}>
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} gl={{ alpha: true, antialias: false }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.35} />
        <pointLight position={[3, 3, 3]} intensity={0.4} color="#ef4444" />
        <CellField />
      </Canvas>
    </div>
  );
}
