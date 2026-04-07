import { useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PARTICLE_COUNT = 80;
const CONNECTION_DISTANCE = 2.0;

function NeuralParticles() {
  const meshRef = useRef();
  const linesRef = useRef();
  const mouseRef = useRef({ x: 0, y: 0 });

  const positions = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return pos;
  }, []);

  const velocities = useMemo(() => {
    const vel = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      vel[i * 3] = (Math.random() - 0.5) * 0.008;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.008;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.004;
    }
    return vel;
  }, []);

  const sizes = useMemo(() => {
    const s = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      s[i] = Math.random() * 0.06 + 0.02;
    }
    return s;
  }, []);

  const linePositions = useMemo(() => new Float32Array(PARTICLE_COUNT * PARTICLE_COUNT * 6), []);
  const lineColors = useMemo(() => new Float32Array(PARTICLE_COUNT * PARTICLE_COUNT * 6), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const posAttr = meshRef.current.geometry.attributes.position;
    const arr = posAttr.array;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2;
      arr[ix] += velocities[ix] + Math.sin(t * 0.3 + i) * 0.001;
      arr[iy] += velocities[iy] + Math.cos(t * 0.2 + i) * 0.001;
      arr[iz] += velocities[iz];

      if (arr[ix] > 8 || arr[ix] < -8) velocities[ix] *= -1;
      if (arr[iy] > 6 || arr[iy] < -6) velocities[iy] *= -1;
      if (arr[iz] > 4 || arr[iz] < -4) velocities[iz] *= -1;
    }
    posAttr.needsUpdate = true;

    if (linesRef.current) {
      let lineIdx = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        for (let j = i + 1; j < PARTICLE_COUNT; j++) {
          const dx = arr[i * 3] - arr[j * 3];
          const dy = arr[i * 3 + 1] - arr[j * 3 + 1];
          const dz = arr[i * 3 + 2] - arr[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < CONNECTION_DISTANCE) {
            const alpha = 1 - dist / CONNECTION_DISTANCE;
            linePositions[lineIdx * 6] = arr[i * 3];
            linePositions[lineIdx * 6 + 1] = arr[i * 3 + 1];
            linePositions[lineIdx * 6 + 2] = arr[i * 3 + 2];
            linePositions[lineIdx * 6 + 3] = arr[j * 3];
            linePositions[lineIdx * 6 + 4] = arr[j * 3 + 1];
            linePositions[lineIdx * 6 + 5] = arr[j * 3 + 2];

            const c = alpha * 0.12;
            lineColors[lineIdx * 6] = 0.18 * c;
            lineColors[lineIdx * 6 + 1] = 0.83 * c;
            lineColors[lineIdx * 6 + 2] = 0.75 * c;
            lineColors[lineIdx * 6 + 3] = 0.13 * c;
            lineColors[lineIdx * 6 + 4] = 0.83 * c;
            lineColors[lineIdx * 6 + 5] = 0.93 * c;
            lineIdx++;
          }
        }
      }

      const lineGeom = linesRef.current.geometry;
      lineGeom.setDrawRange(0, lineIdx * 2);
      lineGeom.attributes.position.needsUpdate = true;
      lineGeom.attributes.color.needsUpdate = true;
    }
  });

  return (
    <>
      <points ref={meshRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={PARTICLE_COUNT} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-size" count={PARTICLE_COUNT} array={sizes} itemSize={1} />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          color="#4fdbc8"
          transparent
          opacity={0.25}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={PARTICLE_COUNT * PARTICLE_COUNT * 2}
            array={linePositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={PARTICLE_COUNT * PARTICLE_COUNT * 2}
            array={lineColors}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
    </>
  );
}

function FloatingGrid() {
  const gridRef = useRef();
  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.05 + 0.3;
      gridRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.08) * 0.03;
    }
  });

  return (
    <group ref={gridRef} position={[0, -3, -4]}>
      <gridHelper args={[30, 30, "#0d948818", "#0d948808"]} />
    </group>
  );
}

function GlowOrbs() {
  const orbsRef = useRef([]);
  const orbData = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        position: [(Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4 - 2],
        scale: Math.random() * 0.12 + 0.06,
        speed: Math.random() * 0.3 + 0.1,
        offset: Math.random() * Math.PI * 2,
        color: i % 2 === 0 ? "#4fdbc8" : "#818cf8",
      })),
    []
  );

  useFrame((state) => {
    orbsRef.current.forEach((orb, i) => {
      if (!orb) return;
      const d = orbData[i];
      const t = state.clock.elapsedTime;
      orb.position.y = d.position[1] + Math.sin(t * d.speed + d.offset) * 1.2;
      orb.position.x = d.position[0] + Math.cos(t * d.speed * 0.7 + d.offset) * 0.6;
    });
  });

  return (
    <>
      {orbData.map((d, i) => (
        <mesh key={i} ref={(el) => (orbsRef.current[i] = el)} position={d.position}>
          <sphereGeometry args={[d.scale, 16, 16]} />
          <meshBasicMaterial color={d.color} transparent opacity={0.15} />
        </mesh>
      ))}
    </>
  );
}

export default function NeuralBackground({ className = "" }) {
  return (
    <div className={`fixed inset-0 z-0 pointer-events-none ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60, near: 0.1, far: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.3} />
        <NeuralParticles />
        <FloatingGrid />
        <GlowOrbs />
      </Canvas>
    </div>
  );
}
