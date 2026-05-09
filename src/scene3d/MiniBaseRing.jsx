// Colored base ring under each miniature — critical for battlefield readability.
export default function MiniBaseRing({ position, ringColor = '#ffffff', radius = 0.45 }) {
  const [x, , z] = position;
  return (
    <mesh position={[x, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.06, 8, 48]} />
      <meshStandardMaterial color={ringColor} emissive={ringColor} emissiveIntensity={0.4} />
    </mesh>
  );
}
