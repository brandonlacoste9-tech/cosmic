# Quantum Canvas Monorepo v1.0.0

#### packages/core/src/schemas/SceneSchema.ts

```typescript
import { z } from "zod";

export const Vector3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export const QuaternionSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  w: z.number(),
});

export const ObjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum(["mesh", "light", "camera"]),
  geometry: z.enum(["box", "sphere", "plane", "cylinder"]).optional(),
  material: z
    .object({
      color: z.string(),
      emissive: z.string().optional(),
      opacity: z.number().min(0).max(1),
    })
    .optional(),
  transform: z.object({
    position: Vector3Schema,
    rotation: QuaternionSchema,
    scale: Vector3Schema,
  }),
});

export const SceneManifestSchema = z.object({
  metadata: z.object({
    name: z.string(),
    version: z.string(),
    created: z.string(),
  }),
  environment: z.object({
    background: z.string(),
    ambientLight: z.object({
      color: z.string(),
      intensity: z.number(),
    }),
  }),
  scene: z.object({
    objects: z.array(ObjectSchema),
  }),
});
```

#### apps/quantum-canvas/src/components/CanvasRenderer.tsx

```tsx
import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, ContactShadows } from "@react-three/drei";

const SceneObject = ({ data }) => {
  const meshRef = useRef();

  return (
    <mesh
      ref={meshRef}
      position={[
        data.transform.position.x,
        data.transform.position.y,
        data.transform.position.z,
      ]}
      scale={[
        data.transform.scale.x,
        data.transform.scale.y,
        data.transform.scale.z,
      ]}
    >
      {data.geometry === "box" && <boxGeometry />}
      {data.geometry === "sphere" && <sphereGeometry />}
      <meshStandardMaterial
        color={data.material?.color || "#ffffff"}
        emissive={data.material?.emissive || "#000000"}
        transparent
        opacity={data.material?.opacity || 1}
      />
    </mesh>
  );
};

export const CanvasRenderer = ({ manifest }) => {
  if (!manifest) return null;
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: manifest.environment.background,
      }}
    >
      <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
        <ambientLight
          color={manifest.environment.ambientLight.color}
          intensity={manifest.environment.ambientLight.intensity}
        />
        <pointLight position={[10, 10, 10]} intensity={1.5} />

        {manifest.scene.objects.map((obj) => (
          <SceneObject key={obj.id} data={obj} />
        ))}

        <Stars
          radius={100}
          depth={50}
          count={5000}
          factor={4}
          saturation={0}
          fade
          speed={1}
        />
        <OrbitControls />
        <ContactShadows
          opacity={1}
          scale={10}
          blur={1}
          far={10}
          resolution={256}
          color="#000000"
        />
      </Canvas>
    </div>
  );
};
```

#### apps/quantum-canvas/package.json

```json
{
  "name": "quantum-canvas-app",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@react-three/drei": "^9.0.0",
    "@react-three/fiber": "^8.0.0",
    "three": "^0.150.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "zod": "^3.0.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^4.0.0"
  }
}
```
