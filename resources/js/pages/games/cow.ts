import { getRandomNumber } from '@/lib/utils';
import { config } from './config';
import { AlivePlayer, Apple, CowPiece, Player, Position } from './types';

export const chooseStartPos = (): Position => ({
    x: getRandomNumber(2, config.cols - 2), // Ensure tail doesn't spawn off left edge (all players spawn facing right)
    y: getRandomNumber(1, config.rows - 2),
});

export const move = <T extends CowPiece>(apples: Apple[], piece: T, queueDir?: Direction): T => {
    const newPiece = { ...piece };
    newPiece.pos = shiftPos(newPiece.pos, newPiece.dir);

    // Queue the piece to move in the direction its parent piece just moved
    newPiece.dir = queueDir ?? newPiece.dir; // If undefined, assume headPiece and keep moving straight

    // Recursively move the next piece(s)
    if (newPiece.type !== 'tail') {
        newPiece.nextPiece = move(apples, newPiece.nextPiece, piece.dir);
    }

    return newPiece;
};

const shiftPos = (pos: Position, dir: Direction): Position => {
    if (dir === 'up') {
        return {
            x: pos.x,
            y: pos.y - 1,
        };
    }
    if (dir === 'right') {
        return {
            x: pos.x + 1,
            y: pos.y,
        };
    }
    if (dir === 'down') {
        return {
            x: pos.x,
            y: pos.y + 1,
        };
    }

    // left
    return {
        x: pos.x - 1,
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

export function playerHasCollidedWithAnyPlayer(playerA: AlivePlayer, players: Player[]): boolean {
    return players.some((playerB) => playerHasCollidedWithPlayer(playerA, playerB));
}

function playerHasCollidedWithPlayer(playerA: AlivePlayer, playerB: Player): boolean {
    if (!isAlive(playerA) || !isAlive(playerB)) {
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

export function playerHasCollidedWithAnyWall(player: AlivePlayer): boolean {
    return (
        player.headPiece.pos.x < 0 ||
        player.headPiece.pos.x >= config.cols ||
        player.headPiece.pos.y < 0 ||
        player.headPiece.pos.y >= config.rows
    );
}

function posIsEqual(posA: Position, posB: Position): boolean {
    return posA.x === posB.x && posA.y === posB.y;
}

export function isAlive(player: Player): player is AlivePlayer {
    return player.isAlive;
}

export function shouldUseStraightPiece(piece: CowPiece, prevPiece: CowPiece, nextPiece: CowPiece): boolean {
    return prevPiece.pos.x === nextPiece.pos.x || prevPiece.pos.y === nextPiece.pos.y;
}

// Rotates the "bend" sprite to connect to the leading and trailing pieces
export function getRotationFromSurroundingPieces(piece: CowPiece, prevPiece: CowPiece, nextPiece: CowPiece): string {
    if (
        (prevPiece.pos.x > piece.pos.x && nextPiece.pos.y > piece.pos.y) ||
        (nextPiece.pos.x > piece.pos.x && prevPiece.pos.y > piece.pos.y)
    ) {
        return 'rotate-0';
    }
    if (
        (prevPiece.pos.y > piece.pos.y && nextPiece.pos.x < piece.pos.x) ||
        (nextPiece.pos.y > piece.pos.y && prevPiece.pos.x < piece.pos.x)
    ) {
        return 'rotate-90';
    }
    if (
        (prevPiece.pos.y < piece.pos.y && nextPiece.pos.x < piece.pos.x) ||
        (nextPiece.pos.y < piece.pos.y && prevPiece.pos.x < piece.pos.x)
    ) {
        return 'rotate-180';
    }
    return 'rotate-270';
}
