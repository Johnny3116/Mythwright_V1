/**
 * BlueprintLoader — Validates and parses campaign JSON
 */

/**
 * Load and validate a campaign blueprint from a JSON object.
 * @param {object} rawJson - Parsed JSON from campaign file
 * @returns {{ blueprint: object|null, errors: string[] }}
 */
export function loadBlueprint(rawJson) {
  const errors = validateBlueprint(rawJson);
  if (errors.length > 0) {
    return { blueprint: null, errors };
  }
  return { blueprint: rawJson, errors: [] };
}

/**
 * Validate the blueprint schema and return any validation errors.
 * @param {object} blueprint
 * @returns {string[]} Array of error messages (empty if valid)
 */
export function validateBlueprint(blueprint) {
  const errors = [];

  if (!blueprint || typeof blueprint !== 'object') {
    return ['Blueprint must be a JSON object'];
  }

  // Required top-level sections
  const required = ['meta', 'settings', 'classes', 'enemies', 'zones', 'systems', 'narrative'];
  for (const section of required) {
    if (!blueprint[section]) {
      errors.push(`Missing required section: "${section}"`);
    }
  }

  if (errors.length > 0) return errors;

  // meta validation
  if (!blueprint.meta.title) errors.push('meta.title is required');
  if (!blueprint.meta.playerCount) errors.push('meta.playerCount is required');

  // settings validation
  if (!blueprint.settings.hitRanges) errors.push('settings.hitRanges is required');
  if (!blueprint.settings.hitRanges?.miss) errors.push('settings.hitRanges.miss is required');
  if (!blueprint.settings.hitRanges?.hit) errors.push('settings.hitRanges.hit is required');
  if (!blueprint.settings.hitRanges?.critical && !blueprint.settings.hitRanges?.lethalStrike) {
    errors.push('settings.hitRanges.critical or lethalStrike is required');
  }

  // classes validation
  if (!Array.isArray(blueprint.classes) || blueprint.classes.length === 0) {
    errors.push('classes must be a non-empty array');
  } else {
    const classIds = new Set();
    blueprint.classes.forEach((cls, i) => {
      if (!cls.id) errors.push(`classes[${i}].id is required`);
      if (!cls.name) errors.push(`classes[${i}].name is required`);
      if (!cls.baseStats) errors.push(`classes[${i}].baseStats is required`);
      if (classIds.has(cls.id)) errors.push(`Duplicate class id: "${cls.id}"`);
      classIds.add(cls.id);
    });
  }

  // enemies validation
  if (!blueprint.enemies.boss && !blueprint.enemies.encounters) {
    errors.push('enemies must have boss or encounters');
  }
  if (blueprint.enemies.boss) {
    const boss = blueprint.enemies.boss;
    if (!boss.stages || !Array.isArray(boss.stages) || boss.stages.length === 0) {
      errors.push('enemies.boss.stages must be a non-empty array');
    } else {
      boss.stages.forEach((stage, i) => {
        if (stage.maxHp == null) errors.push(`enemies.boss.stages[${i}].maxHp is required`);
        if (!stage.damage) errors.push(`enemies.boss.stages[${i}].damage is required`);
      });
    }
  }

  // zones validation
  if (!Array.isArray(blueprint.zones) || blueprint.zones.length === 0) {
    errors.push('zones must be a non-empty array');
  } else {
    const zoneIds = new Set(blueprint.zones.map(z => z.id));
    blueprint.zones.forEach((zone, i) => {
      if (!zone.id) errors.push(`zones[${i}].id is required`);
      if (!zone.name) errors.push(`zones[${i}].name is required`);
      if (zone.connectedZones) {
        zone.connectedZones.forEach(connId => {
          if (!zoneIds.has(connId)) {
            errors.push(`zones[${i}].connectedZones references unknown zone: "${connId}"`);
          }
        });
      }
    });
  }

  // win/lose conditions
  if (!blueprint.winConditions || !Array.isArray(blueprint.winConditions)) {
    errors.push('winConditions array is required');
  }
  if (!blueprint.loseConditions || !Array.isArray(blueprint.loseConditions)) {
    errors.push('loseConditions array is required');
  }

  return errors;
}

/**
 * Load blueprint from a File object (for drag-drop upload).
 * @param {File} file
 * @returns {Promise<{ blueprint: object|null, errors: string[] }>}
 */
export async function loadBlueprintFromFile(file) {
  try {
    const text = await file.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { blueprint: null, errors: ['Invalid JSON: could not parse file'] };
    }
    return loadBlueprint(parsed);
  } catch (err) {
    return { blueprint: null, errors: [`File read error: ${err.message}`] };
  }
}

/**
 * Load the bundled default campaign blueprint.
 * @returns {Promise<{ blueprint: object|null, errors: string[] }>}
 */
export async function loadDefaultBlueprint() {
  try {
    const response = await fetch('/campaigns/monster-hunt-tzorath.json');
    if (!response.ok) {
      return { blueprint: null, errors: [`Failed to load default blueprint: HTTP ${response.status}`] };
    }
    const parsed = await response.json();
    return loadBlueprint(parsed);
  } catch (err) {
    return { blueprint: null, errors: [`Default blueprint load error: ${err.message}`] };
  }
}
