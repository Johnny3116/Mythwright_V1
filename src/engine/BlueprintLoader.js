/**
 * BlueprintLoader — Validates and parses campaign JSON
 */

/**
 * Load and validate a campaign blueprint from a JSON object.
 * @param {object} rawJson - Parsed JSON from campaign file
 * @returns {{ blueprint: object|null, errors: string[] }}
 */
export function loadBlueprint(rawJson) {
  // TODO: Implement in Phase 2
  throw new Error('BlueprintLoader.loadBlueprint not yet implemented');
}

/**
 * Validate the blueprint schema and return any validation errors.
 * @param {object} blueprint
 * @returns {string[]} Array of error messages (empty if valid)
 */
export function validateBlueprint(blueprint) {
  // TODO: Implement in Phase 2
  throw new Error('BlueprintLoader.validateBlueprint not yet implemented');
}

/**
 * Load blueprint from a File object (for drag-drop upload).
 * @param {File} file
 * @returns {Promise<{ blueprint: object|null, errors: string[] }>}
 */
export async function loadBlueprintFromFile(file) {
  // TODO: Implement in Phase 2
  throw new Error('BlueprintLoader.loadBlueprintFromFile not yet implemented');
}

/**
 * Load the bundled default campaign blueprint.
 * @returns {Promise<{ blueprint: object|null, errors: string[] }>}
 */
export async function loadDefaultBlueprint() {
  // TODO: Implement in Phase 2
  throw new Error('BlueprintLoader.loadDefaultBlueprint not yet implemented');
}
