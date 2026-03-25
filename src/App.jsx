import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LobbyView from '@views/lobby/LobbyView.jsx';
import CharacterSelect from '@views/character/CharacterSelect.jsx';
import GameView from '@views/game/GameView.jsx';
import HostView from '@views/host/HostView.jsx';
import ComponentDemo from '@views/_dev/ComponentDemo.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LobbyView />} />
        <Route path="/character-select" element={<CharacterSelect />} />
        <Route path="/game" element={<GameView />} />
        <Route path="/host" element={<HostView />} />
        <Route path="/demo" element={<ComponentDemo />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
