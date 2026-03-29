import { useState, useMemo } from 'react';
import { ZoneCard } from '@components/ZoneCard.jsx';
import { Modal } from '@components/Modal.jsx';
import styles from './game.module.css';

// Layout zones: use blueprint positions if available, fall back to auto grid
function autoLayoutZones(zones) {
  const positions = {};
  const cols = Math.ceil(Math.sqrt(zones.length));
  const padX = 120, padY = 120, startX = 80, startY = 80;
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

function getZoneIcon(zone, boss, players, floraState, placedTraps) {
  if (boss?.zone === zone.id) return '🦎';
  const playersHere = Object.values(players).filter(p => p.zone === zone.id && p.alive);
  if (playersHere.length > 0) return playersHere[0].classIcon || '🧑';
  if (floraState?.[zone.id]) return '🌿';
  if (placedTraps?.some(t => t.zoneId === zone.id && t.active)) return '⚙️';
  return '📍';
}

export function ZoneMap({ zones = [], players = {}, boss = null, floraState = {}, placedTraps = [] }) {
  const [selectedZone, setSelectedZone] = useState(null);
  const positions = useMemo(() => autoLayoutZones(zones), [zones]);
  const popupStyle = useMemo(() => ({ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 300 }), []);

  if (!zones.length) {
    return <div className={styles.zoneMap} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No zones loaded</div>;
  }

  const canvasWidth = Math.max(800, Math.max(...Object.values(positions).map(p => p.x)) + 100);
  const canvasHeight = Math.max(500, Math.max(...Object.values(positions).map(p => p.y)) + 100);

  return (
    <div className={styles.zoneMap}>
      <div className={styles.zoneMapCanvas} style={{ width: canvasWidth, height: canvasHeight }}>
        {/* Draw connection lines */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {zones.map(zone =>
            (zone.connectedZones || []).map(connId => {
              const from = positions[zone.id];
              const to = positions[connId];
              if (!from || !to) return null;
              const key = [zone.id, connId].sort().join('--');
              return (
                <line
                  key={key}
                  x1={from.x} y1={from.y}
                  x2={to.x} y2={to.y}
                  stroke="var(--border-color)"
                  strokeWidth="2"
                />
              );
            })
          )}
        </svg>

        {/* Zone nodes */}
        {zones.map(zone => {
          const pos = positions[zone.id];
          if (!pos) return null;
          const hasBoss = boss?.zone === zone.id;
          const hasPlayer = Object.values(players).some(p => p.zone === zone.id && p.alive);
          const hasTrap = placedTraps.some(t => t.zoneId === zone.id && t.active);
          const hasFlora = !!floraState[zone.id];
          const icon = getZoneIcon(zone, boss, players, floraState, placedTraps);

          return (
            <div
              key={zone.id}
              className={styles.zoneNode}
              style={{ left: pos.x, top: pos.y }}
              onClick={() => setSelectedZone(zone)}
            >
              <div
                className={[
                  styles.zoneNodeCircle,
                  hasBoss ? styles.zoneNodeWithBoss : '',
                  hasPlayer ? styles.zoneNodeWithPlayer : '',
                  hasTrap ? styles.zoneNodeWithTrap : '',
                  hasFlora ? styles.zoneNodeWithFlora : '',
                ].filter(Boolean).join(' ')}
              >
                {icon}
              </div>
              <div className={styles.zoneNodeName}>{zone.name}</div>
            </div>
          );
        })}
      </div>

      {selectedZone && (
        <div className={styles.zonePopup} style={popupStyle}>
          <ZoneCard
            zone={selectedZone}
            onClose={() => setSelectedZone(null)}
            traps={placedTraps}
            floraState={floraState}
          />
        </div>
      )}
    </div>
  );
}
