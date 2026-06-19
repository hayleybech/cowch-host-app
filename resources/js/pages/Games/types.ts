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
    clouds: Cloud[];
    honeyPatches: HoneyPatch[];
    milkPatches: MilkPatch[];
    hasStarted: boolean;
    isSuddenDeath: boolean;
    winner: Player | null;
};


export type PlayerAction =
    | {
          type: 'connect';
          payload: {
              uuid?: string;
              username: string;
          };
      }
    | {
          type: 'join';
          uuid: string;
          payload: {
              breed: CowBreed;
          };
      }
    | {
          type: 'move';
          uuid: string;
          payload: Direction;
      }
    | { type: 'drop_powerup', uuid: string }
    | { type: 'use_powerup', uuid: string }
    | { type: 'pause', uuid: string }
    | { type: 'start_game', uuid: string };

export type GameNotification =
    | { type: 'died' }
    | { type: 'paused' }
    | { type: 'resumed' }
    | { type: 'started' }
    | { type: 'powerup_stored' }
    | { type: 'powerup_used' }
    | { type: 'cowch_error', payload: string }
    | { type: 'joined'; payload: { breed: CowBreed } }
    | {
          type: 'connected';
          payload: {
              uuid: string;
              availableBreeds: CowBreed[];
              selectedBreed: CowBreed | null;
              hasStarted: boolean;
              isPaused: boolean;
              hasPowerup: boolean;
              isAlive: boolean;
              hasEnded: boolean;
              isWinner: boolean;
              winner: string | null;
          };
      }
    | { type: 'game_over'; payload: { winner: string | null } }
    | { type: 'player_joined'; payload: CowBreed[] };

export type GameAction =
    | {
          type: 'CONNECT_PLAYER';
          payload: { uuid: string|undefined; username: string; connection: DataConnection };
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
    connection: DataConnection;
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
    connection: DataConnection;
    score: number;
    isAlive: false;
    breed: CowBreed;
};
export type PendingPlayer = {
    uuid: string;
    peerId: string;
    username: string;
    connection: DataConnection;
    score: 0;
    isAlive: false;
    breed: null;
};
export type Player = AlivePlayer | DeadPlayer | PendingPlayer;

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

export type SpriteKey =
    | `cow.${CowBreed}.head`
    | `cow.${CowBreed}.middle`
    | `cow.${CowBreed}.bend`
    | `cow.${CowBreed}.tail`
    | `cow.${CowBreed}.sideView`
    | `food.${Food['type']}`
    | 'ground.grass';
