import { useState, useMemo } from 'react';
import { ZoneCard } from '@components/ZoneCard.jsx';
import { isBossVisible } from '@engine/SpatialSystem.js';
import styles from './game.module.css';

// Use blueprint positions if defined, otherwise auto-grid
function autoLayoutZones(zones) {
  const positions = {};
  const cols = Math.ceil(Math.sqrt(zones.length));
  const padX = 130, padY = 120, startX = 90, startY = 90;
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

export function ZoneMap({
  zones = [],
  players = {},
  boss = null,
  floraState = {},
  placedTraps = [],
  zoneState = {},
  myPlayerId = null,
  moveMode = false,
  onMoveToZone = null,
}) {
  const [selectedZone, setSelectedZone] = useState(null);
  const positions = useMemo(() => autoLayoutZones(zones), [zones]);

  const myPlayer = myPlayerId ? players[myPlayerId] : null;
  const myZoneId = myPlayer?.zone ?? null;
  const visitedZones = useMemo(
    () => new Set(myPlayer?.visitedZones ?? (myZoneId ? [myZoneId] : [])),
    [myPlayer, myZoneId]
  );

  if (!zones.length) {
    return (
      <div className={styles.zoneMap} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No zones loaded
      </div>
    );
  }

  const canvasWidth  = Math.max(800, Math.max(...Object.values(positions).map(p => p.x)) + 120);
  const canvasHeight = Math.max(500, Math.max(...Object.values(positions).map(p => p.y)) + 120);

  function handleZoneClick(zone) {
    if (moveMode && onMoveToZone && myZoneId) {
      const myZone = zones.find(z => z.id === myZoneId);
      if (myZone?.connectedZones?.includes(zone.id)) {
        onMoveToZone(zone.id);
        return;
      }
    }
    setSelectedZone(zone);
  }

  return (
    <div className={styles.zoneMap}>
      <div className={styles.zoneMapCanvas} style={{ width: canvasWidth, height: canvasHeight }}>

        {/* Connection lines */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {zones.map(zone =>
            (zone.connectedZones || []).map(connId => {
              const from = positions[zone.id];
              const to   = positions[connId];
              if (!from || !to) return null;
              const key = [zone.id, connId].sort().join('--');
              return (
                <line
                  key={key}
                  x1={from.x} y1={from.y}
                  x2={to.x}   y2={to.y}
                  stroke="var(--border-color)"
                  strokeWidth="2"
                  opacity="0.6"
                />
              );
            })
          )}
        </svg>

        {/* Zone nodes */}
        {zones.map(zone => {
          const pos     = positions[zone.id];
          if (!pos) return null;

          const isMyZone    = zone.id === myZoneId;
          const isVisited   = visitedZones.has(zone.id);
          const myZoneData  = zones.find(z => z.id === myZoneId);
          const isAdjacent  = myZoneData?.connectedZones?.includes(zone.id) ?? false;
          const isMoveTarget = moveMode && isAdjacent;

          // Occupants
          const playersHere = Object.values(players).filter(p => p.alive && p.zone === zone.id);
          const bossHere    = boss && isBossVisible(myZoneId, boss) && boss.zone === zone.id;
          const hasTrap     = placedTraps.some(t => t.zoneId === zone.id && t.active);
          const hasFlora    = !!floraState[zone.id];
          const hasMob      = zoneState[zone.id]?.wildlifeAlive === true;
          const mobCleared  = zoneState[zone.id]?.cleared === true;

          const circleClasses = [
            styles.zoneNodeCircle,
            bossHere          ? styles.zoneNodeWithBoss   : '',
            playersHere.length > 0 ? styles.zoneNodeWithPlayer : '',
            hasTrap           ? styles.zoneNodeWithTrap   : '',
            hasFlora          ? styles.zoneNodeWithFlora  : '',
            hasMob            ? styles.zoneNodeWithMob    : '',
            isMyZone          ? styles.zoneNodeMyZone     : '',
            isMoveTarget      ? styles.zoneNodeMoveTarget : '',
          ].filter(Boolean).join(' ');

          return (
            <div
              key={zone.id}
              className={[
                styles.zoneNode,
                !isVisited ? styles.zoneNodeFogged : '',
                isMoveTarget ? styles.zoneNodeClickable : '',
              ].filter(Boolean).join(' ')}
              style={{ left: pos.x, top: pos.y }}
              onClick={() => handleZoneClick(zone)}
              title={isMoveTarget ? `Move to ${zone.name}` : zone.name}
            >
              <div className={circleClasses} style={{ position: 'relative' }}>
                {/* Main content: boss, then players, then default */}
                {bossHere ? (
                  <span className={styles.zoneBossToken}>🦎</span>
                ) : playersHere.length > 0 ? (
                  <div className={styles.zonePlayerTokens}>
                    {playersHere.slice(0, 3).map(p => (
                      <span
                        key={p.id}
                        className={[styles.zonePlayerToken, p.id === myPlayerId ? styles.zonePlayerTokenMe : ''].filter(Boolean).join(' ')}
                        title={p.name}
                      >
                        {p.classIcon || '🧑'}
                      </span>
                    ))}
                    {playersHere.length > 3 && (
                      <span className={styles.zonePlayerToken} style={{ fontSize: '10px' }}>+{playersHere.length - 3}</span>
                    )}
                  </div>
                ) : hasFlora ? (
                  <span>🌿</span>
                ) : hasTrap ? (
                  <span>⚙️</span>
                ) : (
                  <span>📍</span>
                )}

                {/* Mob indicator badge */}
                {hasMob && (
                  <span className={styles.zoneMobBadge} title={`${zoneState[zone.id]?.creature} lurks here`}>🐾</span>
                )}

                {/* Cleared badge */}
                {mobCleared && !hasMob && (
                  <span className={styles.zonecleared} title="Zone cleared">✓</span>
                )}

                {/* Move-target ring animation handled via CSS */}
              </div>

              <div className={[styles.zoneNodeName, isMyZone ? styles.zoneNodeNameActive : ''].filter(Boolean).join(' ')}>
                {zone.name}
              </div>

              {/* Show player count if multiple */}
              {playersHere.length > 1 && (
                <div className={styles.zonePlayerCount}>{playersHere.length}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Zone detail popup */}
      {selectedZone && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 300 }}>
          <ZoneCard
            zone={selectedZone}
            onClose={() => setSelectedZone(null)}
            traps={placedTraps}
            floraState={floraState}
            mobState={zoneState[selectedZone.id]}
          />
        </div>
      )}
    </div>
  );
}
