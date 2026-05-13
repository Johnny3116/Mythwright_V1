// V2 M3 visual: shader-based tactical grid that fades with distance from
// the center of the diorama base. Two line weights — primary (every cell)
// and accent (every 5th) — both biome-tinted. Sits a hair above the base
// disc so there's no z-fighting.
//
// Why a shader instead of <gridHelper>:
//   * fade-out is anti-aliased and continuous, not just opaque lines
//   * line weight is independent of camera distance
//   * we control colors per-zone via biome props without re-creating geometry
//
// Cost: one full-screen-ish fragment shader per frame on a 96-segment plane.
// That's negligible at iso zoom — the alternative (lots of skinny meshes)
// is heavier and aliases badly.

import { useMemo } from 'react';
import * as THREE from 'three';

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;

  uniform vec3  uGrid;       // primary line color
  uniform vec3  uAccent;     // accent color (every Nth line)
  uniform float uSize;       // grid extent in world units (matches plane size)
  uniform float uCell;       // size of one cell in world units
  uniform float uAccentEvery;// 5.0 → every 5th line gets the accent
  uniform float uLineWidth;  // primary line half-width, in world units
  uniform float uOpacity;    // overall multiplier
  uniform float uFadeStart;  // world distance from center where fade begins
  uniform float uFadeEnd;    // world distance where alpha reaches 0

  // Anti-aliased line mask. coord = world coord on one axis, returns
  // a 0..1 intensity that's 1 near integer multiples of uCell.
  float lineMask(float coord, float halfWidth) {
    float n = coord / uCell;
    float d = abs(n - floor(n + 0.5));     // distance to nearest integer cell
    float aa = fwidth(n) * 0.75 + halfWidth / uCell;
    return 1.0 - smoothstep(halfWidth / uCell, halfWidth / uCell + aa, d);
  }

  // Returns 1.0 if the nearest integer line at this coord is an accent line.
  float isAccent(float coord) {
    float n = coord / uCell;
    float nearest = floor(n + 0.5);
    return step(0.5, abs(mod(nearest, uAccentEvery)) < 0.5 ? 1.0 : 0.0);
  }

  void main() {
    // Map UV (0..1) back to world-centered coords (-uSize/2 .. uSize/2)
    vec2 world = (vUv - 0.5) * uSize;

    float lx = lineMask(world.x, uLineWidth);
    float ly = lineMask(world.y, uLineWidth);
    float line = max(lx, ly);

    // Accent: a line is accent if EITHER axis lands on an accent multiple
    // and that axis carries the line.
    float accentMix = max(
      lx * isAccent(world.x),
      ly * isAccent(world.y)
    );

    vec3 color = mix(uGrid, uAccent, accentMix);

    // Radial fade — start opaque, fade to 0 by uFadeEnd
    float dist = length(world);
    float fade = 1.0 - smoothstep(uFadeStart, uFadeEnd, dist);

    float alpha = line * fade * uOpacity;
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(color, alpha);
  }
`;

export default function TacticalGrid({
  size = 22,
  cell = 1,
  biome,
  opacity = 0.55,
  accentEvery = 5,
  lineWidth = 0.025,
}) {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uGrid:        { value: new THREE.Color(biome.grid) },
        uAccent:      { value: new THREE.Color(biome.gridAccent) },
        uSize:        { value: size },
        uCell:        { value: cell },
        uAccentEvery: { value: accentEvery },
        uLineWidth:   { value: lineWidth },
        uOpacity:     { value: opacity },
        uFadeStart:   { value: size * 0.30 },
        uFadeEnd:     { value: size * 0.55 },
      },
      extensions: { derivatives: true }, // for fwidth() in WebGL1
    });
  }, [biome.grid, biome.gridAccent, size, cell, opacity, accentEvery, lineWidth]);

  return (
    <mesh
      position={[0, 0.012, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      // pointer events pass through — clicks should hit the base disc, not the grid
      raycast={() => null}
    >
      <planeGeometry args={[size, size]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
