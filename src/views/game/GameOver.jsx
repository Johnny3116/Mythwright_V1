import styles from './game.module.css';

/**
 * GameOver — Full-screen end-of-game screen shown after victory or defeat.
 *
 * Shows:
 *  - Victory / Defeat heading with flavour text
 *  - Per-player stat summary (damage dealt, final HP, status)
 *  - Round count
 *  - "Return to Lobby" button that reloads the page for a clean slate
 *
 * Props:
 *   result    {object}  gameOverResult from engine state ({ winner, condition })
 *   players   {object}  keyed player map from engine state
 *   round     {number}  final round number
 *   blueprint {object}  campaign blueprint for flavour text
 */
export function GameOver({ result, players, round, blueprint }) {
  const isVictory = result?.winner === 'players';
  const flavourText = isVictory
    ? blueprint?.narrative?.victoryText || 'The hunt is over. Victory!'
    : blueprint?.narrative?.defeatText || 'The party has fallen. Defeat.';

  const playerList = Object.values(players || {});
  const totalDamage = playerList.reduce((sum, p) => sum + (p.damageDealt || 0), 0);

  function handleReturnToLobby() {
    // Hard reload — cleanest way to reset all React + network state
    window.location.href = '/';
  }

  return (
    <div className={styles.gameOverScreen}>
      <div className={styles.gameOverContent}>
        {/* Hero */}
        <div className={styles.gameOverHero}>
          <div className={styles.gameOverIcon} aria-hidden="true">
            {isVictory ? '🏆' : '💀'}
          </div>
          <h1 className={`${styles.gameOverTitle} ${isVictory ? styles.gameOverTitleVictory : styles.gameOverTitleDefeat}`}>
            {isVictory ? 'Victory!' : 'Defeat'}
          </h1>
          <p className={styles.gameOverFlavour}>{flavourText}</p>
          <div className={styles.gameOverRound}>Survived {round} round{round !== 1 ? 's' : ''}</div>
        </div>

        {/* Stats */}
        <div className={styles.gameOverStats}>
          <div className={styles.gameOverStatsTitle}>Party Summary</div>
          <div className={styles.gameOverStatsGrid}>
            {playerList.map(p => (
              <div key={p.id} className={`${styles.gameOverPlayerCard} ${!p.alive ? styles.gameOverPlayerCardDead : ''}`}>
                <span className={styles.gameOverPlayerIcon}>{p.classIcon || '🧑'}</span>
                <div className={styles.gameOverPlayerInfo}>
                  <div className={styles.gameOverPlayerName}>{p.name}</div>
                  <div className={styles.gameOverPlayerClass}>{p.className}</div>
                </div>
                <div className={styles.gameOverPlayerStats}>
                  <div className={styles.gameOverStatItem}>
                    <span className={styles.gameOverStatLabel}>DMG</span>
                    <span className={styles.gameOverStatValue}>{p.damageDealt || 0}</span>
                  </div>
                  <div className={styles.gameOverStatItem}>
                    <span className={styles.gameOverStatLabel}>HP</span>
                    <span className={`${styles.gameOverStatValue} ${!p.alive ? styles.gameOverStatDead : ''}`}>
                      {p.alive ? `${p.hp}/${p.maxHp}` : 'KO'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {playerList.length > 1 && (
            <div className={styles.gameOverTotalDmg}>
              Total damage dealt: <strong>{totalDamage}</strong>
            </div>
          )}
        </div>

        {/* Action */}
        <button className={styles.gameOverReturnBtn} onClick={handleReturnToLobby}>
          Return to Lobby
        </button>
      </div>
    </div>
  );
}
