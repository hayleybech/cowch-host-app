import { sprites } from '@/pages/Games/config';
import { Direction } from '@/pages/Games/cow';
import { DataConnection } from 'peerjs';

export type Piece = Tuft | Honey | Milk | Bean | CowHead | CowMiddle | CowTail;
export type Food = Tuft | Honey | Milk | Bean;
export type Tuft = {
    type: 'tuft';
    pos: Position;
};

export type Honey = {
    type: 'honey';
    pos: Position;
};

export type Milk = {
    type: 'milk';
    pos: Position;
};

export type Bean = {
    type: 'bean';
    pos: Position;
};

export type Cloud = {
    pos: Position;
    ticksRemaining: number;
};

export type Position = {
    x: number;
    y: number;
};

export type Cell = {
    rotation: string;
};

export type HoneyPatch = {
    pos: Position;
    ticksRemaining: number;
};

export type MilkPatch = {
    pos: Position;
    ticksRemaining: number;
};

export type GameState = {
    players: Player[];
    food: Food[];
    cells: Cell[][];
    tickCount: number;
    ticksSinceFood: number;
    isPaused: boolean;
    resumeGracePeriodSeconds: number;
    connections: DataConnection[];
    pendingConnections: PendingConnection[];
    clouds: Cloud[];
    honeyPatches: HoneyPatch[];
    milkPatches: MilkPatch[];
    hasStarted: boolean;
    isSuddenDeath: boolean;
    winner: Player | null;
};

export type PendingConnection = {
    uuid: string;
    peerId: string;
    username: string;
    connection: DataConnection;
};

export type PlayerAction =
    | {
          type: 'connect';
          payload: {
              username: string;
          };
      }
    | {
          type: 'join';
          payload: {
              breed: CowBreed;
          };
      }
    | {
          type: 'move';
          payload: Direction;
      }
    | { type: 'drop_powerup' }
    | { type: 'use_powerup' }
    | { type: 'pause' }
    | { type: 'start_game' };

export type GameNotification =
    | { type: 'died' }
    | { type: 'paused' }
    | { type: 'resumed' }
    | { type: 'started' }
    | { type: 'powerup_stored' }
    | { type: 'powerup_used' }
    | { type: 'joined'; payload: { breed: CowBreed } }
    | { type: 'connected'; payload: string } // UUID
    | { type: 'game_over'; payload: { winner: string | null } }
    | { type: 'player_joined'; payload: CowBreed[] };

export type GameAction =
    | {
          type: 'CONNECT_PLAYER';
          payload: { uuid: string; username: string; connection: DataConnection };
      }
    | {
          type: 'JOIN_PLAYER';
          payload: { uuid: string; breed: CowBreed };
      }
    | { type: 'CHANGE_DIRECTION'; payload: { uuid: string; direction: Direction } }
    | { type: 'UPDATE_PLAYERS'; payload: Player[] }
    | { type: 'SPAWN_FOOD' }
    | { type: 'REMOVE_FOOD'; payload: Position }
    | { type: 'REQUEST_TOGGLE_PAUSE'; payload?: { uuid: string } }
    | { type: 'TICK_RESUME_COUNTDOWN' }
    | { type: 'DROP_TRAP'; payload: { uuid: string } }
    | { type: 'APPLY_POWERUP'; payload: { uuid: string } }
    | { type: 'TOGGLE_FREEZE_PLAYER'; payload: { uuid: string } }
    | { type: 'START_GAME' }
    | { type: 'REQUEST_START_GAME' }
    | { type: 'TICK' };

export type AlivePlayer = {
    uuid: string;
    peerId: string;
    username: string;
    score: number;
    isAlive: true;
    headPiece: CowHead;
    breed: CowBreed;
    slowedTicks: number;
    boostedTicks: number;
    storedPowerup: Food | null;
    isFrozen?: boolean;
};
export type DeadPlayer = {
    uuid: string;
    peerId: string;
    username: string;
    score: number;
    isAlive: false;
    breed: CowBreed;
};
export type Player = AlivePlayer | DeadPlayer;

export type CowBreed = keyof typeof sprites.cow;
export const CowBreeds = Object.keys(sprites.cow) as CowBreed[];

export type CowPiece = CowHead | CowMiddle | CowTail;
export type CowHead = {
    type: 'head';

    pos: Position;
    dir: Direction; // The direction the piece is queued to move on its NEXT frame

    // Linked list of bits of cow. Thanks, bachelor degree!
    // @todo narrow to exclude CowHead
    nextPiece: CowPiece;
};
export type CowMiddle = {
    type: 'middle';
    pos: Position;
    dir: Direction;
    nextPiece: CowPiece;
};
export type CowTail = {
    type: 'tail';
    pos: Position;
    dir: Direction;
    nextPiece: undefined;
};
