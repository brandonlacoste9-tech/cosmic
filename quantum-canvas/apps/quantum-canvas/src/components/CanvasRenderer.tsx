import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, ContactShadows } from '@react-three/drei';
import { useWorldContext } from '../context/WorldContext';

const SceneObject = ({ data }) => {
    const meshRef = useRef();

    return (
        <mesh
            ref={meshRef}
            position={[data.transform.position.x, data.transform.position.y, data.transform.position.z]}
            scale={[data.transform.scale.x, data.transform.scale.y, data.transform.scale.z]}
        >
            {data.geometry === 'box' && <boxGeometry />}
            {data.geometry === 'sphere' && <sphereGeometry />}
            {data.geometry === 'cylinder' && <cylinderGeometry />}
            {data.geometry === 'plane' && <planeGeometry />}
            <meshStandardMaterial
                color={data.material?.color || '#ffffff'}
                emissive={data.material?.emissive || '#000000'}
                transparent
                opacity={data.material?.opacity || 1}
            />
        </mesh>
    );
};

export const CanvasRenderer = ({ manifest }) => {
    if (!manifest) return null;
    const { lightSettings } = useWorldContext();

    return (
        <div style={{ width: '100vw', height: '100vh', background: manifest.environment.background }}>
            <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
                <ambientLight
                    color={lightSettings.color}
                    intensity={manifest.environment.ambientLight.intensity}
                />
                <pointLight position={[10, 10, 10]} intensity={1.5} />

                {manifest.scene.objects.map((obj) => (
                    <SceneObject key={obj.id} data={obj} />
                ))}

                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                <OrbitControls />
                <ContactShadows opacity={1} scale={10} blur={1} far={10} resolution={256} color="#000000" />
            </Canvas>
        </div>
    );
};
