/**
 * CampaignCompiler — Claude API integration for blueprint generation
 * Only used during pre-game campaign compilation, never during runtime.
 *
 * API key is read from the environment at call time:
 *   import.meta.env.VITE_CLAUDE_API_KEY
 *
 * Set VITE_CLAUDE_API_KEY in a local .env file (see .env.example).
 * Never commit the .env file to source control.
 */

const API_KEY = () => import.meta.env.VITE_CLAUDE_API_KEY

/**
 * Compile raw campaign data into a full session-ready blueprint using Claude API.
 * @param {object} rawData - Partial or full campaign data
 * @param {string} [apiKey] - Override API key (defaults to VITE_CLAUDE_API_KEY env var)
 * @returns {Promise<{ blueprint: object|null, errors: string[] }>}
 */
export async function compileCampaign(rawData, apiKey) {
  const key = apiKey ?? API_KEY()
  if (!key) {
    return { blueprint: null, errors: ['VITE_CLAUDE_API_KEY is not set'] }
  }
  // TODO: Implement in Phase 5
  throw new Error('CampaignCompiler.compileCampaign not yet implemented');
}

/**
 * Validate and expand partial blueprint data without AI.
 * @param {object} partialBlueprint
 * @returns {{ blueprint: object|null, errors: string[] }}
 */
export function compileDirect(partialBlueprint) {
  // TODO: Implement in Phase 5
  throw new Error('CampaignCompiler.compileDirect not yet implemented');
}
