import { getWeightedRandomElement } from '@/lib/utils';
import { config } from '@/pages/Games/config';
import {
    getRandomPosition,
    grow,
    isAlive,
    isValidDirection,
    isCowInHoneyPatch,
    move,
    getTail,
    playerHasCollidedWithAnyFood,
    playerHasCollidedWithAnyPlayer,
    playerHasCollidedWithAnyWall, posIsEqual
} from '@/pages/Games/cow';
import {
    AlivePlayer,
    CowBreeds,
    CowHead,
    CowMiddle,
    CowPiece,
    CowTail,
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
        const player = state.players.find((p) => p.id === action.payload.playerId);
        if (!player || !isAlive(player)) {
            return state;
        }

        console.log('drop trap', 'state', state);
        if (player.storedPowerup && player.storedPowerup.type === 'bean') {
            const tail = getTail(player.headPiece);
            const newCloud = {
                pos: { ...tail.pos },
                ticksRemaining: config.cloudDurationTicks,
            };

            const updatedPlayers = state.players.map((p) => {
                if (p.id === action.payload.playerId && isAlive(p)) {
                    broadcastTo(state.connections, p.id, { type: 'powerup_used' });
                    return { ...p, storedPowerup: null };
                }
                return p;
            });

            return {
                ...state,
                players: updatedPlayers,
                clouds: [...state.clouds, newCloud],
            };
        }

        if (player.storedPowerup && player.storedPowerup.type === 'honey') {
            const tail = getTail(player.headPiece);
            const newHoneyPatch = {
                pos: { ...tail.pos },
                ticksRemaining: config.cloudDurationTicks,
            };

            const updatedPlayers = state.players.map((p) => {
                if (p.id === action.payload.playerId && isAlive(p)) {
                    broadcastTo(state.connections, p.id, { type: 'powerup_used' });
                    return { ...p, storedPowerup: null };
                }
                return p;
            });

            return {
                ...state,
                players: updatedPlayers,
                honeyPatches: [...state.honeyPatches, newHoneyPatch],
            };
        }

        if (player.storedPowerup && player.storedPowerup.type === 'milk') {
            // @todo
        }

        return state;
    }

    if (action.type === 'APPLY_POWERUP') {
        const player = state.players.find((p) => p.id === action.payload.playerId);
        if (!player || !isAlive(player) || !player.storedPowerup) {
            return state;
        }

        const food = player.storedPowerup;
        const updatedPlayers = state.players.map((p) => {
            if (p.id === action.payload.playerId && isAlive(p)) {
                const nextPlayer = { ...p, storedPowerup: null };
                broadcastTo(state.connections, p.id, { type: 'powerup_used' });

                if (food.type === 'honey') {
                    nextPlayer.boostedTicks = 0;
                    nextPlayer.slowedTicks += config.slowedTicksDuration;
                }

                if (food.type === 'milk') {
                    nextPlayer.slowedTicks = 0;
                    nextPlayer.boostedTicks += config.boostedTicksDuration;
                }

                if (food.type === 'bean') {
                    // @todo
                }

                return nextPlayer;
            }
            return p;
        });

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

        return {
            ...state,
            tickCount: state.tickCount + 1,
            clouds: updatedClouds,
            honeyPatches: updatedHoneyPatches,
        };
    }

    return state;
}

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

    return posHasPlayer || posHasFood || posHasCloud || posHasHoney;
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

        if (playerHasCollidedWithAnyPlayer(player, players) || playerHasCollidedWithAnyWall(player)) {
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
