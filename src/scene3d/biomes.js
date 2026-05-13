// V2 M3 visual: per-zone biome palettes for the diorama renderer.
// Every renderable scene element (ground, grid, fog, lights, particles)
// reads its colors from one of these palettes — keeping zone identity
// consistent across systems and easy to retune.
//
// Palette fields:
//   ground:        floor color (top of the diorama)
//   groundEdge:    bevel/lip color (the raised tabletop rim)
//   grid:          tactical grid line color
//   gridAccent:    every-5th line accent color
//   fog:           distance fog color (also tints the sky-direction)
//   fogDensity:    exponential fog density (0.01–0.05 sweet spot)
//   keyLight:      warm directional sun color
//   rimLight:      cool back/rim accent color
//   ambient:       hemisphere ambient color
//   ambientGround: hemisphere ground bounce color
//   particle:      placeholder for atmospheric motes (Tier 2)
//
// Palette names are chosen for evocative direction, not literal naming
// (a designer can swap them at any time without touching renderers).

const BIOMES = {
  // ─── Tzorath jungle zones (M3 default) ──────────────────────────────────
  'verdant-maw': {
    name: 'Verdant Maw',
    ground:        '#1f3a22',
    groundEdge:    '#3a2818',
    grid:          '#4a6b3e',
    gridAccent:    '#7faa55',
    fog:           '#0e1a0d',
    fogDensity:    0.035,
    keyLight:      '#ffe4a8',
    rimLight:      '#5fa2ff',
    ambient:       '#7fa4ff',
    ambientGround: '#2a3a1f',
    particle:      '#dfffc8',
  },
  'razorback-canopy': {
    name: 'Razorback Canopy',
    ground:        '#22422a',
    groundEdge:    '#332315',
    grid:          '#456a40',
    gridAccent:    '#88c460',
    fog:           '#142013',
    fogDensity:    0.045,
    keyLight:      '#ffe0a0',
    rimLight:      '#3f88ff',
    ambient:       '#6f9ce0',
    ambientGround: '#2c3e22',
    particle:      '#cfeac0',
  },
  'shattered-cliffs': {
    name: 'Shattered Cliffs',
    ground:        '#5a4836',
    groundEdge:    '#3b2c1c',
    grid:          '#7a634a',
    gridAccent:    '#c8a87a',
    fog:           '#221a14',
    fogDensity:    0.030,
    keyLight:      '#ffd590',
    rimLight:      '#ff7a4a',
    ambient:       '#c89a78',
    ambientGround: '#4a3826',
    particle:      '#ffc89a',
  },
  'obsidian-grotto': {
    name: 'Obsidian Grotto',
    ground:        '#16161e',
    groundEdge:    '#0a0a14',
    grid:          '#3b3a52',
    gridAccent:    '#7c64c4',
    fog:           '#08070d',
    fogDensity:    0.060,
    keyLight:      '#a884ff',
    rimLight:      '#3affc6',
    ambient:       '#5448a0',
    ambientGround: '#0e0e18',
    particle:      '#9ad7ff',
  },
  'sunken-veil': {
    name: 'Sunken Veil',
    ground:        '#24383a',
    groundEdge:    '#1a2226',
    grid:          '#46686a',
    gridAccent:    '#8cc8c0',
    fog:           '#152024',
    fogDensity:    0.055,
    keyLight:      '#cfeed6',
    rimLight:      '#3a6a90',
    ambient:       '#6cb0a8',
    ambientGround: '#1c2a2c',
    particle:      '#bcdbe2',
  },
  'echoing-wastes': {
    name: 'Echoing Wastes',
    ground:        '#7c6444',
    groundEdge:    '#4a3a26',
    grid:          '#a08458',
    gridAccent:    '#e8c084',
    fog:           '#3a2c1a',
    fogDensity:    0.030,
    keyLight:      '#ffd57a',
    rimLight:      '#ff9a4a',
    ambient:       '#d4ad7a',
    ambientGround: '#5c4a30',
    particle:      '#ffe2a8',
  },
  'serpents-hollow': {
    name: 'Serpent’s Hollow',
    ground:        '#324a2c',
    groundEdge:    '#22301c',
    grid:          '#5e7a4a',
    gridAccent:    '#a8d066',
    fog:           '#1a2616',
    fogDensity:    0.045,
    keyLight:      '#fce4a0',
    rimLight:      '#5fa860',
    ambient:       '#7ea878',
    ambientGround: '#28361f',
    particle:      '#d8f0a0',
  },
  'devourers-basin': {
    name: 'Devourer’s Basin',
    ground:        '#4a2a2a',
    groundEdge:    '#301818',
    grid:          '#7a4040',
    gridAccent:    '#c46a6a',
    fog:           '#1a0a0a',
    fogDensity:    0.040,
    keyLight:      '#ffa884',
    rimLight:      '#ff5050',
    ambient:       '#a86060',
    ambientGround: '#3a1c1c',
    particle:      '#ffb0a0',
  },
  'howling-crest': {
    name: 'Howling Crest',
    ground:        '#5e6a78',
    groundEdge:    '#3c4452',
    grid:          '#8a96a8',
    gridAccent:    '#dce4f0',
    fog:           '#2c323e',
    fogDensity:    0.045,
    keyLight:      '#fff0d4',
    rimLight:      '#a8c8ff',
    ambient:       '#a8b6cc',
    ambientGround: '#46505e',
    particle:      '#ffffff',
  },
  'tzorath-throne': {
    name: 'Tzorath’s Throne',
    ground:        '#3a1a1a',
    groundEdge:    '#1c0a0a',
    grid:          '#7a3a3a',
    gridAccent:    '#ff8a4a',
    fog:           '#180404',
    fogDensity:    0.050,
    keyLight:      '#ffba6a',
    rimLight:      '#ff3a3a',
    ambient:       '#9a4a3a',
    ambientGround: '#2a1010',
    particle:      '#ff8060',
  },
};

// Fallback palette — used for unknown zones (never throws).
const DEFAULT_BIOME = {
  name: 'Default',
  ground:        '#33334a',
  groundEdge:    '#1c1c2a',
  grid:          '#4a4a6a',
  gridAccent:    '#7a8acc',
  fog:           '#101018',
  fogDensity:    0.035,
  keyLight:      '#ffe8c0',
  rimLight:      '#5f88ff',
  ambient:       '#7f96cc',
  ambientGround: '#222032',
  particle:      '#cfd6f0',
};

export function getBiome(zoneId) {
  return BIOMES[zoneId] ?? DEFAULT_BIOME;
}

export { DEFAULT_BIOME };
