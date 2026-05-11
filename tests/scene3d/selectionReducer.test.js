import { describe, it, expect } from 'vitest';
import {
  selectionReducer,
  initialSelectionState,
  SELECTION_PHASE,
  SELECTION_ACTIONS,
} from '../../src/scene3d/state/selectionReducer.js';

const BOW_SHOT = { id: 'bow_shot', label: 'Bow Shot', range: 30 };

describe('selectionReducer', () => {
  describe('SELECT_MINI', () => {
    it('moves IDLE → MINI_SELECTED with the mini id', () => {
      const next = selectionReducer(initialSelectionState, {
        type: SELECTION_ACTIONS.SELECT_MINI,
        miniId: 'p1',
      });
      expect(next.phase).toBe(SELECTION_PHASE.MINI_SELECTED);
      expect(next.selectedMiniId).toBe('p1');
      expect(next.selectedAction).toBeNull();
      expect(next.hoveredTargetId).toBeNull();
    });

    it('returns the same state when re-selecting the already-selected mini', () => {
      const a = selectionReducer(initialSelectionState, {
        type: SELECTION_ACTIONS.SELECT_MINI, miniId: 'p1',
      });
      const b = selectionReducer(a, {
        type: SELECTION_ACTIONS.SELECT_MINI, miniId: 'p1',
      });
      expect(b).toBe(a);
    });

    it('resets phase + action + hover when switching to a different mini', () => {
      let s = selectionReducer(initialSelectionState, {
        type: SELECTION_ACTIONS.SELECT_MINI, miniId: 'p1',
      });
      s = selectionReducer(s, { type: SELECTION_ACTIONS.SET_ACTION, action: BOW_SHOT });
      s = selectionReducer(s, { type: SELECTION_ACTIONS.HOVER_TARGET, targetId: 'boss' });
      const next = selectionReducer(s, {
        type: SELECTION_ACTIONS.SELECT_MINI, miniId: 'p2',
      });
      expect(next.selectedMiniId).toBe('p2');
      expect(next.phase).toBe(SELECTION_PHASE.MINI_SELECTED);
      expect(next.selectedAction).toBeNull();
      expect(next.hoveredTargetId).toBeNull();
    });
  });

  describe('SET_ACTION', () => {
    it('moves MINI_SELECTED → ACTION_PICKING', () => {
      const a = selectionReducer(initialSelectionState, {
        type: SELECTION_ACTIONS.SELECT_MINI, miniId: 'p1',
      });
      const b = selectionReducer(a, {
        type: SELECTION_ACTIONS.SET_ACTION, action: BOW_SHOT,
      });
      expect(b.phase).toBe(SELECTION_PHASE.ACTION_PICKING);
      expect(b.selectedAction).toEqual(BOW_SHOT);
    });

    it('null action backs out of ACTION_PICKING to MINI_SELECTED', () => {
      let s = selectionReducer(initialSelectionState, {
        type: SELECTION_ACTIONS.SELECT_MINI, miniId: 'p1',
      });
      s = selectionReducer(s, { type: SELECTION_ACTIONS.SET_ACTION, action: BOW_SHOT });
      s = selectionReducer(s, { type: SELECTION_ACTIONS.SET_ACTION, action: null });
      expect(s.phase).toBe(SELECTION_PHASE.MINI_SELECTED);
      expect(s.selectedAction).toBeNull();
    });

    it('is a no-op when no mini is selected', () => {
      const next = selectionReducer(initialSelectionState, {
        type: SELECTION_ACTIONS.SET_ACTION, action: BOW_SHOT,
      });
      expect(next).toBe(initialSelectionState);
    });
  });

  describe('HOVER_TARGET', () => {
    it('only updates during ACTION_PICKING', () => {
      const idle = selectionReducer(initialSelectionState, {
        type: SELECTION_ACTIONS.HOVER_TARGET, targetId: 'boss',
      });
      expect(idle.hoveredTargetId).toBeNull();

      let s = selectionReducer(initialSelectionState, {
        type: SELECTION_ACTIONS.SELECT_MINI, miniId: 'p1',
      });
      const stillNoHover = selectionReducer(s, {
        type: SELECTION_ACTIONS.HOVER_TARGET, targetId: 'boss',
      });
      expect(stillNoHover.hoveredTargetId).toBeNull();

      s = selectionReducer(s, { type: SELECTION_ACTIONS.SET_ACTION, action: BOW_SHOT });
      const hovered = selectionReducer(s, {
        type: SELECTION_ACTIONS.HOVER_TARGET, targetId: 'boss',
      });
      expect(hovered.hoveredTargetId).toBe('boss');
    });

    it('returns the same state when hovering the same target', () => {
      let s = selectionReducer(initialSelectionState, {
        type: SELECTION_ACTIONS.SELECT_MINI, miniId: 'p1',
      });
      s = selectionReducer(s, { type: SELECTION_ACTIONS.SET_ACTION, action: BOW_SHOT });
      const a = selectionReducer(s, {
        type: SELECTION_ACTIONS.HOVER_TARGET, targetId: 'boss',
      });
      const b = selectionReducer(a, {
        type: SELECTION_ACTIONS.HOVER_TARGET, targetId: 'boss',
      });
      expect(b).toBe(a);
    });

    it('null clears hovered target', () => {
      let s = selectionReducer(initialSelectionState, {
        type: SELECTION_ACTIONS.SELECT_MINI, miniId: 'p1',
      });
      s = selectionReducer(s, { type: SELECTION_ACTIONS.SET_ACTION, action: BOW_SHOT });
      s = selectionReducer(s, { type: SELECTION_ACTIONS.HOVER_TARGET, targetId: 'boss' });
      const cleared = selectionReducer(s, {
        type: SELECTION_ACTIONS.HOVER_TARGET, targetId: null,
      });
      expect(cleared.hoveredTargetId).toBeNull();
    });
  });

  describe('COMMIT_TARGET', () => {
    it('stages pendingAttack and returns to IDLE', () => {
      let s = selectionReducer(initialSelectionState, {
        type: SELECTION_ACTIONS.SELECT_MINI, miniId: 'p1',
      });
      s = selectionReducer(s, { type: SELECTION_ACTIONS.SET_ACTION, action: BOW_SHOT });
      s = selectionReducer(s, { type: SELECTION_ACTIONS.HOVER_TARGET, targetId: 'boss' });
      const committed = selectionReducer(s, {
        type: SELECTION_ACTIONS.COMMIT_TARGET, targetId: 'boss',
      });
      expect(committed.phase).toBe(SELECTION_PHASE.IDLE);
      expect(committed.selectedMiniId).toBeNull();
      expect(committed.selectedAction).toBeNull();
      expect(committed.hoveredTargetId).toBeNull();
      expect(committed.pendingAttack).toEqual({
        attackerId: 'p1',
        targetId: 'boss',
        action: BOW_SHOT,
      });
    });

    it('is a no-op outside ACTION_PICKING', () => {
      const next = selectionReducer(initialSelectionState, {
        type: SELECTION_ACTIONS.COMMIT_TARGET, targetId: 'boss',
      });
      expect(next).toBe(initialSelectionState);
      expect(next.pendingAttack).toBeNull();
    });
  });

  describe('CLEAR', () => {
    it('drops selection but preserves pendingAttack', () => {
      let s = selectionReducer(initialSelectionState, {
        type: SELECTION_ACTIONS.SELECT_MINI, miniId: 'p1',
      });
      s = selectionReducer(s, { type: SELECTION_ACTIONS.SET_ACTION, action: BOW_SHOT });
      s = selectionReducer(s, { type: SELECTION_ACTIONS.COMMIT_TARGET, targetId: 'boss' });
      // After commit, suppose the consumer hasn't drained yet; another CLEAR
      // shouldn't lose the pending event.
      const cleared = selectionReducer(s, { type: SELECTION_ACTIONS.CLEAR });
      expect(cleared.phase).toBe(SELECTION_PHASE.IDLE);
      expect(cleared.pendingAttack).toEqual(s.pendingAttack);
    });

    it('clears mid-flight selection', () => {
      let s = selectionReducer(initialSelectionState, {
        type: SELECTION_ACTIONS.SELECT_MINI, miniId: 'p1',
      });
      s = selectionReducer(s, { type: SELECTION_ACTIONS.SET_ACTION, action: BOW_SHOT });
      const cleared = selectionReducer(s, { type: SELECTION_ACTIONS.CLEAR });
      expect(cleared.phase).toBe(SELECTION_PHASE.IDLE);
      expect(cleared.selectedMiniId).toBeNull();
      expect(cleared.selectedAction).toBeNull();
    });
  });

  describe('unknown actions', () => {
    it('returns the same state', () => {
      const s = selectionReducer(initialSelectionState, { type: 'NOPE' });
      expect(s).toBe(initialSelectionState);
    });
  });
});
