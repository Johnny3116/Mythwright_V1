/**
 * BlueprintLoader — Validates and parses campaign JSON.
 * Returns strongly-typed blueprint data or a list of validation errors.
 */

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Check that ranges cover contiguous integers with no gaps. */
function validateContinuousRanges(ranges, label) {
  const errors = [];
  const sorted = Object.entries(ranges).sort((a, b) => a[1][0] - b[1][0]);
  for (let i = 0; i < sorted.length - 1; i++) {
    const [, [, maxA]] = sorted[i];
    const [, [minB]] = sorted[i + 1];
    if (minB !== maxA + 1) {
      errors.push(`${label}: gap between ${maxA} and ${minB} (values ${maxA + 1}–${minB - 1} uncovered)`);
    }
  }
  return errors;
}

/** Check that stage retreat thresholds are ascending (ignoring null). */
function validateStageThresholds(stages) {
  const errors = [];
  for (let i = 0; i < stages.length - 1; i++) {
    const a = stages[i].retreatThreshold;
    const b = stages[i + 1].retreatThreshold;
    if (a !== null && b !== null && b <= a) {
      errors.push(
        `Boss stage ${i + 2} retreatThreshold (${b}) must be greater than stage ${i + 1} (${a})`
      );
    }
  }
  return errors;
}

/** Collect all zone IDs in a blueprint. */
function zoneIdSet(blueprint) {
  return new Set((blueprint.zones ?? []).map(z => z.id));
}

// ---------------------------------------------------------------------------
// Main validator
// ---------------------------------------------------------------------------

/**
 * Validate the blueprint schema.
 * @param {object} blueprint
 * @returns {string[]} Array of error messages (empty → valid)
 */
export function validateBlueprint(blueprint) {
  const errors = [];

  if (!blueprint || typeof blueprint !== 'object') {
    return ['Blueprint must be a plain object'];
  }

  // Required top-level sections
  for (const section of ['meta', 'settings', 'classes', 'enemies', 'zones', 'systems', 'narrative']) {
    if (!(section in blueprint)) errors.push(`Missing required section: "${section}"`);
  }

  // Classes
  if (!Array.isArray(blueprint.classes) || blueprint.classes.length === 0) {
    errors.push('classes must be a non-empty array');
  }

  // Zones
  if (!Array.isArray(blueprint.zones) || blueprint.zones.length === 0) {
    errors.push('zones must be a non-empty array');
  } else {
    const knownIds = zoneIdSet(blueprint);
    blueprint.zones.forEach(zone => {
      (zone.connectedZones ?? []).forEach(connId => {
        if (!knownIds.has(connId)) {
          errors.push(`Zone "${zone.id}" references unknown connected zone "${connId}"`);
        }
      });
    });
  }

  // Settings – hit range continuity
  if (blueprint.settings?.hitRanges) {
    errors.push(...validateContinuousRanges(blueprint.settings.hitRanges, 'settings.hitRanges'));
  }

  // Boss stage thresholds
  const stages = blueprint.enemies?.boss?.stages;
  if (Array.isArray(stages)) {
    errors.push(...validateStageThresholds(stages));
  }

  return errors;
}

/**
 * Load and validate a campaign blueprint from a parsed JSON object.
 * @param {object} rawJson
 * @returns {{ blueprint: object|null, valid: boolean, errors: string[] }}
 */
export function loadBlueprint(rawJson) {
  const errors = validateBlueprint(rawJson);
  if (errors.length > 0) {
    return { blueprint: null, valid: false, errors };
  }
  return { blueprint: rawJson, valid: true, errors: [] };
}

/**
 * Load blueprint from a File object (browser drag-drop).
 * @param {File} file
 * @returns {Promise<{ blueprint: object|null, valid: boolean, errors: string[] }>}
 */
export async function loadBlueprintFromFile(file) {
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    return loadBlueprint(json);
  } catch (err) {
    return { blueprint: null, valid: false, errors: [`Failed to parse file: ${err.message}`] };
  }
}

/**
 * Load the bundled Tzorath campaign blueprint.
 * @returns {Promise<{ blueprint: object|null, valid: boolean, errors: string[] }>}
 */
export async function loadDefaultBlueprint() {
  try {
    const mod = await import('/campaigns/monster-hunt-tzorath.json', { assert: { type: 'json' } });
    return loadBlueprint(mod.default ?? mod);
  } catch {
    // Fallback for non-Vite environments (e.g. tests)
    return { blueprint: null, valid: false, errors: ['Default blueprint not available in this environment'] };
  }
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * @param {object} blueprint
 * @param {string} id
 * @returns {object|null}
 */
export function getClassById(blueprint, id) {
  return (blueprint.classes ?? []).find(c => c.id === id) ?? null;
}

/**
 * @param {object} blueprint
 * @param {string} id
 * @returns {object|null}
 */
export function getZoneById(blueprint, id) {
  return (blueprint.zones ?? []).find(z => z.id === id) ?? null;
}

/**
 * @param {object} blueprint
 * @param {string} zoneId
 * @returns {string[]}  IDs of adjacent zones
 */
export function getConnectedZones(blueprint, zoneId) {
  const zone = getZoneById(blueprint, zoneId);
  return zone?.connectedZones ?? [];
}

/**
 * Get boss stage data by 0-based index.
 * @param {object} blueprint
 * @param {number} stageIndex  0-based
 * @returns {object|null}
 */
export function getBossStage(blueprint, stageIndex) {
  return blueprint.enemies?.boss?.stages?.[stageIndex] ?? null;
}
