import { config } from '@/pages/games/config';
import {
    chooseStartPos,
    Direction,
    getSecondLastPiece,
    isAlive,
    move,
    playerHasCollidedWithAnyApple,
    playerHasCollidedWithAnyPlayer,
    playerHasCollidedWithAnyWall,
} from '@/pages/games/cow';
import {
    AlivePlayer,
    CowHead,
    CowMiddle,
    CowPiece,
    CowTail,
    GameAction,
    GameNotification,
    GameState,
    Player,
    Position,
} from '@/pages/games/types';
import { DataConnection } from 'peerjs';
import { Dispatch } from 'react';

export function reducer(state: GameState, action: GameAction): GameState {
    if (action.type === 'ADD_PLAYER') {
        const initialDirection = 'right';
        action.payload.connection.send({ type: state.isPaused ? 'paused' : 'resumed' });
        action.payload.connection.send({ type: 'changed_direction', payload: initialDirection });

        const startXy = chooseStartPos();

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
            id: action.payload.playerId,
            username: action.payload.username,
            headPiece: head,
            score: 0,
            isAlive: true,
            breed: action.payload.breed,
            // breed: getRandomElement(CowBreeds),
        };

        return {
            ...state,
            players: [...state.players, player],
            connections: [...state.connections, action.payload.connection],
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
        player.headPiece.dir = action.payload.direction;
        broadcastTo(state.connections, player.id, {
            type: 'changed_direction',
            payload: action.payload.direction,
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

    if (action.type === 'REMOVE_APPLE') {
        return {
            ...state,
            food: state.food.toSpliced(
                state.food.findIndex((apple) => apple.pos.x === action.payload.x && apple.pos.y === action.payload.y),
                1,
            ),
        };
    }

    if (action.type === 'SPAWN_APPLE') {
        if (state.ticksSinceApple < config.appleRate) {
            return {
                ...state,
                ticksSinceApple: state.ticksSinceApple + 1,
            };
        }

        const apples = state.food;
        apples.push({
            type: 'apple',
            pos: chooseStartPos(),
        });

        return {
            ...state,
            food: apples,
            ticksSinceApple: 0,
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

    return state;
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
        tempPlayer.headPiece = move(state.food, player.headPiece);
        return tempPlayer;
    });

    // Check collisions with apples
    players = players.map((player) => {
        if (!isAlive(player)) {
            return player;
        }

        // Check for apple
        const appleCollided = playerHasCollidedWithAnyApple(player.headPiece.pos, state.food);
        if (player.headPiece && appleCollided) {
            // Remove Apple
            dispatch({ type: 'REMOVE_APPLE', payload: { x: appleCollided.pos.x, y: appleCollided.pos.y } });

            // Grow tail
            const playerOld = state.players.find((playerA) => playerA.id === player.id) as AlivePlayer;
            const slpOld = getSecondLastPiece(playerOld.headPiece.nextPiece, playerOld.headPiece);
            getSecondLastPiece(player.headPiece.nextPiece as CowPiece, player.headPiece).nextPiece = {
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
