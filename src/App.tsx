import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float, Stars, Sparkles, Text, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// --- 艺术指导配置 ---
const THEME = {
  emerald: '#002915', // 深祖母绿
  gold: '#FFD700',    // 金属金
  brightGold: '#FFFACD',
  accentRed: '#8B0000',
  fogColor: '#000502'
};

// --- 物理计算逻辑 ---
const getTreePoint = (yRatio: number) => {
  const y = (yRatio - 0.5) * 10;
  const radius = (1 - yRatio) * 3.8; 
  const angle = Math.random() * Math.PI * 2;
  return new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
};

// --- 1. 针叶粒子层 (Foliage Layer) ---
const Foliage = ({ mode }: { mode: 'TREE' | 'SCATTER' }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 12000;

  const [positions, scatterPos] = useMemo(() => {
    const p = [], s = [];
    for (let i = 0; i < count; i++) {
      const tp = getTreePoint(Math.random());
      const sp = new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 15 + 5);
      p.push(tp.x, tp.y, tp.z);
      s.push(sp.x, sp.y, sp.z);
    }
    return [new Float32Array(p), new Float32Array(s)];
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const mat = pointsRef.current.material as THREE.ShaderMaterial;
    const target = mode === 'SCATTER' ? 1 : 0;
    // 增加平滑的弹性过渡
    mat.uniforms.uProgress.value = THREE.MathUtils.lerp(mat.uniforms.uProgress.value, target, delta * 1.5);
    mat.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aScatter" count={count} array={scatterPos} itemSize={3} />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{ uProgress: { value: 0 }, uTime: { value: 0 } }}
        vertexShader={`
          attribute vec3 aScatter;
          uniform float uProgress;
          uniform float uTime;
          void main() {
            vec3 pos = mix(position, aScatter, uProgress);
            // 呼吸感微动
            pos.x += sin(uTime + position.y) * 0.05 * (1.0 - uProgress);
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = (4.0 + sin(uTime + position.x) * 2.0) * (15.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          void main() {
            float d = distance(gl_PointCoord, vec2(0.5));
            if (d > 0.5) discard;
            // 祖母绿边缘带一点金
            vec3 color = mix(vec3(0.0, 0.4, 0.2), vec3(1.0, 0.8, 0.3), 0.2);
            gl_FragColor = vec4(color, (1.0 - d * 2.0) * 0.8);
          }
        `}
      />
    </points>
  );
};

// --- 2. 装饰物系统 (Ornament System) ---
const Decoration = ({ mode }: { mode: 'TREE' | 'SCATTER' }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = new THREE.Object3D();
  const count = 120;

  const items = useMemo(() => Array.from({ length: count }, () => ({
    tPos: getTreePoint(Math.random()),
    sPos: new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 12 + 6),
    curPos: new THREE.Vector3(0, -10, 0),
    type: Math.random() > 0.7 ? 'box' : 'ball',
    scale: Math.random() * 0.2 + 0.1,
    rotSpeed: (Math.random() - 0.5) * 2
  })), []);

  useFrame((state, delta) => {
    items.forEach((item, i) => {
      const target = mode === 'SCATTER' ? item.sPos : item.tPos;
      // 模拟物理阻尼感
      item.curPos.lerp(target, delta * 2.5);
      dummy.position.copy(item.curPos);
      dummy.scale.setScalar(item.scale);
      dummy.rotation.y += item.rotSpeed * delta;
      dummy.updateMatrix();
      meshRef.current?.setMatrixAt(i, dummy.matrix);
    });
    if (meshRef.current) meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshPhysicalMaterial 
        color={THEME.gold} 
        metalness={1} 
        roughness={0.1} 
        reflectivity={1}
        clearcoat={1}
        emissive={THEME.gold}
        emissiveIntensity={0.2}
      />
    </instancedMesh>
  );
};

// --- 3. 树顶大星与氛围 ---
const HeroElements = ({ mode }: { mode: string }) => {
  return (
    <>
      <Float speed={4} rotationIntensity={1} floatIntensity={1}>
        <mesh position={[0, mode === 'TREE' ? 5.5 : 25, 0]}>
          <octahedronGeometry args={[0.6, 0]} />
          <meshStandardMaterial color={THEME.brightGold} emissive={THEME.gold} emissiveIntensity={10} />
          <pointLight intensity={20} color={THEME.gold} distance={15} />
        </mesh>
      </Float>
      
      <Sparkles count={400} scale={15} size={3} speed={0.4} color={THEME.gold} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
    </>
  );
};

// --- 主场景组件 ---
export default function App() {
  const [mode, setMode] = useState<'TREE' | 'SCATTER'>('TREE');

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'radial-gradient(circle at center, #001a0a 0%, #000 100%)' }}>
      <Canvas shadows gl={{ antialias: true, alpha: false }}>
        <PerspectiveCamera makeDefault position={[0, 2, 18]} fov={40} />
        <fog attach="fog" args={[THEME.fogColor, 10, 30]} />
        
        <ambientLight intensity={0.4} />
        <spotLight position={[10, 20, 10]} angle={0.15} penumbra={1} intensity={150} color={THEME.brightGold} castShadow />
        <Environment preset="city" />

        <Foliage mode={mode} />
        <Decoration mode={mode} />
        <HeroElements mode={mode} />

        <Text 
          position={[0, 8, -5]} 
          fontSize={1.2} 
          color={THEME.gold} 
          material-toneMapped={false}
          font="https://fonts.gstatic.com/s/playfairdisplay/v30/nuFv7ku5ot7QaAV7K_P_EucE6OT3NDVjwM6KPksV2JeZ.woff"
        >
          ARIX SIGNATURE
        </Text>

        <OrbitControls enablePan={false} minDistance={10} maxDistance={25} autoRotate={mode === 'TREE'} autoRotateSpeed={0.5} />
      </Canvas>

      {/* 交互按钮 */}
      <div style={{ position: 'absolute', bottom: '8%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <button 
          onClick={() => setMode(m => m === 'TREE' ? 'SCATTER' : 'TREE')}
          style={{
            background: 'linear-gradient(135deg, rgba(212,175,55,0.3) 0%, rgba(0,41,21,0.8) 100%)',
            border: `1px solid ${THEME.gold}`,
            color: THEME.gold,
            padding: '14px 45px',
            fontSize: '13px',
            letterSpacing: '5px',
            cursor: 'pointer',
            borderRadius: '50px',
            backdropFilter: 'blur(15px)',
            transition: 'all 0.3s ease',
            boxShadow: '0 0 30px rgba(0,0,0,0.5), inset 0 0 10px rgba(255,215,0,0.2)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {mode === 'TREE' ? 'EXPLODE FRAGMENTS' : 'REASSEMBLE MAGIC'}
        </button>
        <div style={{ color: THEME.gold, fontSize: '10px', letterSpacing: '2px', opacity: 0.6 }}>EST. 2025 INTERACTIVE EXPERIENCE</div>
      </div>
    </div>
  );
}