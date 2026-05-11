// Colored base ring under a miniature — critical for battlefield readability.
//
// `position` is a local offset (relative to the parent group). The ring is
// laid flat on the XZ plane and lifted slightly above y=0 to avoid z-fighting
// with the terrain plane. Multiple rings (selection, targeting) can stack by
// passing slightly different y values.
export default function MiniBaseRing({
  position = [0, 0, 0],
  ringColor = '#ffffff',
  radius = 0.45,
  thickness = 0.06,
  emissiveIntensity = 0.4,
}) {
  const [x, y, z] = position;
  return (
    <mesh position={[x, 0.01 + y, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, thickness, 8, 48]} />
      <meshStandardMaterial color={ringColor} emissive={ringColor} emissiveIntensity={emissiveIntensity} />
    </mesh>
  );
}
