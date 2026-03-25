import { useState } from 'react';
import styles from './lobby.module.css';
import { GM_DRIVER_TYPES } from '@utils/constants.js';

const GM_MODES = [
  { id: 'scripted', icon: '🤖', title: 'Scripted', desc: 'Auto-resolves boss turns using blueprint behavior trees' },
  { id: 'human', icon: '🎲', title: 'Human GM', desc: 'Full manual control over all boss turns and actions' },
  { id: 'ai', icon: '✨', title: 'AI GM', desc: 'LLM-powered narration and tactics (requires API key)' },
];

export function HostEditor({ blueprint, gmMode, onGmModeChange, onApiKeyChange, apiKey = '' }) {
  if (!blueprint) return null;

  return (
    <div className={styles.editorSection}>
      <div className={styles.editorTitle}>⚔️ Campaign Settings</div>

      <div className={styles.editorGrid}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Campaign</label>
          <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)' }}>
            {blueprint.meta.title}
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Players</label>
          <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
            {blueprint.meta.playerCount.min}–{blueprint.meta.playerCount.max} players
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Genre</label>
          <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
            {blueprint.meta.genre}
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Duration</label>
          <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
            {blueprint.meta.estimatedDuration}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-6)' }}>
        <div className={styles.formLabel} style={{ marginBottom: 'var(--space-3)' }}>GM Mode</div>
        <div className={styles.gmModes}>
          {GM_MODES.map(mode => (
            <div
              key={mode.id}
              className={`${styles.gmModeCard} ${gmMode === mode.id ? styles.gmModeCardActive : ''}`}
              onClick={() => onGmModeChange(mode.id)}
              role="button"
              tabIndex={0}
            >
              <div className={styles.gmModeIcon}>{mode.icon}</div>
              <div className={styles.gmModeTitle}>{mode.title}</div>
              <div className={styles.gmModeDesc}>{mode.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {gmMode === 'ai' && (
        <div className={`${styles.formGroup} ${styles.apiKeyInput}`}>
          <label className={styles.formLabel}>API Key (Anthropic)</label>
          <input
            type="password"
            className={styles.formInput}
            placeholder="sk-ant-..."
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
