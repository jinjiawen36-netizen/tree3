import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Float, Sparkles, Text, Stars } from '@react-three/drei';
import * as THREE from 'three';

const CONFIG = {
  colors: {
    emerald: '#002915',
    gold: '#FFD700',
    brightGold: '#FFFACD',
    red: '#B22222',
  }
};

// --- 树顶星 (使用圆柱体模拟五角星，更稳定) ---
const TopStar = ({ mode }: { mode: string }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = mode === 'TREE' ? 5.5 : 20;
      ref.current.rotation.y += 0.02;
    }
  });
  return (
    <group ref={ref}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial 
          color={CONFIG.colors.brightGold} 
          emissive={CONFIG.colors.gold} 
          emissiveIntensity={2} 
        />
      </mesh>
      <pointLight intensity={20} distance={10} color={CONFIG.colors.gold} />
    </group>
  );
};

// --- 装饰物系统 (球 + 礼物盒) ---
const Decoration = ({ mode }: { mode: string }) => {
  const ballsRef = useRef<THREE.InstancedMesh>(null);
  const boxesRef = useRef<THREE.InstancedMesh>(null);
  const dummy = new THREE.Object3D();

  const data = useMemo(() => {
    return Array.from({ length: 100 }, (_, i) => {
      const yRatio = Math.random();
      const a = Math.random() * Math.PI * 2;
      const r = (1 - yRatio) * 3.5;
      return {
        tPos: new THREE.Vector3(Math.cos(a) * r, (yRatio - 0.5) * 10, Math.sin(a) * r),
        sPos: new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 10 + 5),
        curPos: new THREE.Vector3().randomDirection().multiplyScalar(20),
        type: i % 3 === 0 ? 'box' : 'ball',
        scale: Math.random() * 0.15 + 0.1
      };
    });
  }, []);

  useFrame((state, delta) => {
    data.forEach((item, i) => {
      const target = mode === 'SCATTERED' ? item.sPos : item.tPos;
      item.curPos.lerp(target, delta * 2);
      dummy.position.copy(item.curPos);
      dummy.scale.setScalar(item.scale);
      dummy.rotation.x += 0.01;
      dummy.updateMatrix();
      if (item.type === 'ball') ballsRef.current?.setMatrixAt(i, dummy.matrix);
      else boxesRef.current?.setMatrixAt(i, dummy.matrix);
    });
    if (ballsRef.current) ballsRef.current.instanceMatrix.needsUpdate = true;
    if (boxesRef.current) boxesRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={ballsRef} args={[undefined, undefined, 100]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial metalness={1} roughness={0.1} color={CONFIG.colors.gold} />
      </instancedMesh>
      <instancedMesh ref={boxesRef} args={[undefined, undefined, 100]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={CONFIG.colors.red} metalness={0.5} roughness={0.5} />
      </instancedMesh>
    </group>
  );
};

export default function App() {
  const [mode, setMode] = useState<'TREE' | 'SCATTERED'>('TREE');

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'radial-gradient(circle, #001a0a 0%, #000000 100%)' }}>
      <Canvas camera={{ position: [0, 2, 15], fov: 45 }}>
        {/* 增加雾气，让背景深邃，不会一片死黑 */}
        <fog attach="fog" args={['#000', 10, 25]} />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <Environment preset="city" />

        <Stars count={2000} factor={4} fade />
        <Sparkles count={400} scale={15} size={2} speed={0.5} color="gold" />

        <TopStar mode={mode} />
        <Decoration mode={mode} />

        <Text position={[0, 7, -2]} fontSize={1} color="gold" font="https://fonts.gstatic.com/s/playfairdisplay/v30/nuFv7ku5ot7QaAV7K_P_EucE6OT3NDVjwM6KPksV2JeZ.woff">
          MERRY CHRISTMAS
        </Text>

        <OrbitControls enablePan={false} minDistance={5} maxDistance={25} />
      </Canvas>

      <div style={{ position: 'absolute', bottom: '10%', width: '100%', textAlign: 'center' }}>
        <button 
          onClick={() => setMode(m => m === 'TREE' ? 'SCATTERED' : 'TREE')}
          style={{
            background: 'rgba(212, 175, 55, 0.2)',
            border: '1px solid #D4AF37',
            color: '#D4AF37',
            padding: '12px 40px',
            fontSize: '14px',
            letterSpacing: '2px',
            cursor: 'pointer',
            borderRadius: '40px',
            backdropFilter: 'blur(5px)',
            boxShadow: '0 0 20px rgba(212, 175, 55, 0.2)'
          }}
        >
          {mode === 'TREE' ? 'SCATTER FRAGMENTS' : 'REASSEMBLE MAGIC'}
        </button>
      </div>
    </div>
  );
}