import { createContext } from 'react';
import { Player } from '../types/dnd';

export const PlayerContext = createContext<Player | null>(null);