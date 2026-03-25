import { describe, it, expect } from 'vitest';
import { processBossHunt, playerIntervention } from '@engine/WildlifeSystem.js';

const blueprint = {
  settings: {
    hitRanges: { miss: [1, 5], hit: [6, 15], critical: [16, 20] },
  },
  zones: [
    {
      id: 'zone-a',
      wildlife: {
        creature: 'Veldboar',
        attackDamage: 10,
        bossEffect: { hp: 30 },
      },
    },
    { id: 'zone-empty' },
  ],
  systems: {
    wildlife: {
      bossHuntRolls: {
        fail: [1, 5],
        eatBonus: [16, 20],
      },
    },
  },
};

const gameState = { boss: { zoneId: 'zone-a' } };
const player = { id: 'p1' };

describe('processBossHunt', () => {
  it('returns hunted:false when zone has no wildlife', () => {
    const r = processBossHunt('zone-empty', gameState, blueprint, 10);
    expect(r.hunted).toBe(false);
  });

  it('returns hunted:false when roll is in fail range', () => {
    const r = processBossHunt('zone-a', gameState, blueprint, 3);
    expect(r.hunted).toBe(false);
    expect(r.narrative).toContain('escapes');
  });

  it('returns hunted:true and base buff on normal hunt roll', () => {
    const r = processBossHunt('zone-a', gameState, blueprint, 10);
    expect(r.hunted).toBe(true);
    expect(r.bossBuffed).toBe(true);
    expect(r.buffAmount).toBe(30);
  });

  it('returns 1.5× buff on eatBonus roll', () => {
    const r = processBossHunt('zone-a', gameState, blueprint, 18);
    expect(r.hunted).toBe(true);
    expect(r.buffAmount).toBe(45); // 30 * 1.5
    expect(r.narrative).toContain('greedily');
  });
});

describe('playerIntervention', () => {
  it('returns success:false when zone has no wildlife', () => {
    const r = playerIntervention(player, 'zone-empty', blueprint, 10);
    expect(r.success).toBe(false);
  });

  it('fails on miss roll and deals player damage', () => {
    const r = playerIntervention(player, 'zone-a', blueprint, 3);
    expect(r.success).toBe(false);
    expect(r.playerDamage).toBe(10);
  });

  it('succeeds on hit roll', () => {
    const r = playerIntervention(player, 'zone-a', blueprint, 10);
    expect(r.success).toBe(true);
    expect(r.playerDamage).toBe(0);
  });
});
