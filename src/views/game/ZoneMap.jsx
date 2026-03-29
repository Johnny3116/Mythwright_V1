import { useState, useMemo } from 'react';
import { ZoneCard } from '@components/ZoneCard.jsx';
import styles from './game.module.css';

// Player token colors — cycle through these for up to 6 players
const PLAYER_COLORS = [
  'var(--accent-primary)',
  '#e8a838',
  '#38c4e8',
  '#e84a38',
  '#a838e8',
  '#38e8a0',
];

// Layout zones: use blueprint positions if available, fall back to auto grid
function autoLayoutZones(zones) {
  const positions = {};
  const cols = Math.ceil(Math.sqrt(zones.length));
  const padX = 130, padY = 130, startX = 80, startY = 80;
  zones.forEach((zone, i) => {
    if (zone.position?.x != null && zone.position?.y != null) {
      positions[zone.id] = { x: zone.position.x, y: zone.position.y };
    } else {
      positions[zone.id] = {
        x: startX + (i % cols) * padX,
        y: startY + Math.floor(i / cols) * padY,
      };
    }
  });
  return positions;
}

/**
 * ZoneMap — renders the spatial game map with:
 * - Player tokens (colored per player, stacked if multiple in same zone)
 * - Boss token (shown only if bossVisible, different color if confirmed vs last-known)
 * - Mob indicators (wildlife present / cleared)
 * - Fog of war (zones not yet entered are dimmed)
 * - Current player's zone highlighted
 * - Click zone to view details; click adjacent zone to move (if isMyTurn + onMove provided)
 *
 * Props:
 *   zones          — blueprint.zones[]
 *   players        — { [peerId]: playerState }
 *   boss           — boss state (null if not in play)
 *   floraState     — { [zoneId]: plantData }
 *   placedTraps    — trap[] with { zoneId, active }
 *   zoneMobs       — { [zoneId]: { present, cleared, creature } }
 *   searchedZones  — string[] of zone IDs searched this game
 *   myPlayerId     — the viewing player's ID
 *   isMyTurn       — whether it's this player's turn (enables click-to-move)
 *   bossVisible    — whether boss location is currently known
 *   onMove(zoneId) — callback to move the current player to a zone
 *   playerOrderColors — optional { [playerId]: colorIndex }
 */
export function ZoneMap({
  zones = [],
  players = {},
  boss = null,
  floraState = {},
  placedTraps = [],
  zoneMobs = {},
  searchedZones = [],
  myPlayerId = null,
  isMyTurn = false,
  bossVisible = false,
  onMove = null,
}) {
  const [selectedZone, setSelectedZone] = useState(null);
  const positions = useMemo(() => autoLayoutZones(zones), [zones]);

  // Assign stable colors to players
  const playerColorMap = useMemo(() => {
    const map = {};
    const playerIds = Object.keys(players);
    playerIds.forEach((id, idx) => {
      map[id] = PLAYER_COLORS[idx % PLAYER_COLORS.length];
    });
    return map;
  }, [players]);

  const myPlayer = myPlayerId ? players[myPlayerId] : null;
  const myZone = myPlayer?.zone ?? null;

  // Zones visited = any zone where a living player has been
  // We approximate "explored" as: any zone where any player currently is, plus searched zones
  const exploredZones = useMemo(() => {
    const explored = new Set(searchedZones);
    // Current player's zone is always explored
    if (myZone) explored.add(myZone);
    // Zones where any player is present
    Object.values(players).forEach((p) => {
      if (p.alive && p.zone) explored.add(p.zone);
    });
    // Boss's zone if visible
    if (bossVisible && boss?.zone) explored.add(boss.zone);
    return explored;
  }, [searchedZones, myZone, players, boss, bossVisible]);

  // Adjacent zones the current player can move to
  const adjacentToMe = useMemo(() => {
    if (!myZone) return new Set();
    const zone = zones.find((z) => z.id === myZone);
    return new Set(zone?.connectedZones ?? []);
  }, [myZone, zones]);

  if (!zones.length) {
    return (
      <div className={styles.zoneMap} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No zones loaded
      </div>
    );
  }

  const canvasWidth = Math.max(800, Math.max(...Object.values(positions).map((p) => p.x)) + 120);
  const canvasHeight = Math.max(500, Math.max(...Object.values(positions).map((p) => p.y)) + 120);

  function handleZoneClick(zone) {
    // Click-to-move if it's my turn and zone is adjacent
    if (isMyTurn && onMove && adjacentToMe.has(zone.id)) {
      onMove(zone.id);
    } else {
      setSelectedZone(zone);
    }
  }

  return (
    <div className={styles.zoneMap}>
      <div className={styles.zoneMapCanvas} style={{ width: canvasWidth, height: canvasHeight }}>

        {/* Connection lines */}
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        >
          {zones.map((zone) =>
            (zone.connectedZones || []).map((connId) => {
              const from = positions[zone.id];
              const to = positions[connId];
              if (!from || !to) return null;
              const key = [zone.id, connId].sort().join('--');
              const isActiveEdge = isMyTurn && (
                (zone.id === myZone && adjacentToMe.has(connId)) ||
                (connId === myZone && adjacentToMe.has(zone.id))
              );
              return (
                <line
                  key={key}
                  x1={from.x} y1={from.y}
                  x2={to.x} y2={to.y}
                  stroke={isActiveEdge ? 'var(--accent-primary)' : 'var(--border-color)'}
                  strokeWidth={isActiveEdge ? 3 : 1.5}
                  strokeDasharray={isActiveEdge ? '6 3' : undefined}
                  strokeOpacity={isActiveEdge ? 0.9 : 0.5}
                />
              );
            })
          )}
        </svg>

        {/* Zone nodes */}
        {zones.map((zone) => {
          const pos = positions[zone.id];
          if (!pos) return null;

          const isExplored = exploredZones.has(zone.id);
          const isMyCurrentZone = zone.id === myZone;
          const isAdjacent = adjacentToMe.has(zone.id);
          const isClickToMove = isMyTurn && isAdjacent && onMove;

          // Boss in this zone?
          const hasBoss = bossVisible && boss?.zone === zone.id;

          // Players in this zone
          const playersHere = Object.values(players).filter((p) => p.zone === zone.id && p.alive);

          // Mob state
          const mobData = zoneMobs[zone.id];
          const hasMobs = mobData?.present && !mobData?.cleared;
          const mobsCleared = mobData?.cleared;

          // Trap
          const hasTrap = placedTraps.some((t) => t.zoneId === zone.id && t.active);

          // Flora
          const hasFlora = !!floraState[zone.id];

          const nodeClasses = [
            styles.zoneNode,
            isMyCurrentZone ? styles.zoneNodeCurrent : '',
            isClickToMove ? styles.zoneNodeMoveable : '',
            !isExplored ? styles.zoneNodeUnexplored : '',
          ].filter(Boolean).join(' ');

          const circleClasses = [
            styles.zoneNodeCircle,
            hasBoss ? styles.zoneNodeWithBoss : '',
            playersHere.length > 0 ? styles.zoneNodeWithPlayer : '',
            hasTrap ? styles.zoneNodeWithTrap : '',
            hasFlora ? styles.zoneNodeWithFlora : '',
            hasMobs ? styles.zoneNodeWithMobs : '',
            mobsCleared ? styles.zoneNodeMobsCleared : '',
          ].filter(Boolean).join(' ');

          return (
            <div
              key={zone.id}
              className={nodeClasses}
              style={{ left: pos.x, top: pos.y }}
              onClick={() => handleZoneClick(zone)}
              title={isClickToMove ? `Move to ${zone.name}` : zone.name}
            >
              <div className={circleClasses}>
                {/* Player tokens — stacked colored dots */}
                {playersHere.length > 0 && (
                  <div className={styles.playerTokenStack}>
                    {playersHere.map((p, i) => (
                      <div
                        key={p.id}
                        className={styles.playerToken}
                        style={{
                          background: playerColorMap[p.id] || 'var(--accent-primary)',
                          zIndex: i + 1,
                          left: `${50 + (i - (playersHere.length - 1) / 2) * 10}%`,
                          transform: 'translateX(-50%)',
                        }}
                        title={p.name}
                      >
                        {p.classIcon || '🧑'}
                      </div>
                    ))}
                  </div>
                )}

                {/* Boss token */}
                {hasBoss && (
                  <div className={styles.bossToken} title={boss.name}>
                    🦎
                  </div>
                )}

                {/* Mob indicator */}
                {hasMobs && !playersHere.length && !hasBoss && (
                  <span className={styles.mobIndicator} title={mobData.creature}>🐾</span>
                )}

                {/* Flora indicator */}
                {hasFlora && !playersHere.length && !hasBoss && !hasMobs && (
                  <span title="Healing plant present">🌿</span>
                )}

                {/* Trap indicator */}
                {hasTrap && (
                  <div className={styles.trapBadge} title="Trap placed">⚙️</div>
                )}

                {/* Empty zone fallback */}
                {!playersHere.length && !hasBoss && !hasMobs && !hasFlora && (
                  <span style={{ opacity: 0.4 }}>📍</span>
                )}
              </div>

              {/* Zone name */}
              <div className={styles.zoneNodeName}>
                {zone.name}
                {!isExplored && <span style={{ opacity: 0.5 }}> ?</span>}
              </div>

              {/* Status badges below name */}
              <div className={styles.zoneBadges}>
                {mobsCleared && <span className={styles.clearedBadge}>✓ cleared</span>}
                {hasMobs && <span className={styles.dangerBadge}>⚠ {mobData.creature}</span>}
                {isClickToMove && <span className={styles.moveHint}>tap to move</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Zone detail popup */}
      {selectedZone && (
        <div
          className={styles.zonePopup}
          style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 300 }}
        >
          <ZoneCard
            zone={selectedZone}
            onClose={() => setSelectedZone(null)}
            traps={placedTraps}
            floraState={floraState}
            mobData={zoneMobs[selectedZone.id]}
          />
        </div>
      )}
    </div>
  );
}
