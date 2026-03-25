import { useCallback, useMemo, useRef, useState } from 'react';
import styles from './lobby.module.css';

// ---------------------------------------------------------------------------
// AccordionSection — reusable collapsible panel
// ---------------------------------------------------------------------------

function AccordionSection({ title, meta, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`${styles.accordion} ${open ? styles.accordionOpen : ''}`}>
      <button
        type="button"
        className={styles.accordionHeader}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span
          className={`${styles.accordionChevron} ${open ? styles.accordionChevronOpen : ''}`}
        >
          ▶
        </span>
        <span className={styles.accordionHeaderLabel}>{title}</span>
        {meta && <span className={styles.accordionHeaderMeta}>{meta}</span>}
      </button>
      {open && <div className={styles.accordionBody}>{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// InlineField — single-line editable text / number field
// ---------------------------------------------------------------------------

function InlineField({ label, value, onChange, type = 'text', readOnly = false }) {
  return (
    <div className={styles.fieldRow}>
      <span className={styles.fieldLabel}>{label}</span>
      {readOnly ? (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
          }}
        >
          {value}
        </span>
      ) : (
        <input
          type={type}
          className={type === 'number' ? styles.editableNumber : styles.editableField}
          value={value ?? ''}
          onChange={(e) =>
            onChange(type === 'number' ? Number(e.target.value) : e.target.value)
          }
          spellCheck={false}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle — reusable switch component
// ---------------------------------------------------------------------------

function Toggle({ id, checked, onChange, label }) {
  return (
    <div className={styles.systemToggleRow}>
      <span className={styles.systemToggleLabel}>{label}</span>
      <label className={styles.toggle} htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          className={styles.toggleInput}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className={styles.toggleSlider} />
      </label>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HostEditor
// ---------------------------------------------------------------------------

/**
 * HostEditor — Accordion-based blueprint editor for the host.
 *
 * @param {{ blueprint: object, onChange: (updated: object) => void }} props
 */
export function HostEditor({ blueprint, onChange }) {
  // Keep a snapshot of the original blueprint for "Reset to original"
  const originalRef = useRef(blueprint);

  // Patch a nested path in the blueprint immutably and call onChange
  const patch = useCallback(
    (updater) => {
      onChange(updater(blueprint));
    },
    [blueprint, onChange]
  );

  const handleReset = useCallback(() => {
    onChange(originalRef.current);
  }, [onChange]);

  // -------------------------------------------------------------------------
  // Meta section
  // -------------------------------------------------------------------------

  const metaSection = useMemo(
    () => (
      <AccordionSection
        title="Campaign Meta"
        meta={blueprint.meta?.title ?? ''}
        defaultOpen
      >
        <InlineField
          label="Title"
          value={blueprint.meta?.title}
          onChange={(v) =>
            patch((bp) => ({ ...bp, meta: { ...bp.meta, title: v } }))
          }
        />
        <InlineField
          label="Author"
          value={blueprint.meta?.author}
          onChange={(v) =>
            patch((bp) => ({ ...bp, meta: { ...bp.meta, author: v } }))
          }
        />
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Description</span>
          <textarea
            className={styles.editableTextarea}
            value={blueprint.meta?.description ?? ''}
            onChange={(e) =>
              patch((bp) => ({
                ...bp,
                meta: { ...bp.meta, description: e.target.value },
              }))
            }
            spellCheck={false}
          />
        </div>
        <InlineField
          label="Players"
          value={blueprint.meta?.playerCount}
          type="number"
          onChange={(v) =>
            patch((bp) => ({ ...bp, meta: { ...bp.meta, playerCount: v } }))
          }
        />
        <InlineField
          label="Est. Duration"
          value={blueprint.meta?.estimatedDuration}
          onChange={(v) =>
            patch((bp) => ({ ...bp, meta: { ...bp.meta, estimatedDuration: v } }))
          }
        />
        <InlineField
          label="Version"
          value={blueprint.meta?.version}
          readOnly
        />
      </AccordionSection>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [blueprint.meta]
  );

  // -------------------------------------------------------------------------
  // Classes section
  // -------------------------------------------------------------------------

  const classesSection = useMemo(() => {
    const classes = Array.isArray(blueprint.classes) ? blueprint.classes : [];
    return (
      <AccordionSection title="Classes" meta={`${classes.length} classes`}>
        <div className={styles.classGrid}>
          {/* Column headers */}
          <div className={styles.classRow} style={{ opacity: 0.5, pointerEvents: 'none' }}>
            <span className={styles.fieldLabel}>Name</span>
            <span className={styles.fieldLabel}>HP</span>
            <span className={styles.fieldLabel}>Damage</span>
            <span className={styles.fieldLabel}>Defense</span>
          </div>
          {classes.map((cls, idx) => (
            <div key={cls.id ?? idx} className={styles.classRow}>
              {/* Name with icon */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                {cls.icon && <span className={styles.classIcon}>{cls.icon}</span>}
                <input
                  type="text"
                  className={styles.editableField}
                  value={cls.name ?? ''}
                  onChange={(e) =>
                    patch((bp) => ({
                      ...bp,
                      classes: bp.classes.map((c, i) =>
                        i === idx ? { ...c, name: e.target.value } : c
                      ),
                    }))
                  }
                  spellCheck={false}
                />
              </div>
              {/* HP */}
              <input
                type="number"
                className={styles.editableNumber}
                value={cls.baseStats?.hp ?? ''}
                onChange={(e) =>
                  patch((bp) => ({
                    ...bp,
                    classes: bp.classes.map((c, i) =>
                      i === idx
                        ? { ...c, baseStats: { ...c.baseStats, hp: Number(e.target.value) } }
                        : c
                    ),
                  }))
                }
              />
              {/* Damage range */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                <input
                  type="number"
                  className={styles.editableNumber}
                  style={{ width: '52px' }}
                  value={cls.baseStats?.damage?.[0] ?? ''}
                  onChange={(e) =>
                    patch((bp) => ({
                      ...bp,
                      classes: bp.classes.map((c, i) =>
                        i === idx
                          ? {
                              ...c,
                              baseStats: {
                                ...c.baseStats,
                                damage: [Number(e.target.value), c.baseStats?.damage?.[1] ?? 0],
                              },
                            }
                          : c
                      ),
                    }))
                  }
                />
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>–</span>
                <input
                  type="number"
                  className={styles.editableNumber}
                  style={{ width: '52px' }}
                  value={cls.baseStats?.damage?.[1] ?? ''}
                  onChange={(e) =>
                    patch((bp) => ({
                      ...bp,
                      classes: bp.classes.map((c, i) =>
                        i === idx
                          ? {
                              ...c,
                              baseStats: {
                                ...c.baseStats,
                                damage: [c.baseStats?.damage?.[0] ?? 0, Number(e.target.value)],
                              },
                            }
                          : c
                      ),
                    }))
                  }
                />
              </div>
              {/* Defense */}
              <input
                type="number"
                className={styles.editableNumber}
                value={cls.baseStats?.defense ?? ''}
                onChange={(e) =>
                  patch((bp) => ({
                    ...bp,
                    classes: bp.classes.map((c, i) =>
                      i === idx
                        ? {
                            ...c,
                            baseStats: { ...c.baseStats, defense: Number(e.target.value) },
                          }
                        : c
                    ),
                  }))
                }
              />
            </div>
          ))}
        </div>
      </AccordionSection>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blueprint.classes]);

  // -------------------------------------------------------------------------
  // Boss section
  // -------------------------------------------------------------------------

  const bossSection = useMemo(() => {
    const boss = blueprint.enemies?.boss;
    if (!boss) return null;
    const stages = Array.isArray(boss.stages) ? boss.stages : [];

    return (
      <AccordionSection
        title="Boss"
        meta={`${stages.length} stage${stages.length !== 1 ? 's' : ''}`}
      >
        <InlineField
          label="Name"
          value={boss.name}
          onChange={(v) =>
            patch((bp) => ({
              ...bp,
              enemies: { ...bp.enemies, boss: { ...bp.enemies.boss, name: v } },
            }))
          }
        />
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Stages</span>
          <div className={styles.bossStageList}>
            {stages.map((stage, idx) => (
              <div key={idx} className={styles.bossStageRow}>
                <span className={styles.bossStageNumber}>Stage {idx + 1}</span>
                <span className={styles.fieldLabel} style={{ margin: 0 }}>
                  {stage.name ?? `Phase ${idx + 1}`}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span
                    style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}
                  >
                    HP
                  </span>
                  <input
                    type="number"
                    className={styles.editableNumber}
                    style={{ width: '72px' }}
                    value={stage.hp ?? ''}
                    onChange={(e) =>
                      patch((bp) => ({
                        ...bp,
                        enemies: {
                          ...bp.enemies,
                          boss: {
                            ...bp.enemies.boss,
                            stages: bp.enemies.boss.stages.map((s, i) =>
                              i === idx ? { ...s, hp: Number(e.target.value) } : s
                            ),
                          },
                        },
                      }))
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </AccordionSection>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blueprint.enemies]);

  // -------------------------------------------------------------------------
  // Zones section
  // -------------------------------------------------------------------------

  const zonesSection = useMemo(() => {
    const zones = Array.isArray(blueprint.zones) ? blueprint.zones : [];
    return (
      <AccordionSection title="Zones" meta={`${zones.length} zones`}>
        <div className={styles.zoneList}>
          {zones.map((zone, idx) => (
            <div key={zone.id ?? idx} className={styles.zoneRow}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <input
                  type="text"
                  className={styles.editableField}
                  value={zone.name ?? ''}
                  onChange={(e) =>
                    patch((bp) => ({
                      ...bp,
                      zones: bp.zones.map((z, i) =>
                        i === idx ? { ...z, name: e.target.value } : z
                      ),
                    }))
                  }
                  spellCheck={false}
                />
                {zone.subtitle && (
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-muted)',
                      fontStyle: 'italic',
                    }}
                  >
                    {zone.subtitle}
                  </span>
                )}
              </div>
              {Array.isArray(zone.connectedZones) && zone.connectedZones.length > 0 && (
                <div className={styles.zoneConnections}>
                  {zone.connectedZones.map((connId) => {
                    const connZone = zones.find((z) => z.id === connId);
                    return (
                      <span key={connId} className={styles.zoneTag}>
                        {connZone?.name ?? connId}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </AccordionSection>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blueprint.zones]);

  // -------------------------------------------------------------------------
  // Systems section
  // -------------------------------------------------------------------------

  const systemsSection = useMemo(() => {
    const systems = blueprint.systems ?? {};
    const systemKeys = Object.keys(systems);
    if (systemKeys.length === 0) return null;

    return (
      <AccordionSection title="Systems" meta={`${systemKeys.length} modules`}>
        <div className={styles.systemToggles}>
          {systemKeys.map((key) => {
            const sys = systems[key];
            const isEnabled = typeof sys?.enabled === 'boolean' ? sys.enabled : true;
            return (
              <Toggle
                key={key}
                id={`system-toggle-${key}`}
                label={key.charAt(0).toUpperCase() + key.slice(1)}
                checked={isEnabled}
                onChange={(checked) =>
                  patch((bp) => ({
                    ...bp,
                    systems: {
                      ...bp.systems,
                      [key]: { ...bp.systems[key], enabled: checked },
                    },
                  }))
                }
              />
            );
          })}
        </div>
      </AccordionSection>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blueprint.systems]);

  // -------------------------------------------------------------------------
  // Narrative section
  // -------------------------------------------------------------------------

  const narrativeSection = useMemo(() => {
    const narrative = blueprint.narrative;
    if (!narrative) return null;

    return (
      <AccordionSection title="Narrative">
        <div className={styles.narrativeBlock}>
          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Intro</span>
            <textarea
              className={styles.editableTextarea}
              value={narrative.intro ?? ''}
              onChange={(e) =>
                patch((bp) => ({
                  ...bp,
                  narrative: { ...bp.narrative, intro: e.target.value },
                }))
              }
              spellCheck
            />
          </div>
          {narrative.objective !== undefined && (
            <InlineField
              label="Objective"
              value={narrative.objective}
              onChange={(v) =>
                patch((bp) => ({
                  ...bp,
                  narrative: { ...bp.narrative, objective: v },
                }))
              }
            />
          )}
          {narrative.missionBriefing?.target !== undefined && (
            <InlineField
              label="Target"
              value={narrative.missionBriefing.target}
              onChange={(v) =>
                patch((bp) => ({
                  ...bp,
                  narrative: {
                    ...bp.narrative,
                    missionBriefing: {
                      ...bp.narrative.missionBriefing,
                      target: v,
                    },
                  },
                }))
              }
            />
          )}
        </div>
      </AccordionSection>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blueprint.narrative]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={styles.hostEditor}>
      <div className={styles.hostEditorHeader}>
        <span className={styles.hostEditorTitle}>Blueprint Editor</span>
        <button
          type="button"
          className={styles.resetAllBtn}
          onClick={handleReset}
          aria-label="Reset all blueprint edits to the original uploaded values"
        >
          Reset to Original
        </button>
      </div>

      {metaSection}
      {classesSection}
      {bossSection}
      {zonesSection}
      {systemsSection}
      {narrativeSection}
    </div>
  );
}
