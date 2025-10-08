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

export type GameState = {
    players: Player[];
    apples: Apple[];
    cells: (Piece | null)[][];
    ticksSinceApple: number;
    isPaused: boolean;
    resumeGracePeriodSeconds: number;
    connections: DataConnection[];
};

export type PlayerAction =
    | {
          type: 'join';
          payload: string;
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
    | { type: 'ADD_PLAYER'; payload: { playerId: string; username: string; connection: DataConnection } }
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
    cowColour: CowColour;
};
export type DeadPlayer = {
    id: string;
    username: string;
    score: number;
    isAlive: false;
};
export type Player = AlivePlayer | DeadPlayer;

export type CowColour = keyof typeof sprites.cow;
export const CowColours = Object.keys(sprites.cow) as CowColour[];

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
