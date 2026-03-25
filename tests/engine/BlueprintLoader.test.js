import { describe, it, expect } from 'vitest';
import {
  validateBlueprint,
  loadBlueprint,
  getClassById,
  getZoneById,
  getConnectedZones,
  getBossStage,
} from '@engine/BlueprintLoader.js';

function minimalBlueprint(overrides = {}) {
  return {
    meta: { title: 'Test' },
    settings: {
      hitRanges: { miss: [1, 5], hit: [6, 15], critical: [16, 20] },
    },
    classes: [{ id: 'warrior', baseStats: { hp: 100, damage: [10, 20], defense: 5 } }],
    enemies: {
      boss: {
        id: 'boss',
        stages: [
          { stage: 1, retreatThreshold: 100, name: 'Boss', maxHp: 300, damage: [10, 15], defense: 5 },
          { stage: 2, retreatThreshold: null, name: 'Boss Final', maxHp: 200, damage: [15, 20], defense: 8 },
        ],
      },
    },
    zones: [
      { id: 'zone-a', connectedZones: ['zone-b'] },
      { id: 'zone-b', connectedZones: ['zone-a'] },
    ],
    systems: {},
    narrative: {},
    ...overrides,
  };
}

describe('validateBlueprint', () => {
  it('returns empty array for valid blueprint', () => {
    expect(validateBlueprint(minimalBlueprint())).toHaveLength(0);
  });

  it('requires top-level sections', () => {
    const errors = validateBlueprint({});
    expect(errors.some(e => e.includes('meta'))).toBe(true);
    expect(errors.some(e => e.includes('settings'))).toBe(true);
  });

  it('rejects non-object blueprint', () => {
    expect(validateBlueprint(null)).toHaveLength(1);
    expect(validateBlueprint('string')).toHaveLength(1);
  });

  it('rejects unknown connected zone references', () => {
    const bp = minimalBlueprint();
    bp.zones[0].connectedZones = ['nonexistent'];
    const errors = validateBlueprint(bp);
    expect(errors.some(e => e.includes('nonexistent'))).toBe(true);
  });

  it('validates hit range continuity', () => {
    const bp = minimalBlueprint();
    bp.settings.hitRanges = { miss: [1, 5], hit: [7, 15], critical: [16, 20] }; // gap at 6
    const errors = validateBlueprint(bp);
    expect(errors.some(e => e.includes('gap'))).toBe(true);
  });

  it('validates stage threshold ordering', () => {
    const bp = minimalBlueprint();
    bp.enemies.boss.stages[0].retreatThreshold = 200;
    bp.enemies.boss.stages[1] = { stage: 2, retreatThreshold: 100, name: 'S2', maxHp: 200, damage: [10, 15], defense: 5 };
    bp.enemies.boss.stages.push({ stage: 3, retreatThreshold: null, name: 'Final', maxHp: 150, damage: [15, 20], defense: 8 });
    // stage1 threshold 200 > stage2 threshold 100 — out of order (should be ascending)
    const errors = validateBlueprint(bp);
    expect(errors.some(e => e.includes('retreatThreshold'))).toBe(true);
  });
});

describe('loadBlueprint', () => {
  it('returns valid:true and blueprint for valid JSON', () => {
    const r = loadBlueprint(minimalBlueprint());
    expect(r.valid).toBe(true);
    expect(r.blueprint).not.toBeNull();
    expect(r.errors).toHaveLength(0);
  });

  it('returns valid:false and errors for invalid JSON', () => {
    const r = loadBlueprint({});
    expect(r.valid).toBe(false);
    expect(r.blueprint).toBeNull();
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

describe('query helpers', () => {
  const bp = minimalBlueprint();

  it('getClassById returns matching class', () => {
    expect(getClassById(bp, 'warrior')).not.toBeNull();
  });

  it('getClassById returns null for unknown id', () => {
    expect(getClassById(bp, 'wizard')).toBeNull();
  });

  it('getZoneById returns matching zone', () => {
    expect(getZoneById(bp, 'zone-a')).not.toBeNull();
  });

  it('getConnectedZones returns adjacent zone ids', () => {
    expect(getConnectedZones(bp, 'zone-a')).toContain('zone-b');
  });

  it('getBossStage returns stage by 0-based index', () => {
    expect(getBossStage(bp, 0)?.stage).toBe(1);
    expect(getBossStage(bp, 1)?.stage).toBe(2);
    expect(getBossStage(bp, 5)).toBeNull();
  });
});
