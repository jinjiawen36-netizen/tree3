import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Float, Stars, Sparkles, Text } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette, BrightnessContrast } from '@react-three/postprocessing';
import * as THREE from 'three';

const CONFIG = {
  colors: {
    emerald: '#002915',
    gold: '#FFD700',
    brightGold: '#FFFACD',
    ribbon: '#8B0000', // 深红丝带
  },
  counts: { foliage: 12000, ornaments: 80, gifts: 40 }
};

// --- 工具：生成树形坐标 ---
const getTreePos = (yRatio: number, spread = 1) => {
  const y = (yRatio - 0.5) * 10;
  const r = (1 - yRatio) * 3.5 * spread;
  const a = Math.random() * Math.PI * 2;
  return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
};

// --- 1. 氛围雪花层 ---
const Snow = () => (
  <Sparkles count={800} scale={20} size={1.5} speed={0.4} opacity={0.5} color="white" />
);

// --- 2. 树顶大星 ---
const TopStar = ({ mode }: { mode: string }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = mode === 'TREE' ? 5.2 : 15; // 炸裂时飞走
      ref.current.rotation.y += 0.01;
    }
  });
  return (
    <Float speed={5} rotationIntensity={0.5} floatIntensity={0.5}>
      <group ref={ref}>
        <mesh>
          <starGeometry args={[0.5, 0.2, 5]} />
          <meshStandardMaterial color={CONFIG.colors.brightGold} emissive={CONFIG.colors.gold} emissiveIntensity={10} />
        </mesh>
        <pointLight intensity={10} distance={5} color={CONFIG.colors.gold} />
      </group>
    </Float>
  );
};

// --- 3. 混合装饰物系统 (球 + 礼物) ---
const DecorSystem = ({ mode }: { mode: string }) => {
  const ballsRef = useRef<THREE.InstancedMesh>(null);
  const boxesRef = useRef<THREE.InstancedMesh>(null);
  const dummy = new THREE.Object3D();

  const data = useMemo(() => {
    return Array.from({ length: 120 }, (_, i) => ({
      tPos: getTreePos(Math.random()),
      sPos: new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 10 + 5),
      curPos: new THREE.Vector3(0, 0, 0),
      type: i % 3 === 0 ? 'box' : 'ball',
      scale: Math.random() * 0.2 + 0.1
    }));
  }, []);

  useFrame((state, delta) => {
    data.forEach((item, i) => {
      const target = mode === 'SCATTERED' ? item.sPos : item.tPos;
      item.curPos.lerp(target, delta * 2.5);
      dummy.position.copy(item.curPos);
      dummy.rotation.y += 0.01;
      dummy.scale.setScalar(item.scale);
      dummy.updateMatrix();
      if (item.type === 'ball') ballsRef.current?.setMatrixAt(i, dummy.matrix);
      else boxesRef.current?.setMatrixAt(i, dummy.matrix);
    });
    if (ballsRef.current) ballsRef.current.instanceMatrix.needsUpdate = true;
    if (boxesRef.current) boxesRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={ballsRef} args={[undefined, undefined, 120]}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshPhysicalMaterial color={CONFIG.colors.gold} metalness={1} roughness={0.1} envMapIntensity={2} />
      </instancedMesh>
      <instancedMesh ref={boxesRef} args={[undefined, undefined, 120]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial color="#8B0000" metalness={0.5} roughness={0.2} />
      </instancedMesh>
    </group>
  );
};

// --- 主场景 ---
export default function App() {
  const [mode, setMode] = useState<'TREE' | 'SCATTERED'>('TREE');

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas dpr={[1, 2]}>
        <color attach="background" args={['#000502']} />
        <PerspectiveCamera makeDefault position={[0, 2, 12]} />
        
        {/* 光影布置 */}
        <ambientLight intensity={0.2} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={200} color={CONFIG.colors.brightGold} />
        <Environment preset="city" />

        <Snow />
        <TopStar mode={mode} />
        <DecorSystem mode={mode} />
        
        {/* 参考图中的文字感 */}
        <Float speed={2} rotationIntensity={0.2}>
          <Text position={[0, 7, -2]} fontSize={0.8} color={CONFIG.colors.gold} font="https://fonts.gstatic.com/s/playfairdisplay/v30/nuFv7ku5ot7QaAV7K_P_EucE6OT3NDVjwM6KPksV2JeZ.woff">
            MERRY CHRISTMAS
          </Text>
        </Float>

        {/* 核心：后期特效（打造电影感光晕） */}
        <EffectComposer disableNormalPass>
          <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.2} radius={0.4} />
          <Noise opacity={0.05} />
          <Vignette eskil={false} offset={0.1} darkness={0.8} />
          <BrightnessContrast brightness={0.05} contrast={0.1} />
        </EffectComposer>

        <OrbitControls enablePan={false} autoRotate={mode === 'TREE'} autoRotateSpeed={0.5} />
      </Canvas>

      <div style={{ position: 'absolute', bottom: '10%', width: '100%', textAlign: 'center' }}>
        <button 
          onClick={() => setMode(m => m === 'TREE' ? 'SCATTERED' : 'TREE')}
          style={{
            background: 'rgba(0, 41, 21, 0.8)',
            border: `1px solid ${CONFIG.colors.gold}`,
            color: CONFIG.colors.gold,
            padding: '12px 40px',
            fontSize: '14px',
            letterSpacing: '4px',
            cursor: 'pointer',
            borderRadius: '2px',
            backdropFilter: 'blur(10px)'
          }}
        >
          {mode === 'TREE' ? 'SCATTER FRAGMENTS' : 'REASSEMBLE MAGIC'}
        </button>
      </div>
    </div>
  );
}