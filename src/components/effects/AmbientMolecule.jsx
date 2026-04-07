import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";

function MoleculeStructure() {
  const groupRef = useRef();

  const atoms = useMemo(() => [
    { pos: [0, 0, 0], color: "#4fdbc8", size: 0.18 },
    { pos: [1, 0.5, 0], color: "#818cf8", size: 0.13 },
    { pos: [-0.8, 0.7, 0.3], color: "#f472b6", size: 0.13 },
    { pos: [0.3, -1, 0.5], color: "#818cf8", size: 0.13 },
    { pos: [-0.5, -0.5, -0.8], color: "#4fdbc8", size: 0.1 },
    { pos: [1.2, -0.3, -0.5], color: "#f472b6", size: 0.1 },
    { pos: [-1.1, -0.2, -0.3], color: "#818cf8", size: 0.1 },
  ], []);

  const bonds = useMemo(() => [
    [0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [2, 6],
  ], []);

  const bondLines = useMemo(() => {
    const arr = new Float32Array(bonds.length * 6);
    bonds.forEach((bond, i) => {
      const a = atoms[bond[0]].pos;
      const b = atoms[bond[1]].pos;
      arr[i * 6] = a[0]; arr[i * 6 + 1] = a[1]; arr[i * 6 + 2] = a[2];
      arr[i * 6 + 3] = b[0]; arr[i * 6 + 4] = b[1]; arr[i * 6 + 5] = b[2];
    });
    return arr;
  }, [atoms, bonds]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.2;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      {atoms.map((atom, i) => (
        <mesh key={i} position={atom.pos}>
          <sphereGeometry args={[atom.size, 12, 12]} />
          <meshStandardMaterial
            color={atom.color}
            emissive={atom.color}
            emissiveIntensity={0.35}
            transparent
            opacity={0.55}
          />
        </mesh>
      ))}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={bonds.length * 2}
            array={bondLines}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#4fdbc8" transparent opacity={0.25} />
      </lineSegments>
    </group>
  );
}

export default function AmbientMolecule({ className = "", style = {} }) {
  return (
    <div className={`pointer-events-none select-none ${className}`} style={style}>
      <Canvas camera={{ position: [0, 0, 3.5], fov: 45 }} gl={{ alpha: true, antialias: false }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.3} />
        <pointLight position={[2, 2, 3]} intensity={0.4} color="#818cf8" />
        <MoleculeStructure />
      </Canvas>
    </div>
  );
}
