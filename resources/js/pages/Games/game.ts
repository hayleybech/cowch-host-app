import { getWeightedRandomElement } from '@/lib/utils';
import { config } from '@/pages/Games/config';
import {
    dash,
    getRandomPosition,
    getHitPiece,
    getTail,
    grow,
    isAlive,
    isCowInHoneyPatch,
    isCowInMilkPatch,
    isValidDirection,
    move,
    shiftPos,
    playerHasCollidedWithAnyFood,
    playerHasCollidedWithAnyWall,
    playerHasHeadbuttedAnyPlayer,
    posIsEqual
} from '@/pages/Games/cow';
import {
    AlivePlayer,
    CowBreeds,
    CowHead,
    CowMiddle,
    CowPiece,
    CowTail,
    Food,
    GameAction,
    GameNotification,
    GameState,
    Player,
    Position
} from '@/pages/Games/types';
import { DataConnection } from 'peerjs';
import { Dispatch } from 'react';

export function reducer(state: GameState, action: GameAction): GameState {
    if (action.type === 'CONNECT_PLAYER') {
        const nextConnections = [...state.connections, action.payload.connection];
        const nextPending = [
            ...state.pendingConnections,
            {
                id: action.payload.playerId,
                username: action.payload.username,
                connection: action.payload.connection,
            },
        ];

        const chosenBreeds = state.players.map((p) => p.breed);
        const availableBreeds = CowBreeds.filter((breed) => !chosenBreeds.includes(breed));

        action.payload.connection.send({ type: 'player_joined', payload: availableBreeds });
        action.payload.connection.send({ type: state.isPaused ? 'paused' : 'resumed' });

        return {
            ...state,
            connections: nextConnections,
            pendingConnections: nextPending,
        };
    }

    if (action.type === 'JOIN_PLAYER') {
        const initialDirection = 'right';
        const pending = state.pendingConnections.find((p) => p.id === action.payload.playerId);
        if (!pending) {
            return state;
        }

        const breedIsTaken = state.players.some((p) => p.breed === action.payload.breed);
        if (breedIsTaken) {
            return state;
        }

        broadcastTo(state.connections, pending.id, { type: 'joined' });
        broadcastTo(state.connections, pending.id, {
            type: 'changed_direction',
            payload: initialDirection,
        });

        const startXy = findAvailablePosition(state);

        const cowTail: CowTail = {
            type: 'tail',
            pos: {
                x: startXy.x - 2,
                y: startXy.y,
            },
            dir: initialDirection,
            nextPiece: undefined,
        };
        const cowMiddle: CowMiddle = {
            type: 'middle',
            pos: {
                x: startXy.x - 1,
                y: startXy.y,
            },
            dir: initialDirection,
            nextPiece: cowTail,
        };
        const head: CowHead = {
            type: 'head',
            pos: startXy,
            dir: initialDirection,
            nextPiece: cowMiddle,
        };
        const player: Player = {
            id: pending.id,
            username: pending.username,
            headPiece: head,
            score: 0,
            isAlive: true,
            breed: action.payload.breed,
            slowedTicks: 0,
            boostedTicks: 0,
            storedPowerup: null,
        };

        const nextPlayers = [...state.players, player];
        const nextPending = state.pendingConnections.filter((p) => p.id !== action.payload.playerId);

        const chosenBreeds = nextPlayers.map((p) => p.breed);
        const availableBreeds = CowBreeds.filter((breed) => !chosenBreeds.includes(breed));

        broadcastToAll(state.connections, {
            type: 'player_joined',
            payload: availableBreeds,
        });

        return {
            ...state,
            players: nextPlayers,
            pendingConnections: nextPending,
        };
    }

    if (action.type === 'CHANGE_DIRECTION') {
        const player = state.players.find((player) => player.id == action.payload.playerId);
        if (!player || !isAlive(player)) {
            return state;
        }

        const temp = [...state.players];

        if (!player || !player.headPiece || !player.headPiece.pos) {
            return state;
        }

        const requestedDir = action.payload.direction;

        // Validate input direction (prevent neck snapping)
        if (!isValidDirection(player.headPiece, requestedDir)) {
            return state;
        }

        player.headPiece.dir = requestedDir;
        broadcastTo(state.connections, player.id, {
            type: 'changed_direction',
            payload: requestedDir,
        });

        return {
            ...state,
            players: temp,
        };
    }

    if (action.type === 'UPDATE_PLAYERS') {
        return {
            ...state,
            players: action.payload,
        };
    }

    if (action.type === 'REMOVE_FOOD') {
        return {
            ...state,
            food: state.food.filter((f) => !posIsEqual(f.pos, action.payload)),
        };
    }

    if (action.type === 'SPAWN_FOOD') {
        if (state.ticksSinceFood < config.ticksPerFood) {
            return {
                ...state,
                ticksSinceFood: state.ticksSinceFood + 1,
            };
        }

        const food = [...state.food];
        const foodType = getWeightedRandomElement(config.foodWeights);

        food.push({
            type: foodType,
            pos: findAvailablePosition(state),
        });

        return {
            ...state,
            food: food,
            ticksSinceFood: 0,
        };
    }

    if (action.type === 'REQUEST_TOGGLE_PAUSE') {
        if (!state.isPaused) {
            broadcastToAll(state.connections, { type: 'paused' });
            return {
                ...state,
                isPaused: true,
            };
        }

        if (state.resumeGracePeriodSeconds > 0) {
            return state;
        }

        return {
            ...state,
            resumeGracePeriodSeconds: config.resumeGracePeriod,
        };
    }
    if (action.type === 'TICK_RESUME_COUNTDOWN') {
        const newValue = state.resumeGracePeriodSeconds - 1;
        if (newValue <= 0) {
            broadcastToAll(state.connections, { type: 'resumed' });
            return {
                ...state,
                isPaused: false,
                resumeGracePeriodSeconds: 0,
            };
        }
        return {
            ...state,
            resumeGracePeriodSeconds: newValue,
        };
    }

    if (action.type === 'DROP_TRAP') {
        const playerIdx = state.players.findIndex((p) => p.id === action.payload.playerId);
        const player = state.players[playerIdx];
        if (!player || !isAlive(player)) {
            return state;
        }

        const tail = getTail(player.headPiece);
        const updatedPlayers = [...state.players];
        updatedPlayers[playerIdx] = { ...player, storedPowerup: null };
        broadcastTo(state.connections, player.id, { type: 'powerup_used' });

        if (player.storedPowerup && player.storedPowerup.type === 'bean') {
            const newCloud = {
                pos: { ...tail.pos },
                ticksRemaining: config.cloudDurationTicks,
            };
            return {
                ...state,
                players: updatedPlayers,
                clouds: [...state.clouds, newCloud],
            };
        }

        if (player.storedPowerup && player.storedPowerup.type === 'honey') {
            const newHoneyPatch = {
                pos: { ...tail.pos },
                ticksRemaining: config.cloudDurationTicks,
            };

            return {
                ...state,
                players: updatedPlayers,
                honeyPatches: [...state.honeyPatches, newHoneyPatch],
            };
        }

    if (player.storedPowerup && player.storedPowerup.type === 'milk') {
            const newMilkPatch = {
                pos: { ...tail.pos },
                ticksRemaining: config.cloudDurationTicks,
            };

            return {
                ...state,
                players: updatedPlayers,
                milkPatches: [...state.milkPatches, newMilkPatch],
            };
        }

        return state;
    }

    if (action.type === 'APPLY_POWERUP') {
        const playerIdx = state.players.findIndex((p) => p.id === action.payload.playerId);
        const player = state.players[playerIdx];

        if (!player || !isAlive(player) || !player.storedPowerup) {
            return state;
        }

        const food = player.storedPowerup;
        const updatedPlayers = [...state.players];
        const updatedPlayer = { ...player, storedPowerup: null };
        updatedPlayers[playerIdx] = updatedPlayer;
        broadcastTo(state.connections, player.id, { type: 'powerup_used' });

        if (food.type === 'honey') {
            updatedPlayer.boostedTicks = 0;
            updatedPlayer.slowedTicks += config.slowedTicksDuration;
        }

        if (food.type === 'milk') {
            updatedPlayer.slowedTicks = 0;
            updatedPlayer.boostedTicks += config.boostedTicksDuration;
        }

        let updatedFood = [...state.food];
        if (food.type === 'bean') {
            updatedPlayer.headPiece = dash(updatedPlayer.headPiece, config.dashDistance);
            killRammedOpponents(updatedPlayer as AlivePlayer, updatedPlayers);
            updatedFood = removeTrampledFood(updatedPlayer as AlivePlayer, state.food);
        }

        return {
            ...state,
            players: updatedPlayers,
            food: updatedFood,
        };
    }

    if (action.type === 'TOGGLE_FREEZE_PLAYER') {
        const playerIdx = state.players.findIndex((p) => p.id === action.payload.playerId);
        const player = state.players[playerIdx];

        if (!player || !isAlive(player)) {
            return state;
        }

        const updatedPlayers = [...state.players];
        updatedPlayers[playerIdx] = { ...player, isFrozen: !player.isFrozen };
        return {
            ...state,
            players: updatedPlayers,
        };
    }

    if (action.type === 'TICK') {
        const updatedClouds = state.clouds
            .map((cloud) => ({
                ...cloud,
                ticksRemaining: cloud.ticksRemaining - 1,
            }))
            .filter((cloud) => cloud.ticksRemaining > 0);

        const updatedHoneyPatches = state.honeyPatches
            .map((patch) => ({
                ...patch,
                ticksRemaining: patch.ticksRemaining - 1,
            }))
            .filter((patch) => patch.ticksRemaining > 0);

        const updatedMilkPatches = state.milkPatches
            .map((patch) => ({
                ...patch,
                ticksRemaining: patch.ticksRemaining - 1,
            }))
            .filter((patch) => patch.ticksRemaining > 0);

        return {
            ...state,
            tickCount: state.tickCount + 1,
            clouds: updatedClouds,
            honeyPatches: updatedHoneyPatches,
            milkPatches: updatedMilkPatches,
        };
    }

    return state;
}

const killRammedOpponents = (
    player: AlivePlayer,
    updatedPlayers: Player[],
) => {
    // Check for collisions after teleporting
    // Kill other players that collide with any part of this cow
    updatedPlayers.forEach((otherPlayer, idx) => {
        if (otherPlayer.id === player.id || !isAlive(otherPlayer)) {
            return;
        }

        let hitPiece: CowPiece | undefined;
        let attackingPiece: CowPiece | undefined;

        // Check if any piece of the attacking player hit any piece of the other player
        let currentA: CowPiece | undefined = player.headPiece;
        while (currentA) {
            hitPiece = getHitPiece(currentA.pos, otherPlayer.headPiece);
            if (hitPiece) {
                attackingPiece = currentA;
                break;
            }
            currentA = currentA.nextPiece;
        }

        if (hitPiece && attackingPiece) {
            if (hitPiece === otherPlayer.headPiece || hitPiece === otherPlayer.headPiece.nextPiece) {
                updatedPlayers[idx] = {
                    ...otherPlayer,
                    isAlive: false,
                } as Player;
            } else {
                // Cut their tail off at the point of impact
                // Find the piece before the hit piece and make it the new tail
                let current: CowPiece = otherPlayer.headPiece;
                while (current.nextPiece && current.nextPiece !== hitPiece) {
                    current = current.nextPiece;
                }

                // If we found the piece before the hit piece
                if (current.nextPiece === hitPiece) {
                    // Detach the rest of the pieces (they will be garbage collected)
                    (current as unknown as CowTail).nextPiece = undefined;

                    // Mark as tail
                    (current as unknown as CowTail).type = 'tail';
                } else if (current === hitPiece) {
                    // This happens if the head piece itself was hit, but we already handled that above.
                    // Or if current is already a tail and was hit.
                    updatedPlayers[idx] = {
                        ...otherPlayer,
                        isAlive: false,
                    } as Player;
                }
            }
        }
    });
};

const removeTrampledFood = (
    player: AlivePlayer,
    food: Food[],
) => {
    // Remove any food that collides with any part of the cow
    return food.filter((f) => !cowHasPieceInPosition(player.headPiece, f.pos));
};

// findAvailablePosition
// @todo make this more efficient
// - this will become slower the less room there is on the board
// - it would be more performant to generate a list of possible positions,
//      then randomly choose from those.
const findAvailablePosition = (state: GameState) => {
    const pos = getRandomPosition();

    if(!positionHasPiece(state, pos)) {
        return pos;
    }
    return findAvailablePosition(state);
}

const positionHasPiece = (state: GameState, pos: Position) => {
    const posHasPlayer = state.players.some((player) => {
        if (!player.isAlive) {
            return false;
        }
        return cowHasPieceInPosition(player.headPiece, pos)
    });

    const posHasFood = state.food.some((piece) => {
        return posIsEqual(piece.pos, pos);
    });

    const posHasCloud = state.clouds.some((cloud) => {
        return posIsEqual(cloud.pos, pos);
    });

    const posHasHoney = state.honeyPatches.some((patch) => {
        return posIsEqual(patch.pos, pos);
    });

    const posHasMilk = state.milkPatches.some((patch) => {
        return posIsEqual(patch.pos, pos);
    });

    return posHasPlayer || posHasFood || posHasCloud || posHasHoney || posHasMilk;
}

const cowHasPieceInPosition = (piece: CowPiece, pos: Position) => {
    if(posIsEqual(piece.pos, pos)) {
        return true;
    }

    if(!piece.nextPiece) {
        return false;
    }

    return cowHasPieceInPosition(piece.nextPiece, pos);
}

const broadcastToAll = (connections: DataConnection[], action: GameNotification) => {
    connections.forEach((connection) => {
        connection.send(action);
    });
};

const broadcastTo = (connections: DataConnection[], peerId: string, action: GameNotification) => {
    connections.find((conn) => conn.peer === peerId)?.send(action);
};

export function movePlayers(state: GameState, dispatch: Dispatch<GameAction>) {
    // Calculate new player positions
    let players = state.players.map((player) => {
        if (!player.isAlive) {
            return player;
        }

        const tempPlayer = { ...player };

        if (tempPlayer.isFrozen) {
            return tempPlayer;
        }

        // Regular speed
        let moveThisTick = state.tickCount % config.ticksPerRegularMove === 0;

        // Boosted speed
        if (tempPlayer.boostedTicks > 0) {
            tempPlayer.boostedTicks--;
            moveThisTick = state.tickCount % config.ticksPerBoostMove === 0;
        }

        // Slowed speed
        if (tempPlayer.slowedTicks > 0) {
            tempPlayer.slowedTicks--;
            // Slowed speed is moving every 4th tick
            moveThisTick = state.tickCount % config.ticksPerSlowMove === 0;
        }

        // Honey patch slow
        const isInHoneyPatch = state.honeyPatches.some((patch) =>
            isCowInHoneyPatch(tempPlayer.headPiece, patch.pos, config.honeyPatchRadius),
        );

        if (isInHoneyPatch) {
            console.log('player is in honey patch');
            moveThisTick = state.tickCount % config.ticksPerSlowMove === 0;
        }

        // Milk patch fast
        const isInMilkPatch = state.milkPatches.some((patch) =>
            isCowInMilkPatch(tempPlayer.headPiece, patch.pos, config.milkPatchRadius),
        );

        if (isInMilkPatch) {
            console.log('player is in milk patch');
            moveThisTick = state.tickCount % config.ticksPerBoostMove === 0;
        }

        if (!moveThisTick) {
            return tempPlayer;
        }

        return {
            ...tempPlayer,
            headPiece: move(state.food, player.headPiece),
        }
    });

    // Check collisions with food
    players = players.map((player) => {
        if (!isAlive(player)) {
            return player;
        }

        // Check for food
        const foodCollided = playerHasCollidedWithAnyFood(player.headPiece.pos, state.food);
        if (player.headPiece && foodCollided) {
            // Remove Food
            dispatch({ type: 'REMOVE_FOOD', payload: { x: foodCollided.pos.x, y: foodCollided.pos.y } });

            // Grow tail
            const playerOld = state.players.find((playerA) => playerA.id === player.id) as AlivePlayer;
            grow(player, playerOld);

            if (foodCollided.type === 'tuft') {
                // Tuft is eaten immediately
                return player
            }

            // Store powerup for later
            player.storedPowerup = foodCollided;
            broadcastTo(state.connections, player.id, { type: 'powerup_stored' });
        }
        return player;
    });

    // Check collisions with players and walls
    players = players.map((player) => {
        if (!player.isAlive) {
            return player;
        }

        if (playerHasHeadbuttedAnyPlayer(player, players) || playerHasCollidedWithAnyWall(player)) {
            return {
                ...player,
                isAlive: false,
                headPiece: undefined,
            };
        }

        return player;
    });

    // Commit new positions
    dispatch({ type: 'UPDATE_PLAYERS', payload: players });
}
