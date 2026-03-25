import { useState } from 'react';
import styles from './lobby.module.css';
import { CreateGame } from './CreateGame.jsx';
import { JoinGame } from './JoinGame.jsx';

export default function LobbyView() {
  const [tab, setTab] = useState('create');

  return (
    <div className={styles.lobbyView}>
      <div className={styles.header}>
        <h1 className={styles.title}>Mythwright</h1>
        <p className={styles.subtitle}>Universal Tabletop Game Engine</p>
      </div>

      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${tab === 'create' ? styles.tabActive : ''}`}
          onClick={() => setTab('create')}
        >
          Create Game
        </button>
        <button
          className={`${styles.tab} ${tab === 'join' ? styles.tabActive : ''}`}
          onClick={() => setTab('join')}
        >
          Join Game
        </button>
      </div>

      {tab === 'create' ? <CreateGame /> : <JoinGame />}
    </div>
  );
}
