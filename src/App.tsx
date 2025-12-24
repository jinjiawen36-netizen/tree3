import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float, Sparkles, Stars, Text } from '@react-three/drei';
import * as THREE from 'three';

// --- 核心：确保物体在视野内 ---
const TreeContent = ({ mode }: { mode: 'TREE' | 'SCATTER' }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const starRef = useRef<THREE.Mesh>(null);

  const [positions, scatterPos] = useMemo(() => {
    const p = [], s = [];
    for (let i = 0; i < 15000; i++) {
      // 生成圣诞树形状的坐标
      const yRatio = Math.random();
      const y = (yRatio - 0.5) * 10;
      const r = (1 - yRatio) * 3.5;
      const a = Math.random() * Math.PI * 2;
      p.push(Math.cos(a) * r, y, Math.sin(a) * r);
      // 生成炸裂后的随机坐标
      const sVec = new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 12 + 5);
      s.push(sVec.x, sVec.y, sVec.z);
    }
    return [new Float32Array(p), new Float32Array(s)];
  }, []);

  useFrame((state, delta) => {
    if (pointsRef.current) {
      const mat = pointsRef.current.material as THREE.ShaderMaterial;
      const target = mode === 'SCATTER' ? 1 : 0;
      mat.uniforms.uProgress.value = THREE.MathUtils.lerp(mat.uniforms.uProgress.value, target, delta * 2);
    }
    if (starRef.current) {
      starRef.current.rotation.y += 0.02;
      starRef.current.position.y = mode === 'TREE' ? 5.5 : 20;
    }
  });

  return (
    <group>
      {/* 树顶黄金星 */}
      <mesh ref={starRef} position={[0, 5.5, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={5} />
        <pointLight intensity={30} color="#FFD700" />
      </mesh>

      {/* 15000个发光粒子组成树体 */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-aScatter" count={scatterPos.length / 3} array={scatterPos} itemSize={3} />
        </bufferGeometry>
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{ uProgress: { value: 0 } }}
          vertexShader={`
            attribute vec3 aScatter;
            uniform float uProgress;
            void main() {
              vec3 pos = mix(position, aScatter, uProgress);
              vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
              gl_PointSize = 4.0 * (15.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
            }
          `}
          fragmentShader={`
            void main() {
              float d = distance(gl_PointCoord, vec2(0.5));
              if (d > 0.5) discard;
              gl_FragColor = vec4(0.1, 0.8, 0.4, 1.0 - d * 2.0);
            }
          `}
        />
      </points>
    </group>
  );
};

export default function App() {
  const [mode, setMode] = useState<'TREE' | 'SCATTER'>('TREE');

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000805' }}>
      <Canvas>
        {/* 强行设置相机位置，确保能看到中心点 */}
        <PerspectiveCamera makeDefault position={[0, 2, 18]} fov={45} />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={2} color="#FFD700" />
        
        {/* 背景氛围：星星和闪烁点 */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Sparkles count={300} scale={15} size={2} speed={0.5} color="#FFD700" />

        <TreeContent mode={mode} />

        <Text position={[0, 8, -5]} fontSize={1.2} color="#FFD700" font="https://fonts.gstatic.com/s/playfairdisplay/v30/nuFv7ku5ot7QaAV7K_P_EucE6OT3NDVjwM6KPksV2JeZ.woff">
          MERRY CHRISTMAS
        </Text>

        <OrbitControls enablePan={false} />
      </Canvas>

      {/* 按钮样式优化：对齐参考图 */}
      <div style={{ position: 'absolute', bottom: '10%', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <button 
          onClick={() => setMode(m => m === 'TREE' ? 'SCATTER' : 'TREE')}
          style={{
            background: 'rgba(212, 175, 55, 0.1)',
            border: '1px solid #D4AF37',
            color: '#D4AF37',
            padding: '12px 40px',
            fontSize: '14px',
            borderRadius: '40px',
            cursor: 'pointer',
            letterSpacing: '2px',
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