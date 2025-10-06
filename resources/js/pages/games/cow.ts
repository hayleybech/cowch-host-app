import { clamp, getRandomNumber } from '@/lib/utils';
import { Apple } from '@/pages/games/board';
import { cols, rows } from '@/pages/games/config';

export type Player = {
    id: string;
    username: string;
    headPiece?: CowHead;
    pos?: CowPos;
    score: number;
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
    x: getRandomNumber(2, cols - 2), // Ensure tail doesn't spawn off left edge (all players spawn facing right)
    y: getRandomNumber(1, rows - 2),
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
        newPos.y = clamp(pos.y - 1, 0, cols - 1);
        return newPos;
    }
    if (pos.dir === 'right') {
        newPos.x = clamp(pos.x + 1, 0, rows - 1);
        return newPos;
    }
    if (pos.dir === 'down') {
        newPos.y = clamp(pos.y + 1, 0, cols - 1);
        return newPos;
    }

    newPos.x = clamp(pos.x - 1, 0, rows - 1);
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
