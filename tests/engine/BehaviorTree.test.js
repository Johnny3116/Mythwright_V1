import { describe, it, expect } from 'vitest';
import {
  selectBossAction,
  selectBossTarget,
  shouldBossRetreat,
  selectRetreatZone,
  evaluateBehaviorTree,
} from '../../src/engine/BehaviorTree.js';

const stage1Data = {
  stage: 1,
  name: 'Hatchling',
  maxHp: 200,
  damage: [15, 25],
  defense: 10,
  retreatThreshold: 100,
  behavior: {
    dodgeChance: 0.10,
    retreatZone: 'verdant-maw',
  },
};

const stage2Data = {
  stage: 2,
  name: 'Stalker',
  maxHp: 300,
  damage: [20, 30],
  defense: 15,
  retreatThreshold: 150,
  behavior: {
    burrowChance: 0.25,
    retreatZone: 'obsidian-grotto',
  },
};

const stage3Data = {
  stage: 3,
  name: 'Predator',
  maxHp: 400,
  damage: [25, 40],
  defense: 20,
  retreatThreshold: 200,
  behavior: {
    grabChance: 0.30,
    retreatZone: 'razorback-canopy',
  },
};

const stage5Data = {
  stage: 5,
  name: 'Final Form',
  maxHp: 700,
  damage: [50, 80],
  defense: 30,
  retreatThreshold: null,
  behavior: {
    aoeAttack: true,
    retreatZone: null,
  },
};

const players = [
  { id: 'p1', hp: 100, zoneId: 'verdant-maw' },
  { id: 'p2', hp: 50, zoneId: 'verdant-maw' },
  { id: 'p3', hp: 80, zoneId: 'verdant-maw' },
];

const bossState = { hp: 150, maxHp: 200, stage: 1, currentZoneId: 'verdant-maw', effects: [] };

describe('BehaviorTree', () => {
  describe('selectBossAction', () => {
    it('selects dodge for stage 1 when roll is low (10% = roll 1-2)', () => {
      const roll = { natural: 1, modified: 1 }; // Guaranteed dodge threshold
      const action = selectBossAction(bossState, players, 'verdant-maw', roll, stage1Data);
      expect(action.action).toBe('dodge');
    });

    it('selects attack when dodge does not trigger (roll > 2 for 10% chance)', () => {
      const roll = { natural: 10, modified: 10 };
      const action = selectBossAction(bossState, players, 'verdant-maw', roll, stage1Data);
      expect(['attack', 'hunt_wildlife']).toContain(action.action);
    });

    it('selects burrow for stage 2 on low roll', () => {
      const bossSt2 = { ...bossState, stage: 2 };
      const roll = { natural: 2, modified: 2 }; // 25% = roll 1-5
      const action = selectBossAction(bossSt2, players, 'obsidian-grotto', roll, stage2Data);
      expect(action.action).toBe('burrow');
    });

    it('selects grab for stage 3 on low roll', () => {
      const bossSt3 = { ...bossState, stage: 3 };
      const roll = { natural: 3, modified: 3 }; // 30% = roll 1-6
      const action = selectBossAction(bossSt3, players, 'razorback-canopy', roll, stage3Data);
      expect(action.action).toBe('grab');
      expect(action.effects.some((e) => e.type === 'immobilize')).toBe(true);
    });

    it('selects aoe_attack for stage 5', () => {
      const bossSt5 = { ...bossState, stage: 5 };
      const roll = { natural: 15, modified: 15 };
      const action = selectBossAction(bossSt5, players, 'tzorath-throne', roll, stage5Data);
      expect(action.action).toBe('aoe_attack');
      expect(action.target).toBe('all');
    });

    it('returns attack with a numeric damage value', () => {
      const roll = { natural: 10, modified: 10 };
      const action = selectBossAction(bossState, players, 'verdant-maw', roll, stage1Data);
      if (action.action === 'attack') {
        expect(typeof action.damage).toBe('number');
        expect(action.damage).toBeGreaterThan(0);
      }
    });

    it('returns hunt_wildlife when no players are alive', () => {
      const roll = { natural: 15, modified: 15 };
      const deadPlayers = players.map((p) => ({ ...p, hp: 0 }));
      const action = selectBossAction(bossState, deadPlayers, 'verdant-maw', roll, stage1Data);
      expect(action.action).toBe('hunt_wildlife');
    });

    it('dodge action has untargetable effect', () => {
      const roll = { natural: 1, modified: 1 };
      const action = selectBossAction(bossState, players, 'verdant-maw', roll, stage1Data);
      if (action.action === 'dodge') {
        expect(action.effects.some((e) => e.type === 'untargetable')).toBe(true);
      }
    });
  });

  describe('selectBossTarget', () => {
    it('returns a player id for random strategy', () => {
      const id = selectBossTarget(players, 'random');
      expect(players.map((p) => p.id)).toContain(id);
    });

    it('returns lowest HP player', () => {
      const id = selectBossTarget(players, 'lowest_hp');
      expect(id).toBe('p2'); // p2 has 50 HP
    });

    it('returns highest threat player', () => {
      const playersWithThreat = [
        { id: 'p1', hp: 100, damageDealt: 50 },
        { id: 'p2', hp: 50, damageDealt: 200 },
        { id: 'p3', hp: 80, damageDealt: 10 },
      ];
      const id = selectBossTarget(playersWithThreat, 'highest_threat');
      expect(id).toBe('p2');
    });

    it('returns null when no players', () => {
      expect(selectBossTarget([], 'random')).toBeNull();
    });
  });

  describe('shouldBossRetreat', () => {
    it('returns true when HP is at threshold', () => {
      const boss = { hp: 100 };
      expect(shouldBossRetreat(boss, stage1Data)).toBe(true);
    });

    it('returns true when HP is below threshold', () => {
      const boss = { hp: 50 };
      expect(shouldBossRetreat(boss, stage1Data)).toBe(true);
    });

    it('returns false when HP is above threshold', () => {
      const boss = { hp: 150 };
      expect(shouldBossRetreat(boss, stage1Data)).toBe(false);
    });

    it('returns false for final form (null threshold)', () => {
      const boss = { hp: 10 };
      expect(shouldBossRetreat(boss, stage5Data)).toBe(false);
    });
  });

  describe('selectRetreatZone', () => {
    it('returns the retreat zone from stage data', () => {
      expect(selectRetreatZone(stage1Data)).toBe('verdant-maw');
      expect(selectRetreatZone(stage2Data)).toBe('obsidian-grotto');
    });

    it('returns null for final form', () => {
      expect(selectRetreatZone(stage5Data)).toBeNull();
    });
  });

  describe('evaluateBehaviorTree (legacy API)', () => {
    it('returns action, target, and params', () => {
      const gameState = { players: { p1: players[0], p2: players[1] }, boss: bossState };
      const roll = { natural: 15, modified: 15 };
      const result = evaluateBehaviorTree(stage1Data, gameState, roll);
      expect(result).toHaveProperty('action');
      expect(result).toHaveProperty('target');
      expect(result).toHaveProperty('params');
    });
  });
});
