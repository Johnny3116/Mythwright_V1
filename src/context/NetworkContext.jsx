import { createContext, useContext } from 'react';

// TODO: Implement full network state in Phase 4

const NetworkContext = createContext(null);

export function NetworkProvider({ children }) {
  return (
    <NetworkContext.Provider value={null}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetworkContext() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetworkContext must be used within a NetworkProvider');
  }
  return context;
}
