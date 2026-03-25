import { useState } from 'react';
import { CreateGame } from './CreateGame';
import { JoinGame } from './JoinGame';
import styles from './lobby.module.css';

/**
 * LobbyView — Top-level lobby page.
 *
 * Displays the Mythwright branding, a Create/Join tab switcher, and renders
 * either the CreateGame or JoinGame sub-view based on the active tab.
 *
 * This is the default route ("/").
 */
export default function LobbyView() {
  const [mode, setMode] = useState('create'); // 'create' | 'join'

  return (
    <div className={styles.lobbyView}>
      <div className={styles.lobbyContent}>

        {/* ── Branding ── */}
        <header className={styles.lobbyHeader}>
          <h1 className={styles.lobbyTitle}>Mythwright</h1>
          <p className={styles.lobbySubtitle}>Universal Tabletop Game Engine</p>
        </header>

        {/* ── Mode Tabs ── */}
        <nav
          className={styles.modeTabs}
          role="tablist"
          aria-label="Game mode selection"
        >
          <button
            role="tab"
            type="button"
            className={`${styles.modeTab} ${mode === 'create' ? styles.modeTabActive : ''}`}
            onClick={() => setMode('create')}
            aria-selected={mode === 'create'}
            aria-controls="panel-create"
            id="tab-create"
          >
            Create Game
          </button>
          <button
            role="tab"
            type="button"
            className={`${styles.modeTab} ${mode === 'join' ? styles.modeTabActive : ''}`}
            onClick={() => setMode('join')}
            aria-selected={mode === 'join'}
            aria-controls="panel-join"
            id="tab-join"
          >
            Join Game
          </button>
        </nav>

        {/* ── Tab Panels ── */}
        <main>
          {mode === 'create' ? (
            <div
              id="panel-create"
              role="tabpanel"
              aria-labelledby="tab-create"
            >
              <CreateGame />
            </div>
          ) : (
            <div
              id="panel-join"
              role="tabpanel"
              aria-labelledby="tab-join"
            >
              <JoinGame />
            </div>
          )}
        </main>

      </div>
    </div>
  );
}
