import { clamp, getRandomNumber } from '@/lib/utils';
import { Apple, Position } from '@/pages/games/board';
import { config } from './config';

export type Player = {
    id: string;
    username: string;
    headPiece?: CowHead;
    score: number;
    isAlive: boolean;
};
export type CowPos = {
    x: number;
    y: number;
    dir: Direction;
};
export type CowPiece = CowHead | CowMiddle | CowTail;
export type CowHead = {
    type: 'head';

    pos: Position;
    dir: Direction; // The direction the piece is queued to move on its NEXT frame

    // Linked list of bits of cow. Thanks, bachelor degree!
    // @todo narrow to exclude CowHead
    nextPiece?: CowPiece;
};
export type CowMiddle = {
    type: 'middle';
    pos: Position;
    dir: Direction;
    nextPiece?: CowPiece;
};
export type CowTail = {
    type: 'tail';
    pos: Position;
    dir: Direction;
    nextPiece?: CowPiece; // @todo narrow exclude nextPiece on CowTail
};
export const chooseStartPos = (): Position => ({
    x: getRandomNumber(2, config.cols - 2), // Ensure tail doesn't spawn off left edge (all players spawn facing right)
    y: getRandomNumber(1, config.rows - 2),
});

export const move = (apples: Apple[], piece?: CowPiece, queueDir?: Direction) => {
    if (!piece || !piece.pos) {
        return piece;
    }

    const newPiece = { ...piece };
    newPiece.pos = shiftPos(newPiece.pos, newPiece.dir);

    // Queue the piece to move in the direction its parent piece just moved
    newPiece.dir = queueDir ?? newPiece.dir; // If undefined, assume headPiece and keep moving straight

    // Recursively move the next piece(s)
    newPiece.nextPiece = move(apples, newPiece.nextPiece, piece.dir);

    return newPiece;
};

const shiftPos = (pos: Position, dir: Direction): Position => {
    if (dir === 'up') {
        return {
            x: pos.x,
            y: clamp(pos.y - 1, 0, config.cols - 1),
        };
    }
    if (dir === 'right') {
        return {
            x: clamp(pos.x + 1, 0, config.rows - 1),
            y: pos.y,
        };
    }
    if (dir === 'down') {
        return {
            x: pos.x,
            y: clamp(pos.y + 1, 0, config.cols - 1),
        };
    }

    return {
        x: clamp(pos.x - 1, 0, config.rows - 1),
        y: pos.y,
    };
};
export type Direction = 'up' | 'down' | 'right' | 'left';

export function playerHasCollidedWithAnyApple(playerPos: Position, apples: Apple[]): Apple | undefined {
    return apples.find((apple) => posIsEqual(playerPos, apple.pos));
}

export function getSecondLastPiece(piece: CowPiece, prevPiece: CowPiece): CowPiece {
    if (!piece.nextPiece) {
        return prevPiece;
    }
    return getSecondLastPiece(piece.nextPiece, piece);
}

export function playerHasCollidedWithAnyPlayer(playerA: Player, players: Player[]): boolean {
    return players.some((playerB) => playerHasCollidedWithPlayer(playerA, playerB));
}

function playerHasCollidedWithPlayer(playerA: Player, playerB: Player): boolean {
    if (!playerA.headPiece || !playerA.headPiece.pos || !playerB.headPiece || !playerB.headPiece.pos) {
        return false;
    }
    if (playerA.headPiece !== playerB.headPiece && posIsEqual(playerA.headPiece.pos, playerB.headPiece.pos)) {
        return true;
    }
    if (!playerB.headPiece.nextPiece) {
        return false;
    }
    return playerHasCollidedWithPiece(playerA.headPiece.pos, playerB.headPiece.nextPiece);
}

function playerHasCollidedWithPiece(playerAHeadPos: Position, piece: CowPiece): boolean {
    if (!piece.pos) {
        return false;
    }

    if (posIsEqual(playerAHeadPos, piece.pos)) {
        return true;
    }

    if (!piece.nextPiece) {
        return false;
    }

    return playerHasCollidedWithPiece(playerAHeadPos, piece.nextPiece);
}

export function playerHasCollidedWithAnyWall(player: Player): boolean {
    return (
        (player.headPiece?.pos?.x as number) < 0 ||
        (player.headPiece?.pos?.x as number) >= config.cols ||
        (player.headPiece?.pos?.y as number) < 0 ||
        (player.headPiece?.pos?.y as number) > config.rows
    );
}

function posIsEqual(posA: Position, posB: Position): boolean {
    return posA.x === posB.x && posA.y === posB.y;
}
