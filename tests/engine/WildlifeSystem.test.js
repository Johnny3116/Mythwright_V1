import { describe, it, expect } from 'vitest';
import { processBossHunt, playerIntervention } from '@engine/WildlifeSystem.js';

// Engine expects roll as { natural, modified } object (rollD20() shape)
function roll(n) { return { natural: n, modified: n }; }

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
        attackChance: [1, 5], // roll in [1,5] → wildlife counter-attacks player
        bossEffect: { hp: 30 },
      },
    },
    { id: 'zone-empty' },
  ],
  systems: {
    wildlife: {
      // Must include 'eat' range so rolls [6,15] match and trigger buffs
      bossHuntRolls: {
        fail:     [1, 5],
        eat:      [6, 15],
        eatBonus: [16, 20],
      },
    },
  },
};

const gameState = { boss: { zoneId: 'zone-a' } };
const player = { id: 'p1' };

describe('processBossHunt', () => {
  it('returns hunted:false when zone has no wildlife', () => {
    const r = processBossHunt('zone-empty', gameState, blueprint, roll(10));
    expect(r.hunted).toBe(false);
  });

  it('returns hunted:false when roll is in fail range', () => {
    const r = processBossHunt('zone-a', gameState, blueprint, roll(3));
    expect(r.hunted).toBe(false);
    expect(r.narrative).toContain('fails to catch');
  });

  it('returns hunted:true and base HP buff on eat roll', () => {
    const r = processBossHunt('zone-a', gameState, blueprint, roll(10));
    expect(r.hunted).toBe(true);
    expect(r.bossBuffed).toBe(true);
    expect(r.buffAmount).toBe(30); // bossEffect.hp = 30
  });

  it('returns hunted:true with bonus on eatBonus roll', () => {
    const r = processBossHunt('zone-a', gameState, blueprint, roll(18));
    expect(r.hunted).toBe(true);
    expect(r.bossBuffed).toBe(true);
    expect(r.narrative).toContain('bonus strength');
  });
});

describe('playerIntervention', () => {
  it('returns success:false when zone has no wildlife', () => {
    const r = playerIntervention(player, 'zone-empty', blueprint, roll(10));
    expect(r.success).toBe(false);
  });

  it('fails on miss roll when wildlife counter-attacks (attackChance [1,5])', () => {
    const r = playerIntervention(player, 'zone-a', blueprint, roll(3));
    // roll 3 is in attackChance [1,5] → wildlife attacks → intervention fails
    expect(r.success).toBe(false);
    expect(r.playerDamage).toBe(10);
  });

  it('succeeds on hit roll outside attackChance range', () => {
    const r = playerIntervention(player, 'zone-a', blueprint, roll(10));
    expect(r.success).toBe(true);
    expect(r.playerDamage).toBe(0);
  });
});
