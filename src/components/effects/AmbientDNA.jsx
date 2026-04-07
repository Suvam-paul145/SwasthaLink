import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";

const PAIRS = 24;
const RADIUS = 0.45;
const HEIGHT = 5;

function DNAHelix() {
  const groupRef = useRef();

  const nodes = useMemo(() => {
    const result = [];
    for (let i = 0; i < PAIRS; i++) {
      const t = i / PAIRS;
      const y = (t - 0.5) * HEIGHT;
      const angle = t * Math.PI * 4;
      result.push({
        a: [Math.cos(angle) * RADIUS, y, Math.sin(angle) * RADIUS],
        b: [Math.cos(angle + Math.PI) * RADIUS, y, Math.sin(angle + Math.PI) * RADIUS],
      });
    }
    return result;
  }, []);

  const connectorPositions = useMemo(() => {
    const verts = [];
    for (let i = 0; i < PAIRS; i += 3) {
      verts.push(...nodes[i].a, ...nodes[i].b);
    }
    return new Float32Array(verts);
  }, [nodes]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.25;
    }
  });

  return (
    <group ref={groupRef}>
      {nodes.map((pair, i) => (
        <group key={i}>
          <mesh position={pair.a}>
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshStandardMaterial color="#4fdbc8" emissive="#4fdbc8" emissiveIntensity={0.5} transparent opacity={0.65} />
          </mesh>
          <mesh position={pair.b}>
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshStandardMaterial color="#818cf8" emissive="#818cf8" emissiveIntensity={0.5} transparent opacity={0.65} />
          </mesh>
        </group>
      ))}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={connectorPositions.length / 3}
            array={connectorPositions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#4fdbc8" transparent opacity={0.18} />
      </lineSegments>
    </group>
  );
}

export default function AmbientDNA({ className = "", style = {} }) {
  return (
    <div className={`pointer-events-none select-none ${className}`} style={style}>
      <Canvas camera={{ position: [0, 0, 4], fov: 45 }} gl={{ alpha: true, antialias: false }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.3} />
        <pointLight position={[2, 2, 3]} intensity={0.5} color="#4fdbc8" />
        <DNAHelix />
      </Canvas>
    </div>
  );
}
