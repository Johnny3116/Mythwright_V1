/**
 * CampaignCompiler — Claude API integration for blueprint generation
 * Only used during pre-game campaign compilation, never during runtime.
 */

/**
 * Compile raw campaign data into a full session-ready blueprint using Claude API.
 * @param {object} rawData - Partial or full campaign data
 * @param {string} [apiKey] - Claude API key (falls back to VITE_CLAUDE_API_KEY env var)
 * @returns {Promise<{ blueprint: object|null, errors: string[] }>}
 */
export async function compileCampaign(rawData, apiKey) {
  const key = apiKey ?? import.meta.env.VITE_CLAUDE_API_KEY
  // TODO: Implement in Phase 5
  void key
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
