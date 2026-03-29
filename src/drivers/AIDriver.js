/**
 * AIDriver — LLM-powered GM implementation
 * Uses external API (Claude, OpenAI, or compatible) for dynamic narration and tactics.
 * Falls back to ScriptedDriver behavior if API call fails.
 */

import { selectBossAction as scriptedSelectBossAction, getNarrative as scriptedGetNarrative } from './ScriptedDriver.js';
import { DEFAULT_AI_MODEL } from '@utils/constants.js';

/**
 * Create an AI Driver instance with the given API configuration.
 * @param {object} config - { apiKey, endpoint, model }
 * @returns {object} Driver instance
 */
export function createAIDriver(config = {}) {
  return {
    selectBossAction: (gameState, blueprint) => selectBossAction(gameState, blueprint, config),
    getNarrative: (trigger, gameState, blueprint) => getNarrative(trigger, gameState, blueprint, config),
    selectTarget: async (strategy, players) => {
      const { selectTarget } = await import('@engine/BehaviorTree.js');
      return selectTarget(strategy, players);
    },
  };
}

/**
 * Use AI to select a boss action based on full game context.
 * Falls back to scripted driver if API call fails.
 * @param {object} gameState
 * @param {object} blueprint
 * @param {object} config - { apiKey, endpoint, model }
 * @returns {Promise<{ action: string, target: string|null, params: object }>}
 */
export async function selectBossAction(gameState, blueprint, config) {
  if (!config.apiKey) {
    return scriptedSelectBossAction(gameState, blueprint);
  }

  try {
    const prompt = buildActionPrompt(gameState, blueprint);
    const response = await callAI(prompt, config);
    const parsed = parseActionResponse(response, gameState);
    if (parsed) return parsed;
  } catch (err) {
    console.warn('AIDriver: API call failed, falling back to scripted', err.message);
  }

  return scriptedSelectBossAction(gameState, blueprint);
}

/**
 * Use AI to generate dynamic narrative for an event.
 * Falls back to blueprint narrative if API call fails.
 * @param {string} trigger
 * @param {object} gameState
 * @param {object} blueprint
 * @param {object} config
 * @returns {Promise<string>}
 */
export async function getNarrative(trigger, gameState, blueprint, config) {
  if (!config.apiKey) {
    return scriptedGetNarrative(trigger, gameState, blueprint);
  }

  try {
    const prompt = buildNarrativePrompt(trigger, gameState, blueprint);
    const narrative = await callAI(prompt, config);
    if (narrative && narrative.trim()) return narrative.trim();
  } catch (err) {
    console.warn('AIDriver: Narrative API call failed, falling back to scripted', err.message);
  }

  return scriptedGetNarrative(trigger, gameState, blueprint);
}

function buildActionPrompt(gameState, blueprint) {
  const { boss, players } = gameState;
  const alivePlayers = Object.values(players).filter(p => p.alive);
  return `You are the Game Master for "${blueprint.meta.title}".
The boss "${boss.name}" (Stage ${boss.currentStage + 1}, HP: ${boss.hp}/${boss.maxHp}) is taking its turn.
Alive players: ${alivePlayers.map(p => `${p.name} (HP: ${p.hp}/${p.maxHp}, Zone: ${p.zone})`).join(', ')}.
Choose the boss action: attack, aoe_attack, burrow, grab, or dodge.
If attacking, specify a target player name.
Respond in JSON: {"action": "attack", "target": "PlayerName", "params": {}}`;
}

function buildNarrativePrompt(trigger, gameState, blueprint) {
  const { boss } = gameState;
  return `You are the Game Master for "${blueprint.meta.title}".
Event: ${trigger}. Boss: ${boss?.name} Stage ${(boss?.currentStage || 0) + 1}.
Write 1-2 sentences of dramatic game master narration for this event. Be vivid and tense.`;
}

async function callAI(prompt, config) {
  const endpoint = config.endpoint || 'https://api.anthropic.com/v1/messages';
  const model = config.model || DEFAULT_AI_MODEL;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  return data.content?.[0]?.text || '';
}

function parseActionResponse(text, gameState) {
  try {
    const json = JSON.parse(text);
    if (json.action) {
      const alivePlayers = Object.values(gameState.players).filter(p => p.alive);
      let targetId = null;
      if (json.target) {
        const targetPlayer = alivePlayers.find(p =>
          p.name.toLowerCase() === json.target.toLowerCase()
        );
        targetId = targetPlayer?.id || alivePlayers[0]?.id || null;
      } else if (json.action === 'attack') {
        targetId = alivePlayers[0]?.id || null;
      }
      return { action: json.action, target: targetId, params: json.params || {} };
    }
  } catch { /* ignore parse errors */ }
  return null;
}
