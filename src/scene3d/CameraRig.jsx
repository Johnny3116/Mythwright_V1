import { useThree } from '@react-three/fiber';
import { OrthographicCamera, OrbitControls } from '@react-three/drei';
import { useEffect } from 'react';

// Isometric tactical camera — orthographic for readability over aesthetics.
// Default angle: 45° azimuth, ~35° elevation (classic isometric).
// Controls: pan (right-drag), zoom (scroll), rotate (left-drag).
const ISO_POSITION = [14, 10, 14];
const ISO_TARGET = [0, 0, 0];

export default function CameraRig({ zoom = 60 }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.lookAt(...ISO_TARGET);
  }, [camera]);

  return (
    <>
      <OrthographicCamera
        makeDefault
        position={ISO_POSITION}
        zoom={zoom}
        near={0.1}
        far={1000}
      />
      <OrbitControls
        target={ISO_TARGET}
        enablePan
        enableZoom
        enableRotate
        zoomSpeed={0.6}
        panSpeed={0.8}
        minZoom={20}
        maxZoom={200}
        maxPolarAngle={Math.PI / 2.2}
      />
    </>
  );
}
