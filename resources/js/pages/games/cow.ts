import { clamp, getRandomNumber } from '@/lib/utils';
import { Apple } from '@/pages/games/board';
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
    dir: Direction; // The direction the piece is queued to move on its NEXT frame
};
export type CowPiece = CowHead | CowMiddle | CowTail;
export type CowHead = {
    type: 'head';

    player: Player;

    pos?: CowPos;

    // Linked list of bits of cow. Thanks, bachelor degree!
    // @todo narrow to exclude CowHead
    nextPiece?: CowPiece;
};
export type CowMiddle = {
    type: 'middle';
    pos: CowPos;
    nextPiece?: CowPiece;
};
export type CowTail = {
    type: 'tail';
    pos: CowPos;
    nextPiece?: CowPiece; // @todo narrow exclude nextPiece on CowTail
};
export const chooseStartPos = () => ({
    x: getRandomNumber(2, config.cols - 2), // Ensure tail doesn't spawn off left edge (all players spawn facing right)
    y: getRandomNumber(1, config.rows - 2),
});

export const move = (apples: Apple[], piece?: CowPiece, queueDir?: Direction) => {
    if (!piece || !piece.pos) {
        return piece;
    }

    const newPiece = { ...piece };
    newPiece.pos = shiftPos(newPiece.pos as CowPos);

    // Queue the piece to move in the direction its parent piece just moved
    newPiece.pos.dir = queueDir ?? newPiece.pos.dir; // If undefined, assume headPiece and keep moving straight

    // Recursively move the next piece(s)
    newPiece.nextPiece = move(apples, newPiece.nextPiece, piece.pos.dir);

    return newPiece;
};

const shiftPos = (pos: CowPos): CowPos => {
    const newPos = {
        x: pos.x,
        y: pos.y,
        dir: pos.dir,
    };
    if (pos.dir === 'up') {
        newPos.y = clamp(pos.y - 1, 0, config.cols - 1);
        return newPos;
    }
    if (pos.dir === 'right') {
        newPos.x = clamp(pos.x + 1, 0, config.rows - 1);
        return newPos;
    }
    if (pos.dir === 'down') {
        newPos.y = clamp(pos.y + 1, 0, config.cols - 1);
        return newPos;
    }

    newPos.x = clamp(pos.x - 1, 0, config.rows - 1);
    return newPos;
};
export type Direction = 'up' | 'down' | 'right' | 'left';

export function playerHasCollidedWithAnyApple(pos: CowPos, apples: Apple[]): Apple | undefined {
    return apples.find((apple) => apple.x === pos.x && apple.y === pos.y);
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

function playerHasCollidedWithPiece(playerAHeadPos: CowPos, piece: CowPiece): boolean {
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

function posIsEqual(posA: CowPos, posB: CowPos): boolean {
    return posA.x === posB.x && posA.y === posB.y;
}
