import { sprites } from '@/pages/games/config';
import { Direction } from '@/pages/games/cow';
import { DataConnection } from 'peerjs';

export type Piece = Apple | CowHead | CowMiddle | CowTail;
export type Apple = {
    type: 'apple';
    pos: Position;
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
    food: Apple[];
    cells: Cell[][];
    ticksSinceApple: number;
    isPaused: boolean;
    resumeGracePeriodSeconds: number;
    connections: DataConnection[];
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
    | { type: 'pause' };

export type GameNotification =
    | { type: 'paused' }
    | { type: 'resumed' }
    | { type: 'changed_direction'; payload: Direction };

export type GameAction =
    | {
          type: 'ADD_PLAYER';
          payload: { playerId: string; username: string; breed: CowBreed; connection: DataConnection };
      }
    | { type: 'CHANGE_DIRECTION'; payload: { playerId: string; direction: Direction } }
    | { type: 'UPDATE_PLAYERS'; payload: Player[] }
    | { type: 'SPAWN_APPLE' }
    | { type: 'REMOVE_APPLE'; payload: Position }
    | { type: 'REQUEST_TOGGLE_PAUSE' }
    | { type: 'TICK_RESUME_COUNTDOWN' };

export type AlivePlayer = {
    id: string;
    username: string;
    score: number;
    isAlive: true;
    headPiece: CowHead;
    breed: CowBreed;
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
