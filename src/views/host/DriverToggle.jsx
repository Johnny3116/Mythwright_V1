import { useState } from 'react';
import styles from './host.module.css';

// ---------------------------------------------------------------------------
// Driver mode metadata
// ---------------------------------------------------------------------------

const DRIVER_MODES = [
  {
    id: 'human',
    icon: '🧙',
    label: 'Human',
    description: 'You control the GM. All story beats, boss decisions, and event triggers are driven manually through the GM panel.',
    requiresApiKey: false,
  },
  {
    id: 'scripted',
    icon: '📜',
    label: 'Scripted',
    description: 'The scripted AI driver runs the GM automatically using pre-defined behavior trees from the campaign blueprint. No API key required.',
    requiresApiKey: false,
  },
  {
    id: 'ai',
    icon: '🤖',
    label: 'AI',
    description: 'The AI driver uses the Claude API to generate dynamic narratives and adaptive boss behaviors. Requires a valid API key.',
    requiresApiKey: true,
  },
];

// ---------------------------------------------------------------------------
// DriverToggle
// ---------------------------------------------------------------------------

/**
 * DriverToggle — Lets the GM switch between Human / Scripted / AI driver modes.
 *
 * Props:
 *   currentMode    {string}    'human' | 'scripted' | 'ai'
 *   onModeChange   {function}  (mode: string) → void
 *   apiKey         {string}    Current AI API key value
 *   onApiKeyChange {function}  (key: string) → void
 */
export function DriverToggle({
  currentMode = 'human',
  onModeChange,
  apiKey = '',
  onApiKeyChange,
}) {
  // The mode we're asking to switch to (pending confirmation)
  const [pendingMode, setPendingMode] = useState(null);
  const [localApiKey, setLocalApiKey] = useState(apiKey);

  const currentMeta = DRIVER_MODES.find((m) => m.id === currentMode) ?? DRIVER_MODES[0];
  const pendingMeta = DRIVER_MODES.find((m) => m.id === pendingMode) ?? null;

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleModeClick(modeId) {
    if (modeId === currentMode) return;  // already active
    setPendingMode(modeId);
  }

  function handleConfirm() {
    if (!pendingMode) return;

    // If switching to AI and API key is required but not set, persist the
    // local key first
    if (pendingMeta?.requiresApiKey && localApiKey.trim()) {
      onApiKeyChange?.(localApiKey.trim());
    }

    onModeChange?.(pendingMode);
    setPendingMode(null);
  }

  function handleCancel() {
    setPendingMode(null);
  }

  function handleApiKeyChange(e) {
    setLocalApiKey(e.target.value);
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionHeaderIcon}>⚙️</span>
        <span className={`${styles.sectionHeaderTitle} ${styles.gold}`}>GM Driver</span>
      </div>

      <div className={styles.driverToggle}>

        {/* Three-way toggle buttons */}
        <div className={styles.driverButtons} role="group" aria-label="GM driver mode selection">
          {DRIVER_MODES.map((mode) => {
            const isActive = mode.id === currentMode;
            const btnClass = `${styles.driverBtn}${isActive ? ` ${styles.active}` : ''}`;
            return (
              <button
                key={mode.id}
                className={btnClass}
                onClick={() => handleModeClick(mode.id)}
                aria-pressed={isActive}
                title={mode.description}
              >
                <span className={styles.driverBtnIcon}>{mode.icon}</span>
                <span className={styles.driverBtnLabel}>{mode.label}</span>
              </button>
            );
          })}
        </div>

        {/* Current mode indicator */}
        <div className={styles.currentModeDisplay}>
          <span className={styles.currentModeDot} />
          <span>Active driver:</span>
          <span className={styles.currentModeLabel}>{currentMeta.label}</span>
        </div>

        {/* Inline confirmation dialog */}
        {pendingMode && pendingMeta && (
          <div className={styles.driverConfirmDialog} role="dialog" aria-label={`Switch to ${pendingMeta.label} mode`}>
            <div className={styles.driverConfirmTitle}>
              {pendingMeta.icon} Switch to {pendingMeta.label} Mode?
            </div>
            <div className={styles.driverConfirmDesc}>
              {pendingMeta.description}
            </div>

            {/* API key input — only shown when switching to AI */}
            {pendingMeta.requiresApiKey && (
              <div>
                <div className={styles.driverApiLabel}>Claude API Key</div>
                <input
                  type="password"
                  className={styles.driverApiInput}
                  placeholder="sk-ant-..."
                  value={localApiKey}
                  onChange={handleApiKeyChange}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Claude API key"
                />
              </div>
            )}

            <div className={styles.driverConfirmRow}>
              <button
                className={`${styles.controlBtn} ${styles.primary}`}
                onClick={handleConfirm}
                disabled={pendingMeta.requiresApiKey && !localApiKey.trim()}
                style={{ flex: 1 }}
              >
                ✓ Confirm
              </button>
              <button
                className={styles.controlBtn}
                onClick={handleCancel}
                style={{ flex: 1 }}
              >
                ✕ Cancel
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
