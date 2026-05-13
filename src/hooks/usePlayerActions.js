// V2 M3: derive the action menu for a player from their class + blueprint.
// Pure-ish hook (only React state it touches is the GameContext snapshot).
// Returns an array of action descriptors that ActionOverlay renders.
//
// Action descriptor shape:
//   { id, label, kind, targetType, range, requiresRoll, classOnly?, payload? }
//   - kind:       'attack' | 'move' | 'search' | 'searchFlora' | 'setTrap'
//                 | 'heal' | 'ability' | 'retreat' | 'flee' | 'endTurn'
//   - targetType: 'enemy' | 'ally' | 'anchor' | 'zone' | null
//   - requiresRoll: when true, the dispatcher must call DiceSystem before
//     handing the payload to the engine reducer.

import { useGameContext } from '@context/GameContext.jsx';

const UNIVERSAL_ACTIONS = (blueprint) => [
  {
    id: 'attack',
    label: 'Attack',
    kind: 'attack',
    targetType: 'enemy',
    range: blueprint?.settings?.attackRange ?? 30,
    requiresRoll: true,
  },
  {
    id: 'move',
    label: 'Move',
    kind: 'move',
    targetType: 'anchor',
    range: Infinity,
    requiresRoll: false,
  },
  {
    id: 'search',
    label: 'Search Zone',
    kind: 'search',
    targetType: null,
    requiresRoll: true,
  },
  {
    id: 'searchFlora',
    label: 'Search Flora',
    kind: 'searchFlora',
    targetType: null,
    requiresRoll: true,
  },
  {
    id: 'retreat',
    label: 'Retreat',
    kind: 'retreat',
    targetType: null,
    requiresRoll: true,
  },
  {
    id: 'endTurn',
    label: 'End Turn',
    kind: 'endTurn',
    targetType: null,
    requiresRoll: false,
  },
];

const CLASS_ACTIONS = {
  trapper: (player, blueprint) => [
    {
      id: 'setTrap',
      label: 'Set Trap',
      kind: 'setTrap',
      targetType: null, // trap type chosen via a sub-picker; M3 ships with default
      requiresRoll: true,
      classOnly: 'trapper',
    },
    {
      id: 'ability:snare',
      label: player.specialAbility?.name ?? 'Snare',
      kind: 'ability',
      targetType: 'enemy',
      range: 30,
      requiresRoll: true,
      classOnly: 'trapper',
    },
  ],
  medic: (player) => [
    {
      id: 'ability:heal',
      label: player.specialAbility?.name ?? 'Field Heal',
      kind: 'heal',
      targetType: 'ally',
      range: 20,
      requiresRoll: true,
      classOnly: 'medic',
    },
  ],
  support: (player) => [
    {
      id: 'ability:shield',
      label: player.specialAbility?.name ?? 'Deploy Shield',
      kind: 'ability',
      targetType: 'zone', // applies to player's current zone — auto-selected
      range: 0,
      requiresRoll: true,
      classOnly: 'support',
    },
  ],
  // assault has no manual ability (Momentum Strike is a passive trigger).
  assault: () => [],
};

/**
 * Hook: get the action menu for the given player.
 * Returns [] when the player or blueprint isn't loaded yet.
 */
export function usePlayerActions(playerId) {
  const { state } = useGameContext();
  const player = state?.players?.[playerId];
  const blueprint = state?.blueprint;
  if (!player || !blueprint) return [];

  const classActions = CLASS_ACTIONS[player.classId];
  const extras = classActions ? classActions(player, blueprint) : [];
  // Insert class extras after Attack but before Search/EndTurn for readability.
  const universal = UNIVERSAL_ACTIONS(blueprint);
  const head = universal.slice(0, 2); // Attack, Move
  const tail = universal.slice(2);    // Search, SearchFlora, Retreat, EndTurn
  return [...head, ...extras, ...tail];
}
