import styles from './game.module.css';

// ── Fixed positions for the 10 Tzorath zones ──────────────────────────────

const ZONE_POSITIONS = {
  'verdant-maw':      { x: 150, y: 400 },
  'razorback-canopy': { x: 300, y: 200 },
  'shattered-cliffs': { x: 300, y: 550 },
  'obsidian-grotto':  { x: 500, y: 250 },
  'sunken-veil':      { x: 500, y: 500 },
  'echoing-wastes':   { x: 650, y: 380 },
  'serpents-hollow':  { x: 800, y: 300 },
  'devourers-basin':  { x: 800, y: 500 },
  'howling-crest':    { x: 950, y: 400 },
  'tzorath-throne':   { x: 1100, y: 400 },
};

// Zone radius.
const R = 35;
// SVG viewport dimensions.
const SVG_W = 1200;
const SVG_H = 700;

// ── Mock zones used when the zones prop is empty ───────────────────────────

const MOCK_ZONES = [
  { id: 'verdant-maw',      name: 'Verdant Maw',      connectedZones: ['razorback-canopy', 'shattered-cliffs'] },
  { id: 'razorback-canopy', name: 'Razorback Canopy',  connectedZones: ['verdant-maw', 'obsidian-grotto'] },
  { id: 'shattered-cliffs', name: 'Shattered Cliffs',  connectedZones: ['verdant-maw', 'sunken-veil'] },
  { id: 'obsidian-grotto',  name: 'Obsidian Grotto',   connectedZones: ['razorback-canopy', 'echoing-wastes'] },
  { id: 'sunken-veil',      name: 'Sunken Veil',       connectedZones: ['shattered-cliffs', 'echoing-wastes'] },
  { id: 'echoing-wastes',   name: 'Echoing Wastes',    connectedZones: ['obsidian-grotto', 'sunken-veil', 'serpents-hollow', 'devourers-basin'] },
  { id: 'serpents-hollow',  name: "Serpent's Hollow",  connectedZones: ['echoing-wastes', 'howling-crest'] },
  { id: 'devourers-basin',  name: "Devourer's Basin",  connectedZones: ['echoing-wastes', 'howling-crest'] },
  { id: 'howling-crest',    name: 'Howling Crest',     connectedZones: ['serpents-hollow', 'devourers-basin', 'tzorath-throne'] },
  { id: 'tzorath-throne',   name: "Tzorath's Throne",  connectedZones: ['howling-crest'] },
];

/**
 * Derive a short abbreviated label for a zone name (up to 11 chars).
 */
function shortName(name) {
  return name.length > 12 ? name.slice(0, 11) + '…' : name;
}

/**
 * Build a deduplicated set of connection pairs from zones.
 */
function buildEdges(zones) {
  const seen = new Set();
  const edges = [];
  zones.forEach((zone) => {
    const pos = ZONE_POSITIONS[zone.id];
    if (!pos) return;
    (zone.connectedZones ?? []).forEach((otherId) => {
      const otherPos = ZONE_POSITIONS[otherId];
      if (!otherPos) return;
      const key = [zone.id, otherId].sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({ from: pos, to: otherPos });
      }
    });
  });
  return edges;
}

/**
 * Group player tokens by zone for rendering.
 * Returns { zoneId → [player, ...] }
 */
function groupPlayersByZone(players) {
  const groups = {};
  Object.values(players).forEach((p) => {
    if (!p.zoneId) return;
    if (!groups[p.zoneId]) groups[p.zoneId] = [];
    groups[p.zoneId].push(p);
  });
  return groups;
}

// ── Default player colors (fallback when player has no color) ──────────────

const DEFAULT_COLORS = ['#c74a38', '#4a7ec7', '#4a9e6a', '#d4a843'];

/**
 * ZoneMap — SVG-based interactive zone map.
 *
 * Props:
 *   zones        {Array}   Array of zone objects from blueprint (or empty for mock).
 *   players      {object}  gameState.players keyed by id.
 *   boss         {object}  gameState.boss
 *   onZoneClick  {Function} Called with (zoneId, event) when a zone is clicked.
 *   myZoneId     {string}   Current zone of the local player (highlighted differently).
 */
export function ZoneMap({ zones = [], players = {}, boss = null, onZoneClick, myZoneId }) {
  const activeZones = zones.length > 0 ? zones : MOCK_ZONES;
  const edges       = buildEdges(activeZones);
  const playerGroups = groupPlayersByZone(players);
  const bossZoneId  = boss?.zoneId ?? null;

  return (
    <div className={styles.zoneMap}>
      <svg
        className={styles.zoneMapSvg}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio="xMidYMid meet"
        aria-label="Zone map"
        role="img"
      >
        {/* ── Connection lines ── */}
        {edges.map((edge, i) => (
          <line
            key={i}
            className={styles.connectionLine}
            x1={edge.from.x}
            y1={edge.from.y}
            x2={edge.to.x}
            y2={edge.to.y}
          />
        ))}

        {/* ── Zone nodes ── */}
        {activeZones.map((zone) => {
          const pos = ZONE_POSITIONS[zone.id];
          if (!pos) return null;

          const isBossHere  = zone.id === bossZoneId;
          const isMyZone    = zone.id === myZoneId;
          const zonePlayers = playerGroups[zone.id] ?? [];
          const zoneState   = null; // wire in from gameState.zones if available

          // Determine circle style class.
          let circleClass = styles.zoneCircleOuter;
          if (isBossHere)  circleClass += ' ' + styles.bossZone;
          else if (isMyZone) circleClass += ' ' + styles.myZone;

          return (
            <g
              key={zone.id}
              onClick={(e) => onZoneClick?.(zone.id, e)}
              tabIndex={0}
              role="button"
              aria-label={`Zone: ${zone.name}${isBossHere ? ' — Boss is here!' : ''}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onZoneClick?.(zone.id, e);
                }
              }}
              style={{ outline: 'none' }}
            >
              {/* Zone circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={R}
                className={circleClass}
              />

              {/* Trap indicator dot */}
              {zone.trapCount > 0 && (
                <circle
                  cx={pos.x + R - 6}
                  cy={pos.y - R + 6}
                  r={5}
                  className={styles.trapIndicator}
                  aria-label="Has traps"
                />
              )}

              {/* Flora indicator dot */}
              {zone.hasFlora && (
                <circle
                  cx={pos.x - R + 6}
                  cy={pos.y - R + 6}
                  r={5}
                  className={styles.floraIndicator}
                  aria-label="Has flora"
                />
              )}

              {/* Zone name label */}
              <text
                x={pos.x}
                y={pos.y + R + 14}
                className={[
                  styles.zoneLabel,
                  isMyZone ? styles.activeLabel : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {shortName(zone.name)}
              </text>

              {/* Player tokens in this zone */}
              {zonePlayers.map((player, idx) => {
                const angle  = (idx / Math.max(zonePlayers.length, 1)) * Math.PI * 2 - Math.PI / 2;
                const radius = R * 0.55;
                const tx     = pos.x + Math.cos(angle) * radius;
                const ty     = pos.y + Math.sin(angle) * radius;
                const color  = player.color ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
                const initials = (player.name ?? 'P').slice(0, 1).toUpperCase();

                return (
                  <g key={player.id} className={styles.playerToken} aria-label={`${player.name} is here`}>
                    <circle
                      cx={tx}
                      cy={ty}
                      r={9}
                      className={styles.playerTokenCircle}
                      style={{ fill: color }}
                    />
                    <text x={tx} y={ty} className={styles.playerTokenText}>
                      {initials}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* ── Boss token ── */}
        {bossZoneId && ZONE_POSITIONS[bossZoneId] && (() => {
          const bpos = ZONE_POSITIONS[bossZoneId];
          return (
            <g
              className={styles.bossToken}
              aria-label="Boss location"
              style={{ transformOrigin: `${bpos.x}px ${bpos.y}px` }}
            >
              <circle
                cx={bpos.x}
                cy={bpos.y - 2}
                r={14}
                className={styles.bossTokenCircle}
              />
              <text x={bpos.x} y={bpos.y - 2} className={styles.bossTokenText}>
                💀
              </text>
            </g>
          );
        })()}
      </svg>

      {/* ── Map legend ── */}
      <div className={styles.mapLegend} aria-hidden="true">
        <div className={styles.legendItem}>
          <div className={styles.legendDot} style={{ background: 'var(--accent-danger)', border: '1px solid var(--accent-danger)' }} />
          <span>Boss location</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendDot} style={{ background: 'var(--accent-secondary)', border: '1px solid var(--accent-secondary)' }} />
          <span>Your zone</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendDot} style={{ background: 'var(--accent-success)' }} />
          <span>Flora present</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendDot} style={{ background: 'var(--accent-secondary)', opacity: 0.7 }} />
          <span>Trap set</span>
        </div>
      </div>
    </div>
  );
}
