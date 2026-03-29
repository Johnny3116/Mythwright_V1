/**
 * GameEngine — Core state machine and game loop
 *
 * States: LOBBY → CHARACTER_SELECT → GAME_SETUP → TURN_LOOP → GAME_OVER
 */

import { resolveCombat } from './CombatResolver.js';
import { rollD20, rollInRange } from './DiceSystem.js';
import { checkEvolutionThreshold, applyEvolution, getEvolutionNarrative } from './EvolutionSystem.js';
import { initializeTurnOrder, advanceTurn, getActiveEntity } from './TurnManager.js';
import { applyEffect, tickEffects } from './StatusEffects.js';
import { placeTrap, checkTrapTrigger, deactivateTrap, getAvailableTrapTypes } from './TrapSystem.js';
import { processBossHunt } from './WildlifeSystem.js';
import { spawnFlora, relocateFlora, searchFlora } from './FloraSystem.js';
import { resolveRetreatLegacy } from './RetreatSystem.js';
import { evaluateBehaviorTree } from './BehaviorTree.js';

export const GameState = {
  LOBBY: 'LOBBY',
  CHARACTER_SELECT: 'CHARACTER_SELECT',
  GAME_SETUP: 'GAME_SETUP',
  TURN_LOOP: 'TURN_LOOP',
  GAME_OVER: 'GAME_OVER',
};

export const TurnPhase = {
  PLAYER_TURN: 'PLAYER_TURN',
  BOSS_TURN: 'BOSS_TURN',
  ENVIRONMENT: 'ENVIRONMENT',
  CHECK_WIN: 'CHECK_WIN',
  NEXT_ROUND: 'NEXT_ROUND',
};

export const ActionTypes = {
  // Lobby / setup
  SET_BLUEPRINT: 'SET_BLUEPRINT',
  SET_GM_MODE: 'SET_GM_MODE',
  START_CHARACTER_SELECT: 'START_CHARACTER_SELECT',
  PLAYER_REGISTER: 'PLAYER_REGISTER',
  PLAYER_SELECT_CLASS: 'PLAYER_SELECT_CLASS',
  START_GAME: 'START_GAME',

  // In-game player actions
  PLAYER_ATTACK: 'PLAYER_ATTACK',
  PLAYER_USE_ABILITY: 'PLAYER_USE_ABILITY',
  PLAYER_SET_TRAP: 'PLAYER_SET_TRAP',
  PLAYER_RETREAT: 'PLAYER_RETREAT',
  PLAYER_SEARCH_FLORA: 'PLAYER_SEARCH_FLORA',
  PLAYER_MOVE: 'PLAYER_MOVE',
  PLAYER_END_TURN: 'PLAYER_END_TURN',

  // Boss actions
  BOSS_ATTACK: 'BOSS_ATTACK',
  BOSS_AOE_ATTACK: 'BOSS_AOE_ATTACK',
  BOSS_BURROW: 'BOSS_BURROW',
  BOSS_GRAB: 'BOSS_GRAB',
  BOSS_DODGE: 'BOSS_DODGE',
  BOSS_END_TURN: 'BOSS_END_TURN',

  // Environment phase
  RUN_ENVIRONMENT: 'RUN_ENVIRONMENT',

  // Phase / round control
  ADVANCE_PHASE: 'ADVANCE_PHASE',

  // Win/Lose
  SET_GAME_OVER: 'SET_GAME_OVER',

  // Save/Load
  LOAD_STATE: 'LOAD_STATE',

  // Narrator
  ADD_NARRATIVE: 'ADD_NARRATIVE',

  // Dice animation
  SET_ROLL_RESULT: 'SET_ROLL_RESULT',
};

/**
 * Create initial boss state from blueprint.
 */
function createBossState(blueprint) {
  const boss = blueprint.enemies.boss;
  const stage0 = boss.stages[0];
  return {
    id: boss.id,
    name: boss.name,
    currentStage: 0,
    hp: stage0.maxHp,
    maxHp: stage0.maxHp,
    damage: stage0.damage,
    defense: stage0.defense,
    zone: blueprint.zones[0]?.id || null,
    statusEffects: [],
    hasActedThisTurn: false,
    isBurrowed: false,
    alive: true,
  };
}

/**
 * Create the initial game state from a parsed blueprint.
 * @param {object} blueprint - Parsed campaign blueprint
 * @returns {object} Initial game state
 */
export function createInitialState(blueprint) {
  const bossState = createBossState(blueprint);
  const floraState = spawnFlora(blueprint.zones, blueprint.systems?.flora?.plants ?? []);

  return {
    phase: GameState.LOBBY,
    turnPhase: null,
    turnState: null,
    round: 0,
    blueprint,
    gmMode: 'scripted',
    players: {},     // keyed by peerId
    playerOrder: [], // array of peerIds in turn order
    boss: bossState,
    placedTraps: [],
    floraState,
    narrativeLog: [],
    lastRoll: null,
    gameOverResult: null,
    pendingBossAction: null,
    isEvolving: false,
  };
}

/**
 * Create initial player state from blueprint class data.
 */
export function createPlayerState(peerId, playerName, classId, blueprint) {
  const cls = blueprint.classes.find(c => c.id === classId);
  if (!cls) throw new Error(`Unknown class: ${classId}`);
  const { hp, damage, defense } = cls.baseStats;
  return {
    id: peerId,
    name: playerName,
    classId,
    className: cls.name,
    classIcon: cls.icon,
    hp,
    maxHp: hp,
    damage,
    defense,
    specialAbility: { ...cls.specialAbility, cooldown: 0, used: false },
    zone: blueprint.zones[0]?.id || null,
    inventory: [],
    statusEffects: [],
    consecutiveHits: 0,
    damageDealt: 0,
    alive: true,
    ready: false,
    isHost: false,
  };
}

/**
 * Add a narrative entry to the log.
 */
function addNarrative(state, text) {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return {
    ...state,
    narrativeLog: [
      ...state.narrativeLog,
      { id: `${Date.now()}-${arr[0]}`, text, timestamp: Date.now() },
    ],
  };
}

/**
 * Apply damage to boss and check for evolution.
 */
function applyDamageToBoss(state, damage) {
  const newHp = Math.max(0, state.boss.hp - damage);
  const updatedBoss = { ...state.boss, hp: newHp };
  const alive = newHp > 0;
  return { ...state, boss: { ...updatedBoss, alive } };
}

/**
 * Apply damage to a player.
 */
function applyDamageToPlayer(state, playerId, damage) {
  const player = state.players[playerId];
  if (!player) return state;
  const newHp = Math.max(0, player.hp - damage);
  const alive = newHp > 0;
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: { ...player, hp: newHp, alive },
    },
  };
}

/**
 * Apply healing to a player.
 */
function applyHealToPlayer(state, playerId, amount) {
  const player = state.players[playerId];
  if (!player) return state;
  const newHp = Math.min(player.maxHp, player.hp + amount);
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: { ...player, hp: newHp },
    },
  };
}

/**
 * Check win/lose conditions against current state.
 * @param {object} state
 * @param {object} blueprint
 * @returns {{ over: boolean, winner: 'players'|'boss'|null, condition: string|null }}
 */
export function checkWinConditions(state, blueprint) {
  const { boss, players } = state;
  const stages = blueprint.enemies.boss.stages;

  // Check lose conditions
  for (const condition of blueprint.loseConditions || []) {
    if (condition.type === 'allPlayersDead') {
      const allDead = Object.values(players).every(p => !p.alive || p.hp <= 0);
      if (allDead && Object.keys(players).length > 0) {
        return { over: true, winner: 'boss', condition: 'allPlayersDead' };
      }
    }
  }

  // Check win conditions
  for (const condition of blueprint.winConditions || []) {
    if (condition.type === 'bossDefeated') {
      const isFinal = boss.currentStage >= stages.length - 1;
      if (isFinal && boss.hp <= 0) {
        return { over: true, winner: 'players', condition: 'bossDefeated' };
      }
    }
  }

  return { over: false, winner: null, condition: null };
}

/**
 * Main state reducer — pure function.
 * @param {object} state - Current game state
 * @param {object} action - { type, payload }
 * @returns {object} New game state
 */
export function gameReducer(state, action) {
  switch (action.type) {
    case ActionTypes.LOAD_STATE:
      return { ...action.payload };

    case ActionTypes.SET_BLUEPRINT: {
      return { ...state, blueprint: action.payload.blueprint };
    }

    case ActionTypes.SET_GM_MODE:
      return { ...state, gmMode: action.payload.mode };

    case ActionTypes.ADD_NARRATIVE:
      return addNarrative(state, action.payload.text);

    case ActionTypes.SET_ROLL_RESULT:
      return { ...state, lastRoll: action.payload };

    case ActionTypes.START_CHARACTER_SELECT:
      return { ...state, phase: GameState.CHARACTER_SELECT };

    case ActionTypes.PLAYER_REGISTER: {
      const { peerId, playerName, isHost } = action.payload;
      const existing = state.players[peerId] || {};
      return {
        ...state,
        players: {
          ...state.players,
          [peerId]: {
            ...existing,
            id: peerId,
            name: playerName || existing.name || 'Unnamed',
            isHost: isHost || false,
            ready: false,
            hp: existing.hp || 100,
            maxHp: existing.maxHp || 100,
            alive: true,
          },
        },
      };
    }

    case ActionTypes.PLAYER_SELECT_CLASS: {
      const { peerId, classId, playerName } = action.payload;
      const blueprint = state.blueprint;
      if (!blueprint) return state;
      try {
        const playerState = createPlayerState(peerId, playerName, classId, blueprint);
        return {
          ...state,
          players: { ...state.players, [peerId]: { ...playerState, ready: true } },
        };
      } catch {
        return state;
      }
    }

    case ActionTypes.START_GAME: {
      const { blueprint } = state;
      if (!blueprint) return state;
      const playerList = Object.values(state.players);
      const turnState = initializeTurnOrder(playerList.map((p) => p.id));
      const bossState = createBossState(blueprint);
      const floraState = spawnFlora(blueprint.zones, blueprint.systems?.flora?.plants ?? []);

      let newState = {
        ...state,
        phase: GameState.TURN_LOOP,
        turnPhase: TurnPhase.PLAYER_TURN,
        turnState,
        round: 1,
        playerOrder: playerList.map(p => p.id),
        boss: bossState,
        placedTraps: [],
        floraState,
        narrativeLog: [],
        gameOverResult: null,
        isEvolving: false,
      };
      newState = addNarrative(newState, blueprint.narrative?.intro || 'The hunt begins!');
      return newState;
    }

    case ActionTypes.PLAYER_ATTACK: {
      const { playerId, roll } = action.payload;
      const player = state.players[playerId];
      const { boss, blueprint } = state;
      if (!player || !boss || !blueprint) return state;

      const settings = {
        hitRanges: blueprint.settings.hitRanges,
        critMultiplier: blueprint.settings.critMultiplier || 2.0,
      };
      const result = resolveCombat(player, boss, roll, settings);
      let newState = { ...state, lastRoll: { roll, result } };

      if (result.hit) {
        newState = applyDamageToBoss(newState, result.damageDealt);
        // Track consecutive hits
        const newConsec = player.consecutiveHits + 1;
        const newDamageDealt = (player.damageDealt || 0) + result.damageDealt;
        newState = {
          ...newState,
          players: {
            ...newState.players,
            [playerId]: {
              ...newState.players[playerId],
              consecutiveHits: newConsec,
              damageDealt: newDamageDealt,
            },
          },
        };
      } else {
        // Reset consecutive hits on miss
        newState = {
          ...newState,
          players: {
            ...newState.players,
            [playerId]: { ...newState.players[playerId], consecutiveHits: 0 },
          },
        };
      }

      newState = addNarrative(newState, `${player.name} attacks! ${result.narrative}`);

      // Check evolution
      const evo = checkEvolutionThreshold(newState.boss, blueprint.enemies.boss.stages);
      if (evo.shouldEvolve) {
        const nextStage = blueprint.enemies.boss.stages[evo.nextStageIndex];
        const evoNarrative = getEvolutionNarrative(evo.nextStageIndex, blueprint.narrative);
        newState = {
          ...newState,
          boss: applyEvolution(newState.boss, nextStage),
          isEvolving: true,
        };
        newState = addNarrative(newState, evoNarrative);
      } else {
        newState = { ...newState, isEvolving: false };
      }

      return newState;
    }

    case ActionTypes.PLAYER_USE_ABILITY: {
      const { playerId, targetId, roll } = action.payload;
      const player = state.players[playerId];
      const { blueprint } = state;
      if (!player || !blueprint) return state;

      const ability = player.specialAbility;
      if (!ability) return state;

      let newState = { ...state };
      const effect = ability.effect;

      if (effect.type === 'heal' && targetId) {
        newState = applyHealToPlayer(newState, targetId, effect.value || 25);
        const targetPlayer = newState.players[targetId];
        newState = addNarrative(
          newState,
          `${player.name} uses ${ability.name} on ${targetPlayer?.name || targetId}, healing ${effect.value} HP!`
        );
      } else if (effect.type === 'damageMultiplier' && player.consecutiveHits >= (ability.triggerValue || 3)) {
        // Assault Momentum Strike — apply buff
        newState = {
          ...newState,
          players: {
            ...newState.players,
            [playerId]: {
              ...newState.players[playerId],
              specialAbility: { ...ability, cooldown: effect.duration || 1 },
            },
          },
        };
        newState = addNarrative(newState, `${player.name} activates ${ability.name}! Damage boosted for ${effect.duration} turns!`);
      } else if (effect.type === 'immobilize') {
        // Trapper Snare
        newState = {
          ...newState,
          boss: applyEffect(newState.boss, { type: 'immobilize', duration: effect.duration || 1, source: playerId }),
        };
        newState = addNarrative(newState, `${player.name} uses ${ability.name}! The boss is snared!`);
      } else if (effect.type === 'damageReduction') {
        // Support Shield — apply to zone players
        const zonePlayerIds = Object.values(newState.players)
          .filter(p => p.zone === player.zone && p.alive)
          .map(p => p.id);
        for (const pid of zonePlayerIds) {
          newState = {
            ...newState,
            players: {
              ...newState.players,
              [pid]: applyEffect(newState.players[pid], {
                type: 'damageReduction',
                value: effect.value,
                duration: effect.duration || 2,
                modifierType: 'defense',
                source: playerId,
              }),
            },
          };
        }
        newState = addNarrative(newState, `${player.name} deploys a shield protecting everyone in the zone for ${effect.duration} turns!`);
      } else {
        newState = addNarrative(newState, `${player.name} uses ${ability.name}! (roll: ${roll})`);
      }

      return newState;
    }

    case ActionTypes.PLAYER_SET_TRAP: {
      const { playerId, trapTypeId, roll } = action.payload;
      const player = state.players[playerId];
      const { blueprint } = state;
      if (!player || !blueprint) return state;

      const trapTypes = getAvailableTrapTypes(blueprint);
      const trapType = trapTypes.find(t => t.id === trapTypeId);
      if (!trapType) return state;

      const zone = blueprint.zones.find(z => z.id === player.zone);
      const { success, trapState, narrative } = placeTrap(trapType, player.zone, roll, zone);

      let newState = addNarrative(state, narrative);
      if (success) {
        newState = { ...newState, placedTraps: [...newState.placedTraps, trapState] };
      }
      return newState;
    }

    case ActionTypes.PLAYER_RETREAT: {
      const { playerId, roll } = action.payload;
      const player = state.players[playerId];
      const { blueprint } = state;
      if (!player || !blueprint) return state;

      const currentZone = blueprint.zones.find(z => z.id === player.zone);
      const retreatSettings = blueprint.systems?.retreat;
      const { outcome, newZoneId, narrative } = resolveRetreatLegacy(
        player, currentZone, retreatSettings, roll
      );
      // Perfect retreat grants a small heal
      const heal = outcome === 'perfect' ? 10 : 0;

      let newState = addNarrative(state, narrative);

      if (outcome !== 'fail' && newZoneId) {
        newState = {
          ...newState,
          players: {
            ...newState.players,
            [playerId]: { ...newState.players[playerId], zone: newZoneId },
          },
        };
      }

      if (heal > 0) {
        newState = applyHealToPlayer(newState, playerId, heal);
      }

      // On fail, boss gets a free attack next turn (mark player for incoming attack)
      if (outcome === 'fail') {
        newState = {
          ...newState,
          players: {
            ...newState.players,
            [playerId]: { ...newState.players[playerId], retreatFailed: true },
          },
        };
      }

      return newState;
    }

    case ActionTypes.PLAYER_SEARCH_FLORA: {
      const { playerId, roll } = action.payload;
      const player = state.players[playerId];
      const { blueprint, floraState } = state;
      if (!player || !blueprint) return state;

      const floraSettings = blueprint.systems?.flora;
      const { found, healAmount, floraType, narrative } = searchFlora(
        player, player.zone, floraState, floraSettings, roll
      );

      let newState = addNarrative(state, narrative);

      if (found && healAmount > 0) {
        newState = applyHealToPlayer(newState, playerId, healAmount);
        // Remove plant from zone after pickup
        newState = {
          ...newState,
          floraState: { ...newState.floraState, [player.zone]: null },
        };
      }

      return newState;
    }

    case ActionTypes.PLAYER_MOVE: {
      const { playerId, targetZoneId } = action.payload;
      const player = state.players[playerId];
      const { blueprint } = state;
      if (!player || !blueprint) return state;

      const currentZone = blueprint.zones.find(z => z.id === player.zone);
      const isConnected = currentZone?.connectedZones?.includes(targetZoneId);

      if (!isConnected) {
        return addNarrative(state, `${player.name} can't move there — not an adjacent zone.`);
      }

      return {
        ...state,
        players: {
          ...state.players,
          [playerId]: { ...player, zone: targetZoneId },
        },
      };
    }

    case ActionTypes.BOSS_ATTACK: {
      const { targetId, roll } = action.payload;
      const { boss, blueprint } = state;
      if (!boss || !blueprint) return state;

      const target = state.players[targetId];
      if (!target || !target.alive) return state;

      const bossHitRanges = blueprint.enemies.boss.hitRanges || blueprint.settings.hitRanges;
      const settings = {
        hitRanges: {
          ...bossHitRanges,
          critical: bossHitRanges.lethalStrike || bossHitRanges.critical,
        },
        critMultiplier: 1 + (blueprint.enemies.boss.lethalStrikeBonus || 0.5),
      };

      const result = resolveCombat(boss, target, roll, settings);
      let newState = { ...state, lastRoll: { roll, result } };

      if (result.hit) {
        let damage = result.damageDealt;
        // Apply damage reduction if player has shield
        const drEffect = target.statusEffects?.find(e => e.type === 'damageReduction');
        if (drEffect) {
          damage = Math.floor(damage * (1 - drEffect.value));
        }
        newState = applyDamageToPlayer(newState, targetId, damage);
        newState = addNarrative(newState, `${boss.name} attacks ${target.name}! ${result.critical ? 'LETHAL STRIKE! ' : ''}${damage} damage!`);
      } else {
        newState = addNarrative(newState, `${boss.name} attacks ${target.name} but misses!`);
      }

      return { ...newState, boss: { ...newState.boss, hasActedThisTurn: true } };
    }

    case ActionTypes.BOSS_AOE_ATTACK: {
      const { roll } = action.payload;
      const { boss, blueprint } = state;
      if (!boss || !blueprint) return state;

      const alivePlayers = Object.values(state.players).filter(p => p.alive);
      const bossHitRanges = blueprint.enemies.boss.hitRanges || blueprint.settings.hitRanges;
      const settings = {
        hitRanges: {
          ...bossHitRanges,
          critical: bossHitRanges.lethalStrike || bossHitRanges.critical,
        },
        critMultiplier: 1 + (blueprint.enemies.boss.lethalStrikeBonus || 0.5),
      };

      let newState = { ...state };
      let narrativeText = `${boss.name} unleashes an AOE attack on ALL players!`;

      for (const player of alivePlayers) {
        const result = resolveCombat(boss, player, roll, settings);
        if (result.hit) {
          newState = applyDamageToPlayer(newState, player.id, result.damageDealt);
          narrativeText += ` ${player.name}: ${result.damageDealt} damage.`;
        }
      }

      newState = addNarrative(newState, narrativeText);
      return { ...newState, boss: { ...newState.boss, hasActedThisTurn: true } };
    }

    case ActionTypes.BOSS_BURROW: {
      const newState = {
        ...state,
        boss: { ...state.boss, isBurrowed: true, hasActedThisTurn: true },
      };
      return addNarrative(newState, `${state.boss.name} burrows underground! It is untargetable for 1 turn.`);
    }

    case ActionTypes.BOSS_GRAB: {
      const { targetId } = action.payload;
      const target = state.players[targetId];
      if (!target) return state;

      let newState = {
        ...state,
        players: {
          ...state.players,
          [targetId]: applyEffect(target, { type: 'grabbed', duration: 1, source: 'boss' }),
        },
        boss: { ...state.boss, hasActedThisTurn: true },
      };
      return addNarrative(newState, `${state.boss.name} grabs ${target.name}! They are disabled for 1 turn!`);
    }

    case ActionTypes.BOSS_DODGE: {
      const newState = {
        ...state,
        boss: { ...state.boss, hasActedThisTurn: true },
      };
      return addNarrative(newState, `${state.boss.name} evades incoming attacks!`);
    }

    case ActionTypes.BOSS_END_TURN: {
      // Tick boss status effects
      const tickResult = tickEffects(state.boss);
      let newState = {
        ...state,
        boss: {
          ...tickResult.entityState,
          hasActedThisTurn: false,
          isBurrowed: false, // burrow expires after turn
        },
      };

      if (tickResult.damageDealt > 0) {
        newState = addNarrative(newState, `${state.boss.name} takes ${tickResult.damageDealt} from status effects.`);
      }

      return newState;
    }

    case ActionTypes.RUN_ENVIRONMENT: {
      const { blueprint, round, floraState, boss } = state;
      if (!blueprint) return state;

      let newState = { ...state };

      // Flora relocation check
      const floraSettings = blueprint.systems?.flora;
      if (floraSettings?.enabled) {
        const newFloraState = relocateFlora(floraState, blueprint.zones, round, floraSettings.respawnInterval);
        if (newFloraState !== floraState) {
          newState = { ...newState, floraState: newFloraState };
          newState = addNarrative(newState, 'The plants have relocated to new zones...');
        }
      }

      // Tick player status effects
      for (const [pid, player] of Object.entries(newState.players)) {
        if (player.alive) {
          const tickResult = tickEffects(player);
          newState = {
            ...newState,
            players: { ...newState.players, [pid]: tickResult.entityState },
          };
          if (tickResult.damageDealt > 0) {
            newState = addNarrative(newState, `${player.name} takes ${tickResult.damageDealt} damage from status effects.`);
          }
          if (!tickResult.entityState.alive || tickResult.entityState.hp <= 0) {
            newState = {
              ...newState,
              players: {
                ...newState.players,
                [pid]: { ...tickResult.entityState, alive: false },
              },
            };
          }
        }
      }

      // Wildlife encounter check — boss hunts in its zone
      if (blueprint.systems?.wildlife?.enabled) {
        const huntRoll = rollD20();
        const huntResult = processBossHunt(boss.zone, newState, blueprint, huntRoll);
        if (huntResult.hunted && huntResult.buffAmount > 0) {
          newState = {
            ...newState,
            boss: {
              ...newState.boss,
              hp: Math.min(newState.boss.maxHp, newState.boss.hp + huntResult.buffAmount),
            },
          };
          newState = addNarrative(newState, huntResult.narrative);
        }
      }

      // Trap trigger check — if boss moved to a trapped zone
      if (boss.zone) {
        const trapRoll = rollD20();
        const trapResult = checkTrapTrigger(boss.zone, newState, trapRoll);
        if (trapResult.triggered) {
          newState = applyDamageToBoss(newState, trapResult.damage);
          newState = {
            ...newState,
            placedTraps: deactivateTrap(newState.placedTraps, trapResult.trapId),
          };
          newState = addNarrative(newState, trapResult.narrative);
        }
      }

      return { ...newState, turnPhase: TurnPhase.CHECK_WIN };
    }

    case ActionTypes.ADVANCE_PHASE: {
      const { blueprint } = state;
      if (!blueprint) return state;

      const { over, winner, condition } = checkWinConditions(state, blueprint);
      if (over) {
        const isVictory = winner === 'players';
        const text = isVictory
          ? blueprint.narrative?.victoryText || 'Victory!'
          : blueprint.narrative?.defeatText || 'Defeat...';
        let newState = addNarrative(state, text);
        return {
          ...newState,
          phase: GameState.GAME_OVER,
          gameOverResult: { winner, condition },
        };
      }

      // Advance turn state
      const newTurnState = advanceTurn(
        state.turnState || initializeTurnOrder(state.playerOrder),
        state.boss.id
      );

      // Increment round if we looped back to round start
      let newRound = state.round;
      if (newTurnState.round > (state.turnState?.round || 1)) {
        newRound = newTurnState.round;
      }

      return {
        ...state,
        turnState: newTurnState,
        turnPhase: newTurnState.phase,
        round: newRound,
        boss: { ...state.boss, hasActedThisTurn: false },
      };
    }

    case ActionTypes.SET_GAME_OVER: {
      const { winner, condition } = action.payload;
      const { blueprint } = state;
      const isVictory = winner === 'players';
      const text = isVictory
        ? blueprint?.narrative?.victoryText || 'Victory!'
        : blueprint?.narrative?.defeatText || 'Defeat...';
      let newState = addNarrative(state, text);
      return {
        ...newState,
        phase: GameState.GAME_OVER,
        gameOverResult: { winner, condition },
      };
    }

    default:
      return state;
  }
}

/**
 * Serialize game state to JSON for save/resume.
 * @param {object} state
 * @returns {string} JSON string
 */
export function serializeState(state) {
  return JSON.stringify({
    ...state,
    _savedAt: Date.now(),
    _version: '1.0.0',
  });
}

/**
 * Deserialize a save file string back to game state.
 * @param {string} json
 * @returns {object}
 */
export function deserializeState(json) {
  const data = JSON.parse(json);
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid save file: not an object');
  }
  if (!data._version) {
    throw new Error('Invalid save file: missing version — file may be corrupted or from an incompatible build');
  }
  if (!data.phase || !data.players || !data.turnState) {
    throw new Error('Invalid save file: missing required fields (phase, players, turnState)');
  }
  return data;
}
