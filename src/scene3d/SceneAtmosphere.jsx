// V2 M3 visual: lighting + fog rig for the diorama renderer.
// Pulls all colors from the active biome so each zone reads with its own
// mood without re-authoring the lighting setup.
//
// Light philosophy (Sigil-inspired):
//   * Hemisphere fill — gives the diorama volume; ambient color from sky
//     direction, biome ground bounce from below.
//   * Warm key directional — the "sun"; comes from above-front, casts soft
//     shadows. Color is biome.keyLight (typically warm orange/yellow).
//   * Cool rim directional — from behind/below; non-shadow-casting; adds
//     edge separation to silhouettes.
//   * Tiny ambient — last-resort floor for shadows; kept low so shadows
//     read as actual shadow.
//
// Fog: scene-wide exponential fog tinted to biome.fog. Helps the diorama
// edge dissolve into atmosphere rather than ending in a hard line.

export default function SceneAtmosphere({ biome, shadows = true }) {
  return (
    <>
      {/* Distance fog — applies scene-wide. R3F's <fogExp2 attach="fog">
          mounts onto Scene.fog automatically. */}
      <fogExp2 attach="fog" args={[biome.fog, biome.fogDensity]} />

      {/* Background color matches fog so the horizon dissolves cleanly. */}
      <color attach="background" args={[biome.fog]} />

      {/* Hemisphere — sky/ground bounce. Cheap, high-impact for diorama feel. */}
      <hemisphereLight
        color={biome.ambient}
        groundColor={biome.ambientGround}
        intensity={1.4}
      />

      {/* Soft ambient floor — keeps the deepest shadows from going to black. */}
      <ambientLight intensity={0.30} color={biome.ambient} />

      {/* Warm key — the sun. Above-front-right. Casts soft shadows. */}
      <directionalLight
        position={[8, 16, 6]}
        intensity={2.2}
        color={biome.keyLight}
        castShadow={shadows}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0005}
        shadow-normalBias={0.04}
        shadow-camera-near={1}
        shadow-camera-far={45}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />

      {/* Cool rim — behind/above-left. No shadows, no specular crunch.
          Pulls miniature silhouettes off the background. */}
      <directionalLight
        position={[-10, 8, -10]}
        intensity={0.85}
        color={biome.rimLight}
      />
    </>
  );
}
