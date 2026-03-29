import { describe, it, expect } from 'vitest';
import {
  createEffectTracker,
  applyEffect,
  tickEffects,
  removeEffect,
  getActiveEffects,
  getEffectModifier,
} from '../../src/engine/StatusEffects.js';

describe('StatusEffects — createEffectTracker', () => {
  it('starts with no effects', () => {
    const tracker = createEffectTracker();
    expect(tracker.getActiveEffects('player1')).toHaveLength(0);
  });

  it('addEffect adds to entity', () => {
    const tracker = createEffectTracker();
    tracker.addEffect('player1', { type: 'poison', value: 5, duration: 3 });
    expect(tracker.getActiveEffects('player1')).toHaveLength(1);
  });

  it('tickEffects decrements duration', () => {
    const tracker = createEffectTracker();
    tracker.addEffect('player1', { type: 'poison', value: 5, duration: 2 });
    tracker.tickEffects('player1');
    const effects = tracker.getActiveEffects('player1');
    expect(effects[0].duration).toBe(1);
  });

  it('tickEffects removes expired effects', () => {
    const tracker = createEffectTracker();
    tracker.addEffect('player1', { type: 'poison', value: 5, duration: 1 });
    const { expiredEffects } = tracker.tickEffects('player1');
    expect(tracker.getActiveEffects('player1')).toHaveLength(0);
    expect(expiredEffects).toHaveLength(1);
  });

  it('tickEffects applies DoT damage for poison', () => {
    const tracker = createEffectTracker();
    tracker.addEffect('player1', { type: 'poison', value: 10, duration: 2 });
    const { damageDealt } = tracker.tickEffects('player1');
    expect(damageDealt).toBe(10);
  });

  it('tickEffects applies DoT damage for bleed', () => {
    const tracker = createEffectTracker();
    tracker.addEffect('player1', { type: 'bleed', value: 7, duration: 2 });
    const { damageDealt } = tracker.tickEffects('player1');
    expect(damageDealt).toBe(7);
  });

  it('removeEffect removes all of type', () => {
    const tracker = createEffectTracker();
    tracker.addEffect('player1', { type: 'slow', value: 0.5, duration: 2 });
    tracker.addEffect('player1', { type: 'poison', value: 5, duration: 3 });
    tracker.removeEffect('player1', 'slow');
    const effects = tracker.getActiveEffects('player1');
    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe('poison');
  });

  it('clearAll removes all effects from entity', () => {
    const tracker = createEffectTracker();
    tracker.addEffect('boss', { type: 'poison', value: 5, duration: 3 });
    tracker.addEffect('boss', { type: 'bleed', value: 5, duration: 2 });
    tracker.clearAll('boss');
    expect(tracker.getActiveEffects('boss')).toHaveLength(0);
  });

  it('hasEffect detects active effects', () => {
    const tracker = createEffectTracker();
    tracker.addEffect('player1', { type: 'immobilize', duration: 1 });
    expect(tracker.hasEffect('player1', 'immobilize')).toBe(true);
    expect(tracker.hasEffect('player1', 'poison')).toBe(false);
  });

  it('serialize and deserialize round-trip', () => {
    const tracker = createEffectTracker();
    tracker.addEffect('player1', { type: 'defenseBoost', value: 5, duration: 2 });
    const data = tracker.serialize();

    const tracker2 = createEffectTracker();
    tracker2.deserialize(data);
    const effects = tracker2.getActiveEffects('player1');
    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe('defenseBoost');
  });

  it('getModifier sums boost effects', () => {
    const tracker = createEffectTracker();
    tracker.addEffect('player1', { type: 'defenseBoost', value: 5, duration: 2 });
    tracker.addEffect('player1', { type: 'defenseBoost', value: 3, duration: 2 });
    expect(tracker.getModifier('player1', 'defense')).toBe(8);
  });
});

describe('StatusEffects — functional API', () => {
  it('applyEffect adds effect to entity state', () => {
    const entity = { id: 'player1', hp: 100, statusEffects: [] };
    const updated = applyEffect(entity, { type: 'poison', value: 5, duration: 3 });
    expect(updated.statusEffects).toHaveLength(1);
    expect(updated.statusEffects[0].type).toBe('poison');
    // Original unchanged
    expect(entity.statusEffects).toHaveLength(0);
  });

  it('tickEffects decrements durations and removes expired', () => {
    const entity = {
      id: 'player1',
      hp: 100,
      statusEffects: [
        { id: 'e1', type: 'slow', value: 0.5, duration: 1 },
        { id: 'e2', type: 'bleed', value: 5, duration: 2 },
      ],
    };
    const { entityState, expiredEffects, damageDealt } = tickEffects(entity);
    expect(entityState.statusEffects).toHaveLength(1); // slow expired
    expect(expiredEffects).toHaveLength(1);
    expect(damageDealt).toBe(5); // bleed applied
  });

  it('removeEffect removes by type', () => {
    const entity = {
      id: 'player1',
      hp: 100,
      statusEffects: [{ id: 'e1', type: 'slow', value: 0.5, duration: 2 }],
    };
    const updated = removeEffect(entity, 'slow');
    expect(updated.statusEffects).toHaveLength(0);
  });

  it('getActiveEffects returns copy of effects', () => {
    const entity = { id: 'player1', hp: 100, statusEffects: [{ id: 'e1', type: 'poison', value: 5, duration: 2 }] };
    const effects = getActiveEffects(entity);
    expect(effects).toHaveLength(1);
  });

  it('getEffectModifier sums boost values', () => {
    const entity = {
      id: 'player1',
      hp: 100,
      statusEffects: [
        { id: 'e1', type: 'damageMultiplier', value: 0.5, duration: 2 },
        { id: 'e2', type: 'damageMultiplier', value: 0.25, duration: 1 },
      ],
    };
    expect(getEffectModifier(entity, 'damage')).toBeCloseTo(0.75);
  });
});
