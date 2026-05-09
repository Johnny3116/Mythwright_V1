import { Canvas } from '@react-three/fiber';

export default function MythwrightCanvas({ children, style }) {
  return (
    <Canvas
      style={{ width: '100%', height: '100%', background: '#1a1a2e', ...style }}
      gl={{ antialias: true, alpha: false }}
      shadows
    >
      {children}
    </Canvas>
  );
}
