import { describe, it, expect } from 'vitest';
import {
  applyEffect, tickEffects, removeEffect, removeEffectById,
  getActiveEffects, getEffectModifier, clearAllEffects,
  serialize, deserialize,
} from '@engine/StatusEffects.js';

function entity(overrides = {}) {
  return { id: 'e1', hp: 100, statusEffects: [], ...overrides };
}

function makeEffect(overrides = {}) {
  return { type: 'poison', value: 10, duration: 3, source: 'test', ...overrides };
}

describe('applyEffect', () => {
  it('adds effect to entity statusEffects', () => {
    const e = applyEffect(entity(), makeEffect());
    expect(e.statusEffects).toHaveLength(1);
    expect(e.statusEffects[0].type).toBe('poison');
  });

  it('assigns a unique id to each effect', () => {
    const e1 = applyEffect(entity(), makeEffect());
    const e2 = applyEffect(e1, makeEffect());
    const ids = e2.statusEffects.map(e => e.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('does not mutate original state', () => {
    const orig = entity();
    applyEffect(orig, makeEffect());
    expect(orig.statusEffects).toHaveLength(0);
  });

  it('multiple entities tracked independently', () => {
    const a = applyEffect(entity({ id: 'a' }), makeEffect({ type: 'bleed' }));
    const b = applyEffect(entity({ id: 'b' }), makeEffect({ type: 'slow' }));
    expect(a.statusEffects[0].type).toBe('bleed');
    expect(b.statusEffects[0].type).toBe('slow');
  });

  it('same effect type stacks', () => {
    let e = entity();
    e = applyEffect(e, makeEffect({ type: 'damageMultiplier', value: 1.5 }));
    e = applyEffect(e, makeEffect({ type: 'damageMultiplier', value: 1.5 }));
    expect(e.statusEffects.filter(x => x.type === 'damageMultiplier')).toHaveLength(2);
  });
});

describe('getActiveEffects', () => {
  it('returns copy of statusEffects', () => {
    const e = applyEffect(entity(), makeEffect());
    const effects = getActiveEffects(e);
    expect(effects).toHaveLength(1);
    expect(effects).not.toBe(e.statusEffects);
  });

  it('returns empty array when no effects', () => {
    expect(getActiveEffects(entity())).toEqual([]);
  });
});

describe('tickEffects', () => {
  it('decrements duration by 1', () => {
    const e = applyEffect(entity(), makeEffect({ duration: 3 }));
    const { entityState } = tickEffects(e);
    expect(entityState.statusEffects[0].duration).toBe(2);
  });

  it('removes effects when duration reaches 0', () => {
    const e = applyEffect(entity(), makeEffect({ duration: 1 }));
    const { entityState, expiredEffects } = tickEffects(e);
    expect(entityState.statusEffects).toHaveLength(0);
    expect(expiredEffects).toHaveLength(1);
  });

  it('applies DOT damage (poison)', () => {
    const e = applyEffect(entity({ hp: 100 }), makeEffect({ type: 'poison', value: 15, duration: 2 }));
    const { entityState, damageDealt } = tickEffects(e);
    expect(damageDealt).toBe(15);
    expect(entityState.hp).toBe(85);
  });

  it('returns list of expired effects', () => {
    const e = applyEffect(entity(), makeEffect({ duration: 1 }));
    const { expiredEffects } = tickEffects(e);
    expect(expiredEffects).toHaveLength(1);
    expect(expiredEffects[0].type).toBe('poison');
  });
});

describe('getEffectModifier', () => {
  it('sums all active modifiers for a type', () => {
    let e = entity();
    e = applyEffect(e, makeEffect({ type: 'defense', value: 5, duration: 2 }));
    e = applyEffect(e, makeEffect({ type: 'defense', value: 10, duration: 2 }));
    expect(getEffectModifier(e, 'defense')).toBe(15);
  });

  it('returns 0 when no effects of that type', () => {
    expect(getEffectModifier(entity(), 'defense')).toBe(0);
  });
});

describe('removeEffect', () => {
  it('removes all effects of a given type', () => {
    let e = entity();
    e = applyEffect(e, makeEffect({ type: 'slow', duration: 2 }));
    e = applyEffect(e, makeEffect({ type: 'poison', duration: 2 }));
    const result = removeEffect(e, 'slow');
    expect(result.statusEffects.every(x => x.type !== 'slow')).toBe(true);
    expect(result.statusEffects.some(x => x.type === 'poison')).toBe(true);
  });
});

describe('removeEffectById', () => {
  it('removes only the matching effect', () => {
    let e = applyEffect(entity(), makeEffect({ duration: 2 }));
    const id = e.statusEffects[0].id;
    e = applyEffect(e, makeEffect({ type: 'slow', duration: 2 }));
    const result = removeEffectById(e, id);
    expect(result.statusEffects).toHaveLength(1);
    expect(result.statusEffects[0].type).toBe('slow');
  });
});

describe('clearAllEffects', () => {
  it('removes all effects', () => {
    let e = entity();
    e = applyEffect(e, makeEffect());
    e = applyEffect(e, makeEffect({ type: 'slow' }));
    expect(clearAllEffects(e).statusEffects).toHaveLength(0);
  });
});

describe('serialize / deserialize', () => {
  it('round-trip preserves all data', () => {
    let e = applyEffect(entity(), makeEffect({ value: 7, duration: 4 }));
    const encoded = serialize(e);
    const decoded = deserialize(encoded);
    expect(decoded).toEqual(e);
  });
});
