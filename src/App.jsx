import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider } from '@context/GameContext.jsx';
import { NetworkProvider } from '@context/NetworkContext.jsx';
import { ToastProvider } from '@context/ToastContext.jsx';
import { ToastContainer } from '@components/ToastContainer.jsx';
import LobbyView from '@views/lobby/LobbyView.jsx';
import CharacterSelect from '@views/character/CharacterSelect.jsx';
import GameView from '@views/game/GameView.jsx';
import HostView from '@views/host/HostView.jsx';

export default function App() {
  return (
    <ToastProvider>
      <GameProvider>
        <NetworkProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LobbyView />} />
              <Route path="/character-select" element={<CharacterSelect />} />
              <Route path="/game" element={<GameView />} />
              <Route path="/host" element={<HostView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <ToastContainer />
          </BrowserRouter>
        </NetworkProvider>
      </GameProvider>
    </ToastProvider>
  );
}
