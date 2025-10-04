import { clamp, getRandomNumber } from '@/lib/utils';
import { Piece } from '@/pages/games/board';
import { cols, rows } from '@/pages/games/config';

export type Player = {
    id: string;
    username: string;
    headPiece?: CowHead;
    pos?: CowPos;
};
type CowPos = {
    x: number;
    y: number;
    dir: Direction; // The direction the piece is queued to move on its NEXT frame
};
export type CowPiece = CowHead | CowMiddle | CowTail;
export type CowHead = {
    type: 'head';

    // references back up to Player. could be replaced with a direct reference to Player.
    playerId: string;

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
    x: getRandomNumber(1, cols - 2),
    y: getRandomNumber(1, rows - 2),
});
export const move = (cells: (Piece | null)[][], piece?: CowPiece, queueDir?: Direction) => {
    if (!piece || !piece.pos) {
        return piece;
    }

    const newPiece = { ...piece };
    newPiece.pos = shiftPos(newPiece.pos as CowPos);

    // Remove from old cell
    cells[piece.pos.y][piece.pos.x] = null;

    // Check for apple
    let grew = false;
    if (newPiece.type === 'head' && cells[newPiece.pos.y][newPiece.pos.x]?.type === 'apple') {
        // Grow
        const newMiddle: CowMiddle = {
            type: 'middle',
            pos: { ...piece.pos },
            nextPiece: piece.nextPiece,
        };
        newPiece.nextPiece = newMiddle;
        cells[piece.pos.y][piece.pos.x] = newMiddle;
        grew = true;
    }

    // Put in new cell
    cells[newPiece.pos.y][newPiece.pos.x] = newPiece;

    // Queue the piece to move in the direction its parent piece just moved
    newPiece.pos.dir = queueDir ?? newPiece.pos.dir; // If undefined, assume headPiece and keep moving straight

    // Recursively move the next piece(s)
    if (!grew) {
        newPiece.nextPiece = move(cells, newPiece.nextPiece, piece.pos.dir);
    }
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
