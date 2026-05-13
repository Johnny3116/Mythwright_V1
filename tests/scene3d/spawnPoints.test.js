import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  ZoneSpawnPointsSchema,
  SpawnAnchorSchema,
  validateZoneSpawnPoints,
} from '../../src/shared/contracts/encounter.js';

const blueprintPath = path.resolve(
  process.cwd(),
  'campaigns/monster-hunt-tzorath.json',
);
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));

describe('SpawnAnchorSchema', () => {
  it('accepts a well-formed anchor', () => {
    const r = SpawnAnchorSchema.safeParse({
      id: 'a1',
      position: { x: 1, y: 0, z: -2 },
    });
    expect(r.success).toBe(true);
  });

  it('rejects missing position axis', () => {
    const r = SpawnAnchorSchema.safeParse({
      id: 'a1',
      position: { x: 1, y: 0 },
    });
    expect(r.success).toBe(false);
  });

  it('rejects non-numeric position', () => {
    const r = SpawnAnchorSchema.safeParse({
      id: 'a1',
      position: { x: '1', y: 0, z: 0 },
    });
    expect(r.success).toBe(false);
  });
});

describe('ZoneSpawnPointsSchema', () => {
  it('accepts a complete spawn points block', () => {
    const r = validateZoneSpawnPoints({
      players: [{ id: 'p1', position: { x: 0, y: 0, z: 0 } }],
      enemies: [],
      boss: { id: 'b', position: { x: 0, y: 0, z: 4 } },
      moveAnchors: [{ id: 'm1', position: { x: 0, y: 0, z: 0 } }],
    });
    expect(r.success).toBe(true);
  });

  it('rejects empty players array (need somewhere for player 1 to stand)', () => {
    const r = validateZoneSpawnPoints({
      players: [],
      enemies: [],
      boss: { id: 'b', position: { x: 0, y: 0, z: 4 } },
      moveAnchors: [{ id: 'm1', position: { x: 0, y: 0, z: 0 } }],
    });
    expect(r.success).toBe(false);
  });

  it('rejects empty moveAnchors (movement system needs at least one target)', () => {
    const r = validateZoneSpawnPoints({
      players: [{ id: 'p1', position: { x: 0, y: 0, z: 0 } }],
      enemies: [],
      boss: { id: 'b', position: { x: 0, y: 0, z: 4 } },
      moveAnchors: [],
    });
    expect(r.success).toBe(false);
  });

  it('rejects missing boss anchor', () => {
    const r = validateZoneSpawnPoints({
      players: [{ id: 'p1', position: { x: 0, y: 0, z: 0 } }],
      enemies: [],
      moveAnchors: [{ id: 'm1', position: { x: 0, y: 0, z: 0 } }],
    });
    expect(r.success).toBe(false);
  });
});

describe('Tzorath blueprint defaultZoneSpawnPoints', () => {
  it('field exists at the blueprint root', () => {
    expect(blueprint.defaultZoneSpawnPoints).toBeDefined();
  });

  it('parses cleanly against ZoneSpawnPointsSchema', () => {
    const r = ZoneSpawnPointsSchema.safeParse(blueprint.defaultZoneSpawnPoints);
    if (!r.success) {
      // surface the validation issues if we ever break the blueprint
      throw new Error(JSON.stringify(r.error.format(), null, 2));
    }
    expect(r.success).toBe(true);
  });

  it('provides at least 4 player anchors (max party size = 4)', () => {
    expect(blueprint.defaultZoneSpawnPoints.players.length).toBeGreaterThanOrEqual(4);
  });

  it('provides at least 1 enemy anchor', () => {
    expect(blueprint.defaultZoneSpawnPoints.enemies.length).toBeGreaterThanOrEqual(1);
  });

  it('all anchor IDs are unique within their group', () => {
    const groups = ['players', 'enemies', 'moveAnchors'];
    for (const g of groups) {
      const ids = blueprint.defaultZoneSpawnPoints[g].map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
