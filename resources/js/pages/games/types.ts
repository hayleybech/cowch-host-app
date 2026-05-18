import { sprites } from '@/pages/games/config';
import { Direction } from '@/pages/games/cow';
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

export type GameState = {
    players: Player[];
    food: Food[];
    cells: Cell[][];
    tickCount: number;
    ticksSinceFood: number;
    isPaused: boolean;
    resumeGracePeriodSeconds: number;
    connections: DataConnection[];
    clouds: Cloud[];
};

export type PlayerAction =
    | {
          type: 'join';
          payload: {
              username: string;
              breed: CowBreed;
          };
      }
    | {
          type: 'move';
          payload: Direction;
      }
    | { type: 'drop' }
    | { type: 'pause' };

export type GameNotification =
    | { type: 'paused' }
    | { type: 'resumed' }
    | { type: 'powerup_stored' }
    | { type: 'powerup_used' }
    | { type: 'changed_direction'; payload: Direction };

export type GameAction =
    | {
          type: 'ADD_PLAYER';
          payload: { playerId: string; username: string; breed: CowBreed; connection: DataConnection };
      }
    | { type: 'CHANGE_DIRECTION'; payload: { playerId: string; direction: Direction } }
    | { type: 'UPDATE_PLAYERS'; payload: Player[] }
    | { type: 'SPAWN_FOOD' }
    | { type: 'REMOVE_FOOD'; payload: Position }
    | { type: 'REQUEST_TOGGLE_PAUSE' }
    | { type: 'TICK_RESUME_COUNTDOWN' }
    | { type: 'DROP_TRAP'; payload: { playerId: string } }
    | { type: 'TICK' };

export type AlivePlayer = {
    id: string;
    username: string;
    score: number;
    isAlive: true;
    headPiece: CowHead;
    breed: CowBreed;
    slowedTicks: number;
    boostedTicks: number;
    canDropCloud: boolean;
};
export type DeadPlayer = {
    id: string;
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
