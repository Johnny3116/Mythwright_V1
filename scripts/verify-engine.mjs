/**
 * Engine verification script — checks 1–7
 * Run with: node scripts/verify-engine.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ─── helpers ──────────────────────────────────────────────────────────────────
const pass  = (msg) => console.log(`  ✅ PASS  ${msg}`);
const fail  = (msg) => console.log(`  ❌ FAIL  ${msg}`);
const info  = (msg) => console.log(`  ℹ  ${msg}`);
const sep   = (title) => console.log(`\n${'─'.repeat(60)}\n🔍 CHECK ${title}\n${'─'.repeat(60)}`);

let failures = 0;
function assert(cond, passMsg, failMsg) {
  if (cond) { pass(passMsg); }
  else { fail(failMsg); failures++; }
}

// ─── imports ──────────────────────────────────────────────────────────────────
import { loadBlueprint } from '../src/engine/BlueprintLoader.js';
import { rollD20, rollInRange } from '../src/engine/DiceSystem.js';
import { resolveCombat } from '../src/engine/CombatResolver.js';
import { createGameEngine, GameState } from '../src/engine/GameEngine.js';
import { checkEvolution } from '../src/engine/EvolutionSystem.js';

const rawBlueprint = JSON.parse(
  readFileSync(resolve(root, 'campaigns/monster-hunt-tzorath.json'), 'utf-8')
);

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 1 — Blueprint load test
// ═══════════════════════════════════════════════════════════════════════════════
sep('1 — Blueprint Load (monster-hunt-tzorath.json)');
const bpResult = loadBlueprint(rawBlueprint);
assert(bpResult.valid === true, 'loadBlueprint returned valid:true', `loadBlueprint returned valid:false`);
assert(bpResult.errors.length === 0, `Zero errors returned`, `${bpResult.errors.length} error(s) found`);
if (bpResult.errors.length > 0) {
  bpResult.errors.forEach(e => info(`  Error: ${e}`));
}
assert(bpResult.data !== null, 'data object is non-null', 'data is null');
info(`Campaign title: "${bpResult.data?.meta?.title}"`);
info(`Classes: ${bpResult.data?.classes?.map(c => c.id).join(', ')}`);
info(`Zones:   ${bpResult.data?.zones?.length} zones`);
info(`Boss stages: ${bpResult.data?.enemies?.boss?.stages?.length}`);

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 2 — Dice fairness (1,000 rolls)
// ═══════════════════════════════════════════════════════════════════════════════
sep('2 — Dice Fairness (1,000 rolls of rollD20)');

// Verify it uses crypto.getRandomValues
const diceSource = readFileSync(resolve(root, 'src/engine/DiceSystem.js'), 'utf-8');
assert(
  diceSource.includes('crypto.getRandomValues'),
  'Source uses crypto.getRandomValues()',
  'crypto.getRandomValues() NOT found in DiceSystem.js!'
);
// Strip single-line comments before checking, so the JSDoc "never Math.random()" note doesn't flag
const diceCodeOnly = diceSource.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
assert(
  !diceCodeOnly.includes('Math.random'),
  'Math.random() is NOT called in DiceSystem code (only in comments)',
  'Math.random() CALLED in DiceSystem.js — VIOLATION!'
);

const counts = new Array(21).fill(0);
for (let i = 0; i < 1000; i++) {
  counts[rollD20().natural]++;
}

console.log('  Distribution (face: count):');
let distributionOk = true;
for (let face = 1; face <= 20; face++) {
  const count = counts[face];
  const flag = count < 30 ? '⚠ TOO LOW' : count > 70 ? '⚠ TOO HIGH' : '';
  console.log(`    ${String(face).padStart(2)}: ${String(count).padStart(3)}  ${flag}`);
  if (flag) distributionOk = false;
}
assert(distributionOk, 'All faces within acceptable range (30–70 per 1,000 rolls)', 'Distribution outlier detected');

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 3 — Combat resolver smoke test
// ═══════════════════════════════════════════════════════════════════════════════
sep('3 — Combat Resolver Smoke Test');

const combatSettings = {
  hitRanges: { miss: [1, 5], hit: [6, 15], critical: [16, 20] },
  critMultiplier: 2.0,
};
const attacker = { damage: [20, 20] };   // fixed damage for reproducibility
const defender = { defense: 5 };

// Scenario A: roll 3 — miss
const resultA = resolveCombat(attacker, defender, { natural: 3, modified: 3, modifier: 0 }, combatSettings);
info(`Roll 3  → hit:${resultA.hit}, critical:${resultA.critical}, damageDealt:${resultA.damageDealt}, narrative:"${resultA.narrative}"`);
assert(resultA.hit === false,      'Roll 3: hit is false',            `Roll 3: hit is ${resultA.hit} (expected false)`);
assert(resultA.damageDealt === 0,  'Roll 3: damageDealt is 0',        `Roll 3: damageDealt is ${resultA.damageDealt}`);

// Scenario B: roll 10 — hit
const resultB = resolveCombat(attacker, defender, { natural: 10, modified: 10, modifier: 0 }, combatSettings);
info(`Roll 10 → hit:${resultB.hit}, critical:${resultB.critical}, damageDealt:${resultB.damageDealt}, narrative:"${resultB.narrative}"`);
assert(resultB.hit === true,       'Roll 10: hit is true',            `Roll 10: hit is ${resultB.hit} (expected true)`);
assert(resultB.critical === false, 'Roll 10: critical is false',      `Roll 10: critical is ${resultB.critical}`);
assert(resultB.damageDealt > 0,   'Roll 10: damageDealt > 0',        `Roll 10: damageDealt is ${resultB.damageDealt}`);

// Scenario C: roll 18 — critical
const resultC = resolveCombat(attacker, defender, { natural: 18, modified: 18, modifier: 0 }, combatSettings);
info(`Roll 18 → hit:${resultC.hit}, critical:${resultC.critical}, damageDealt:${resultC.damageDealt}, narrative:"${resultC.narrative}"`);
assert(resultC.hit === true,      'Roll 18: hit is true',            `Roll 18: hit is ${resultC.hit}`);
assert(resultC.critical === true, 'Roll 18: critical is true',       `Roll 18: critical is ${resultC.critical}`);
assert(resultC.damageDealt > resultB.damageDealt,
  `Roll 18: crit damage (${resultC.damageDealt}) > hit damage (${resultB.damageDealt})`,
  `Roll 18: crit damage (${resultC.damageDealt}) NOT > hit damage (${resultB.damageDealt})`
);

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 4 — State machine transitions
// ═══════════════════════════════════════════════════════════════════════════════
sep('4 — State Machine Transitions');

const engine = createGameEngine(rawBlueprint);
const mockPlayers = [
  { id: 'p1', name: 'Alice', classId: 'assault'  },
  { id: 'p2', name: 'Bob',   classId: 'trapper'  },
  { id: 'p3', name: 'Carol', classId: 'medic'    },
];

const s0 = engine.getState().gameState;
info(`Initial state: ${s0}`);
assert(s0 === GameState.LOBBY, `State is LOBBY`, `State is ${s0}, expected LOBBY`);

engine.initializeGame(mockPlayers);
const s2 = engine.getState().gameState;
info(`After initializeGame(): ${s2}`);
assert(s2 === GameState.GAME_SETUP, `Reaches GAME_SETUP`, `Got ${s2}, expected GAME_SETUP`);

engine.startGame();
const s3 = engine.getState().gameState;
info(`After startGame(): ${s3}`);
assert(s3 === GameState.TURN_LOOP, `Reaches TURN_LOOP`, `Got ${s3}, expected TURN_LOOP`);

const playerCount = Object.keys(engine.getState().players).length;
assert(playerCount === 3, `3 players initialized`, `Expected 3 players, got ${playerCount}`);

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 5 — Evolution threshold test
// ═══════════════════════════════════════════════════════════════════════════════
sep('5 — Evolution Threshold (Stage 1, retreatThreshold=100)');

// HP === 100 → should evolve
const bossAt100 = { hp: 100, stage: 1 };
const evo100 = checkEvolution(bossAt100, rawBlueprint);
info(`Boss HP=100 → shouldEvolve:${evo100.shouldEvolve}, nextStage:${evo100.nextStage}`);
assert(evo100.shouldEvolve === true,   'HP=100: shouldEvolve is true',  `HP=100: shouldEvolve is ${evo100.shouldEvolve}`);
assert(evo100.nextStage    === 2,      'HP=100: nextStage is 2',         `HP=100: nextStage is ${evo100.nextStage}`);

// HP === 101 → should NOT evolve
const bossAt101 = { hp: 101, stage: 1 };
const evo101 = checkEvolution(bossAt101, rawBlueprint);
info(`Boss HP=101 → shouldEvolve:${evo101.shouldEvolve}`);
assert(evo101.shouldEvolve === false, 'HP=101: shouldEvolve is false', `HP=101: shouldEvolve is ${evo101.shouldEvolve}`);

// HP === 50 (below threshold) → should evolve
const bossAt50  = { hp: 50, stage: 1 };
const evo50  = checkEvolution(bossAt50, rawBlueprint);
assert(evo50.shouldEvolve === true,  'HP=50:  shouldEvolve is true',  `HP=50:  shouldEvolve is ${evo50.shouldEvolve}`);

// Stage 5 (final form, null threshold) → should never evolve
const bossFinal = { hp: 1, stage: 5 };
const evoFinal  = checkEvolution(bossFinal, rawBlueprint);
assert(evoFinal.shouldEvolve === false, 'Stage 5: shouldEvolve is false (final form)', `Stage 5: shouldEvolve is ${evoFinal.shouldEvolve}`);

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 6 — Headless game loop (5 rounds, console log)
// ═══════════════════════════════════════════════════════════════════════════════
sep('6 — Headless Game Loop (5 complete rounds)');

const engine2 = createGameEngine(rawBlueprint);
const roundLogs = [];
engine2.on('narrativeUpdate', ({ message }) => { if (message) roundLogs.push(message); });

engine2.initializeGame(mockPlayers);
engine2.startGame();

let threwError = false;
let roundsCompleted = 0;

try {
  for (let round = 1; round <= 5; round++) {
    const st = engine2.getState();
    if (st.gameState === GameState.GAME_OVER) {
      info(`Game ended early at round ${round} — ${st.winResult?.condition}`);
      break;
    }

    // Player turns
    for (const pid of ['p1', 'p2', 'p3']) {
      if (engine2.getState().players[pid]?.hp > 0) {
        engine2.playerAttack(pid, 'boss');
      }
    }
    if (engine2.getState().gameState === GameState.GAME_OVER) break;

    engine2.executeBossTurn();
    if (engine2.getState().gameState === GameState.GAME_OVER) break;

    engine2.executeEnvironmentPhase();
    roundsCompleted++;
  }
} catch (err) {
  threwError = true;
  fail(`Exception thrown during game loop: ${err.message}`);
  console.error(err.stack);
  failures++;
}

if (!threwError) {
  const finalSt = engine2.getState();
  info(`Rounds completed: ${roundsCompleted}`);
  info(`Final game state: ${finalSt.gameState}`);
  info(`Boss HP: ${finalSt.boss.hp}/${finalSt.boss.maxHp} (stage ${finalSt.boss.stage})`);
  info(`Player HPs: ${Object.values(finalSt.players).map(p => `${p.name}:${p.hp}`).join(', ')}`);

  console.log('\n  Game log (last 15 entries):');
  const allLogs = engine2.getState().log.slice(-15);
  allLogs.forEach((entry, i) => info(`  [R${entry.round}] ${entry.message}`));

  assert(roundsCompleted >= 1 || finalSt.gameState === GameState.GAME_OVER,
    'Game loop completed without throwing',
    'Game loop did not complete expected rounds');
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 7 — Serialization round-trip
// ═══════════════════════════════════════════════════════════════════════════════
sep('7 — Serialization Round-Trip');

const engine3 = createGameEngine(rawBlueprint);
engine3.initializeGame(mockPlayers);
engine3.startGame();

// Run 3 rounds
for (let r = 0; r < 3; r++) {
  const st = engine3.getState();
  if (st.gameState === GameState.GAME_OVER) break;
  for (const pid of ['p1', 'p2', 'p3']) {
    if (engine3.getState().players[pid]?.hp > 0) engine3.playerAttack(pid, 'boss');
  }
  if (engine3.getState().gameState !== GameState.GAME_OVER) {
    engine3.executeBossTurn();
    engine3.executeEnvironmentPhase();
  }
}

const stateBeforeSerial = engine3.getState();
const serialized = engine3.serialize();

assert(typeof serialized === 'string', 'serialize() returns a string', `serialize() returned ${typeof serialized}`);

let parsedOk = false;
try {
  JSON.parse(serialized);
  parsedOk = true;
} catch(_) {}
assert(parsedOk, 'Serialized string is valid JSON', 'Serialized string is NOT valid JSON');

// Deserialize into a fresh engine
const engine4 = createGameEngine(rawBlueprint);
let deserErr = null;
try {
  const parsed = JSON.parse(serialized);
  engine4.loadState(parsed.state);
} catch(e) {
  deserErr = e;
}
assert(deserErr === null, 'loadState() completed without error', `loadState() threw: ${deserErr?.message}`);

const stateAfterSerial = engine4.getState();

// Compare critical fields
assert(
  stateAfterSerial.gameState === stateBeforeSerial.gameState,
  `gameState matches: ${stateBeforeSerial.gameState}`,
  `gameState mismatch: got ${stateAfterSerial.gameState}, expected ${stateBeforeSerial.gameState}`
);
assert(
  stateAfterSerial.boss.hp === stateBeforeSerial.boss.hp,
  `boss.hp matches: ${stateBeforeSerial.boss.hp}`,
  `boss.hp mismatch: got ${stateAfterSerial.boss.hp}, expected ${stateBeforeSerial.boss.hp}`
);
assert(
  stateAfterSerial.boss.stage === stateBeforeSerial.boss.stage,
  `boss.stage matches: ${stateBeforeSerial.boss.stage}`,
  `boss.stage mismatch: got ${stateAfterSerial.boss.stage}`
);
assert(
  Object.keys(stateAfterSerial.players).length === Object.keys(stateBeforeSerial.players).length,
  `player count matches: ${Object.keys(stateBeforeSerial.players).length}`,
  `player count mismatch`
);
assert(
  stateAfterSerial.round === stateBeforeSerial.round,
  `round number matches: ${stateBeforeSerial.round}`,
  `round mismatch: got ${stateAfterSerial.round}, expected ${stateBeforeSerial.round}`
);

info(`Serialized payload size: ${(serialized.length / 1024).toFixed(1)} KB`);

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(60)}`);
if (failures === 0) {
  console.log('✅  ALL CHECKS PASSED — Engine is correct and verified.');
} else {
  console.log(`❌  ${failures} CHECK(S) FAILED — see output above.`);
  process.exit(1);
}
console.log('═'.repeat(60));
