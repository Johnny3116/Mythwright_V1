import { createContext, useContext, useReducer } from 'react';

// TODO: Implement full state and reducer in Phase 4

const GameContext = createContext(null);

export function GameProvider({ children }) {
  return (
    <GameContext.Provider value={null}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
}
