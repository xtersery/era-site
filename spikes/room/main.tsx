// Services — full 360° editorial chamber. Storyboard page: seven DOM walls in a real
// 3D cylinder around the viewer; ?t= turns the room. Dev-only, no motion system.
import '@/styles/index.css';
import './room.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { RoomSpike } from './RoomSpike';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');
createRoot(container).render(
  <StrictMode>
    <RoomSpike />
  </StrictMode>,
);
