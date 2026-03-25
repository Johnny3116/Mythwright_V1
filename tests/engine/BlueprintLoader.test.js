import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  loadBlueprint,
  validateBlueprint,
  getClassById,
  getZoneById,
  getConnectedZones,
  getBossStage,
} from '../../src/engine/BlueprintLoader.js';

// Load the actual campaign blueprint
const blueprintPath = resolve(process.cwd(), 'campaigns/monster-hunt-tzorath.json');
const rawBlueprint = JSON.parse(readFileSync(blueprintPath, 'utf-8'));

describe('BlueprintLoader', () => {
  describe('loadBlueprint with monster-hunt-tzorath.json', () => {
    it('parses the blueprint with zero errors', () => {
      const result = loadBlueprint(rawBlueprint);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data).not.toBeNull();
    });

    it('returns the full data object', () => {
      const result = loadBlueprint(rawBlueprint);
      expect(result.data.meta.title).toBe('Monster Hunt: Tzorath the Ancient');
    });
  });

  describe('validateBlueprint', () => {
    it('returns empty errors for valid blueprint', () => {
      const errors = validateBlueprint(rawBlueprint);
      expect(errors).toHaveLength(0);
    });

    it('returns error for null input', () => {
      const errors = validateBlueprint(null);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('returns error for missing top-level sections', () => {
      const broken = { meta: {}, settings: {}, classes: [] };
      const errors = validateBlueprint(broken);
      expect(errors.some((e) => e.includes('enemies'))).toBe(true);
    });

    it('returns error when classes is empty', () => {
      const broken = { ...rawBlueprint, classes: [] };
      const errors = validateBlueprint(broken);
      expect(errors.some((e) => e.includes('classes'))).toBe(true);
    });

    it('returns error when class missing id', () => {
      const broken = {
        ...rawBlueprint,
        classes: [{ name: 'Nameless', baseStats: { hp: 100, damage: [10, 20], defense: 5 } }],
      };
      const errors = validateBlueprint(broken);
      expect(errors.some((e) => e.includes('id'))).toBe(true);
    });

    it('returns error when boss stages are missing', () => {
      const broken = {
        ...rawBlueprint,
        enemies: { boss: { id: 'test', stages: [] } },
      };
      const errors = validateBlueprint(broken);
      expect(errors.some((e) => e.includes('stages'))).toBe(true);
    });

    it('returns error when hitRanges have gaps', () => {
      const broken = {
        ...rawBlueprint,
        settings: {
          ...rawBlueprint.settings,
          hitRanges: { miss: [1, 3], hit: [6, 15], critical: [16, 20] }, // gap at 4-5
        },
      };
      const errors = validateBlueprint(broken);
      expect(errors.some((e) => e.includes('4') || e.includes('5'))).toBe(true);
    });

    it('returns error when zone references unknown connectedZone', () => {
      const broken = {
        ...rawBlueprint,
        zones: [
          { ...rawBlueprint.zones[0], connectedZones: ['nonexistent-zone'] },
          ...rawBlueprint.zones.slice(1),
        ],
      };
      const errors = validateBlueprint(broken);
      expect(errors.some((e) => e.includes('nonexistent-zone'))).toBe(true);
    });

    it('returns error when winConditions is empty', () => {
      const broken = { ...rawBlueprint, winConditions: [] };
      const errors = validateBlueprint(broken);
      expect(errors.some((e) => e.includes('winConditions'))).toBe(true);
    });
  });

  describe('getClassById', () => {
    it('returns correct class for valid id', () => {
      const cls = getClassById(rawBlueprint, 'assault');
      expect(cls).not.toBeNull();
      expect(cls.id).toBe('assault');
      expect(cls.name).toBe('Assault');
    });

    it('returns null for unknown id', () => {
      const cls = getClassById(rawBlueprint, 'unknown');
      expect(cls).toBeNull();
    });
  });

  describe('getZoneById', () => {
    it('returns zone for valid id', () => {
      const zone = getZoneById(rawBlueprint, 'verdant-maw');
      expect(zone).not.toBeNull();
      expect(zone.id).toBe('verdant-maw');
    });

    it('returns null for unknown id', () => {
      expect(getZoneById(rawBlueprint, 'narnia')).toBeNull();
    });
  });

  describe('getConnectedZones', () => {
    it('returns connected zones for verdant-maw', () => {
      const connected = getConnectedZones(rawBlueprint, 'verdant-maw');
      expect(connected.length).toBeGreaterThan(0);
      expect(connected.every((z) => z.id)).toBe(true);
    });

    it('returns empty array for unknown zone', () => {
      const connected = getConnectedZones(rawBlueprint, 'unknown');
      expect(connected).toHaveLength(0);
    });
  });

  describe('getBossStage', () => {
    it('returns stage 1 data correctly', () => {
      const stage = getBossStage(rawBlueprint, 1);
      expect(stage).not.toBeNull();
      expect(stage.stage).toBe(1);
      expect(stage.maxHp).toBe(200);
      expect(stage.retreatThreshold).toBe(100);
    });

    it('returns stage 5 (final form) correctly', () => {
      const stage = getBossStage(rawBlueprint, 5);
      expect(stage).not.toBeNull();
      expect(stage.retreatThreshold).toBeNull();
    });

    it('returns null for invalid stage number', () => {
      expect(getBossStage(rawBlueprint, 99)).toBeNull();
    });
  });
});
