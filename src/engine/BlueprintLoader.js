/**
 * BlueprintLoader — Validates and parses campaign JSON
 * Every field the engine uses must be validated here.
 */

/**
 * Validate that hitRanges cover 1-20 without gaps or overlaps.
 * @param {object} hitRanges - { [key]: [min, max] }
 * @returns {string[]} Array of error messages
 */
function validateHitRanges(hitRanges) {
  const errors = [];
  if (!hitRanges || typeof hitRanges !== 'object') {
    return ['hitRanges is missing or not an object'];
  }

  const covered = new Array(21).fill(false); // index 1-20
  for (const [key, range] of Object.entries(hitRanges)) {
    if (!Array.isArray(range) || range.length !== 2) {
      errors.push(`hitRanges.${key} must be a [min, max] array`);
      continue;
    }
    const [min, max] = range;
    if (min < 1 || max > 20 || min > max) {
      errors.push(`hitRanges.${key} [${min},${max}] is out of valid range 1-20`);
      continue;
    }
    for (let i = min; i <= max; i++) {
      if (covered[i]) {
        errors.push(`hitRanges has overlap at value ${i} in key "${key}"`);
      }
      covered[i] = true;
    }
  }

  for (let i = 1; i <= 20; i++) {
    if (!covered[i]) {
      errors.push(`hitRanges does not cover value ${i}`);
    }
  }

  return errors;
}

/**
 * Validate the blueprint schema and return any validation errors.
 * @param {object} bp - Raw parsed JSON
 * @returns {string[]} Array of error messages (empty if valid)
 */
export function validateBlueprint(bp) {
  const errors = [];

  if (!bp || typeof bp !== 'object') {
    return ['Blueprint must be a JSON object'];
  }

  // Required top-level sections
  for (const section of ['meta', 'settings', 'classes', 'enemies', 'zones', 'systems', 'narrative']) {
    if (!(section in bp)) {
      errors.push(`Missing required top-level section: "${section}"`);
    }
  }

  // Settings validation
  if (bp.settings) {
    errors.push(...validateHitRanges(bp.settings.hitRanges));
    if (!bp.settings.critMultiplier) {
      errors.push('settings.critMultiplier is required');
    }
  }

  // Classes validation
  if (Array.isArray(bp.classes)) {
    if (bp.classes.length === 0) {
      errors.push('classes[] must have at least one entry');
    }
    for (const cls of bp.classes) {
      if (!cls.id) errors.push(`A class is missing required field "id"`);
      if (!cls.name) errors.push(`Class "${cls.id || '?'}" is missing "name"`);
      if (!cls.baseStats) {
        errors.push(`Class "${cls.id || '?'}" is missing "baseStats"`);
      } else {
        if (cls.baseStats.hp == null) errors.push(`Class "${cls.id}" baseStats missing "hp"`);
        if (!Array.isArray(cls.baseStats.damage)) errors.push(`Class "${cls.id}" baseStats.damage must be [min, max]`);
        if (cls.baseStats.defense == null) errors.push(`Class "${cls.id}" baseStats missing "defense"`);
      }
    }
  } else if ('classes' in bp) {
    errors.push('classes must be an array');
  }

  // Enemies.boss validation
  if (bp.enemies) {
    if (bp.enemies.boss) {
      const boss = bp.enemies.boss;
      if (!boss.id) errors.push('enemies.boss.id is required');
      if (!Array.isArray(boss.stages) || boss.stages.length === 0) {
        errors.push('enemies.boss.stages[] must be a non-empty array');
      } else {
        // Verify stages are ordered
        for (let i = 0; i < boss.stages.length; i++) {
          const stage = boss.stages[i];
          if (stage.stage !== i + 1) {
            errors.push(`enemies.boss.stages[${i}].stage should be ${i + 1}, got ${stage.stage}`);
          }
          if (stage.maxHp == null) errors.push(`Boss stage ${i + 1} missing maxHp`);
          if (!Array.isArray(stage.damage)) errors.push(`Boss stage ${i + 1} damage must be [min, max]`);
          if (stage.defense == null) errors.push(`Boss stage ${i + 1} missing defense`);
        }
      }
    }
  }

  // Zones validation
  if (Array.isArray(bp.zones)) {
    const zoneIds = new Set(bp.zones.map((z) => z.id));
    for (const zone of bp.zones) {
      if (!zone.id) errors.push('A zone is missing required field "id"');
      if (!zone.name) errors.push(`Zone "${zone.id || '?'}" is missing "name"`);
      if (zone.connectedZones && Array.isArray(zone.connectedZones)) {
        for (const connId of zone.connectedZones) {
          if (!zoneIds.has(connId)) {
            errors.push(`Zone "${zone.id}" references unknown connectedZone "${connId}"`);
          }
        }
      }
    }
  } else if ('zones' in bp) {
    errors.push('zones must be an array');
  }

  // Win/lose conditions
  if (!Array.isArray(bp.winConditions) || bp.winConditions.length === 0) {
    errors.push('winConditions[] must have at least one entry');
  }
  if (!Array.isArray(bp.loseConditions) || bp.loseConditions.length === 0) {
    errors.push('loseConditions[] must have at least one entry');
  }

  return errors;
}

/**
 * Load and validate a campaign blueprint from a JSON object.
 * @param {object} rawJson - Parsed JSON from campaign file
 * @returns {{ valid: boolean, data: object|null, errors: string[] }}
 */
export function loadBlueprint(rawJson) {
  const errors = validateBlueprint(rawJson);
  if (errors.length > 0) {
    return { valid: false, data: null, errors };
  }
  return { valid: true, data: rawJson, errors: [] };
}

/**
 * Load blueprint from a File object (for drag-drop upload).
 * @param {File} file
 * @returns {Promise<{ valid: boolean, data: object|null, errors: string[] }>}
 */
export async function loadBlueprintFromFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        resolve(loadBlueprint(json));
      } catch (err) {
        resolve({ valid: false, data: null, errors: [`Invalid JSON: ${err.message}`] });
      }
    };
    reader.onerror = () => {
      resolve({ valid: false, data: null, errors: ['Failed to read file'] });
    };
    reader.readAsText(file);
  });
}

/**
 * Load the bundled default campaign blueprint.
 * @returns {Promise<{ valid: boolean, data: object|null, errors: string[] }>}
 */
export async function loadDefaultBlueprint() {
  const url = new URL('/campaigns/monster-hunt-tzorath.json', import.meta.url);
  const res = await fetch(url.href);
  if (!res.ok) {
    return { valid: false, data: null, errors: [`Failed to fetch default blueprint: ${res.status}`] };
  }
  try {
    const json = await res.json();
    return loadBlueprint(json);
  } catch (err) {
    return { valid: false, data: null, errors: [`Invalid JSON in default blueprint: ${err.message}`] };
  }
}

// ─── Blueprint Query Helpers ───────────────────────────────────────────────────

/**
 * Get a class definition by its ID.
 * @param {object} blueprint
 * @param {string} classId
 * @returns {object|null}
 */
export function getClassById(blueprint, classId) {
  return blueprint.classes.find((c) => c.id === classId) ?? null;
}

/**
 * Get a zone definition by its ID.
 * @param {object} blueprint
 * @param {string} zoneId
 * @returns {object|null}
 */
export function getZoneById(blueprint, zoneId) {
  return blueprint.zones.find((z) => z.id === zoneId) ?? null;
}

/**
 * Get all zones connected to a given zone.
 * @param {object} blueprint
 * @param {string} zoneId
 * @returns {object[]}
 */
export function getConnectedZones(blueprint, zoneId) {
  const zone = getZoneById(blueprint, zoneId);
  if (!zone || !zone.connectedZones) return [];
  return zone.connectedZones.map((id) => getZoneById(blueprint, id)).filter(Boolean);
}

/**
 * Get a boss stage definition by stage number (1-based).
 * @param {object} blueprint
 * @param {number} stageNumber
 * @returns {object|null}
 */
export function getBossStage(blueprint, stageNumber) {
  return blueprint.enemies.boss.stages.find((s) => s.stage === stageNumber) ?? null;
}
