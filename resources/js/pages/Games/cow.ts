import { getRandomNumber } from '@/lib/utils';
import { config } from './config';
import { AlivePlayer, CowHead, CowPiece, CowTail, Food, Player, Position } from './types';

export const getRandomPosition = (): Position => ({
    x: getRandomNumber(2, config.cols - 2), // Ensure tail doesn't spawn off left edge (all players spawn facing right)
    y: getRandomNumber(1, config.rows - 2),
});

export const move = <T extends CowPiece>(food: Food[], piece: T, queueDir?: Direction): T => {
    const newPiece = { ...piece };
    newPiece.pos = shiftPos(newPiece.pos, newPiece.dir);

    // Queue the piece to move in the direction its parent piece just moved
    newPiece.dir = queueDir ?? newPiece.dir; // If undefined, assume headPiece and keep moving straight

    // Recursively move the next piece(s)
    if (newPiece.type !== 'tail') {
        newPiece.nextPiece = move(food, newPiece.nextPiece, piece.dir);
    }

    return newPiece;
};

export const shiftPos = (pos: Position, dir: Direction): Position => {
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

export const dash = <T extends CowPiece>(piece: T, distance: number): T => {
    let currentPiece = piece;
    for (let i = 0; i < distance; i++) {
        currentPiece = move([], currentPiece);
    }

    return currentPiece;
};

export type Direction = 'up' | 'down' | 'right' | 'left';

export function playerHasCollidedWithAnyFood(playerPos: Position, food: Food[]): Food | undefined {
    return food.find((f) => posIsEqual(playerPos, f.pos));
}

export function getTail(piece: CowPiece): CowTail {
    if (piece.type === 'tail') {
        return piece;
    }
    return getTail(piece.nextPiece);
}

export function getSecondLastPiece(piece: CowPiece, prevPiece: CowPiece): CowPiece {
    if (!piece.nextPiece) {
        return prevPiece;
    }
    return getSecondLastPiece(piece.nextPiece, piece);
}

export function playerHasHeadbuttedAnyPlayer(playerA: AlivePlayer, players: Player[]): boolean {
    return players.some((playerB) => playerHasHeadbuttedPlayer(playerA, playerB));
}

export function playerHasHeadbuttedPlayer(playerA: AlivePlayer, playerB: Player): boolean {
    if (!isAlive(playerA) || !isAlive(playerB)) {
        return false;
    }

    // Check if any piece of playerA overlaps with any piece of playerB
    let currentA: CowPiece | undefined = playerA.headPiece;
    while (currentA) {
        const hitPiece = getHitPiece(currentA.pos, playerB.headPiece);
        if (hitPiece) {
            // Self-collision check
            if (playerA.uuid === playerB.uuid) {
                if (currentA !== hitPiece) {
                    return true;
                }
            } else {
                return true;
            }
        }
        currentA = currentA.nextPiece;
    }

    return false;
}

export function getHitPiece(playerAHeadPos: Position, piece: CowPiece): CowPiece | undefined {
    if (posIsEqual(playerAHeadPos, piece.pos)) {
        return piece;
    }

    if (!piece.nextPiece) {
        return undefined;
    }

    return getHitPiece(playerAHeadPos, piece.nextPiece);
}

export function playerHasCollidedWithAnyWall(player: AlivePlayer): boolean {
    return (
        player.headPiece.pos.x < 0 ||
        player.headPiece.pos.x >= config.cols ||
        player.headPiece.pos.y < 0 ||
        player.headPiece.pos.y >= config.rows
    );
}

export function grow(player: AlivePlayer, oldPlayer: AlivePlayer): void {
    const slpOld = getSecondLastPiece(oldPlayer.headPiece.nextPiece, oldPlayer.headPiece);
    const slpCurrent = getSecondLastPiece(player.headPiece.nextPiece as CowPiece, player.headPiece);

    slpCurrent.nextPiece = {
        type: 'middle',
        pos: { ...(slpOld.pos as Position) },
        dir: slpOld.dir as Direction,
        nextPiece: {
            type: 'tail',
            pos: { ...(slpOld.nextPiece?.pos as Position) },
            dir: slpOld.nextPiece?.dir as Direction,
            nextPiece: undefined,
        },
    };
    player.score++;
}

export function posIsEqual(posA: Position, posB: Position): boolean {
    return posA.x === posB.x && posA.y === posB.y;
}

export function isAlive(player: Player): player is AlivePlayer {
    return player.isAlive;
}

export function isCowInHoneyPatch(headPiece: CowHead, patchPos: Position, radius: number): boolean {
    const dx = headPiece.pos.x - patchPos.x;
    const dy = headPiece.pos.y - patchPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= radius;
}

export function isCowInMilkPatch(headPiece: CowHead, patchPos: Position, radius: number): boolean {
    const dx = headPiece.pos.x - patchPos.x;
    const dy = headPiece.pos.y - patchPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= radius;
}

export function isValidDirection(headPiece: CowHead, requestedDir: Direction): boolean {
    const neckPiece = headPiece.nextPiece;
    if (!neckPiece) {
        return true;
    }

    const headPos = headPiece.pos;
    const neckPos = neckPiece.pos;

    if (requestedDir === 'up' && neckPos.y < headPos.y) {
        return false;
    }
    if (requestedDir === 'down' && neckPos.y > headPos.y) {
        return false;
    }
    if (requestedDir === 'left' && neckPos.x < headPos.x) {
        return false;
    }
    if (requestedDir === 'right' && neckPos.x > headPos.x) {
        return false;
    }

    return true;
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
