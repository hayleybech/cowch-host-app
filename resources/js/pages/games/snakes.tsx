import { Apple, Piece, Position } from '@/pages/games/board';
import {
    AlivePlayer,
    chooseStartPos,
    CowHead,
    CowMiddle,
    CowPiece,
    CowTail,
    Direction,
    getSecondLastPiece,
    isAlive,
    move,
    Player,
    playerHasCollidedWithAnyApple,
    playerHasCollidedWithAnyPlayer,
    playerHasCollidedWithAnyWall,
} from '@/pages/games/cow';
import classNames from 'classnames';
import Peer, { DataConnection } from 'peerjs';
import { Dispatch, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useInterval } from 'react-use';
import { config } from './config';

type GameState = {
    players: Player[];
    apples: Apple[];
    cells: (Piece | null)[][];
    ticksSinceApple: number;
    isPaused: boolean;
    connections: DataConnection[];
};

type PlayerAction =
    | {
          type: 'join';
          payload: string;
      }
    | {
          type: 'move';
          payload: Direction;
      }
    | { type: 'pause' };

type GameNotification = { type: 'paused' } | { type: 'resumed' };

const generateGrid = () => {
    const cellsTemp = [];
    for (let y = 0; y < config.rows; y++) {
        const row = [];
        for (let x = 0; x < config.cols; x++) {
            row.push(null);
        }
        cellsTemp.push(row);
    }
    return cellsTemp;
};

type GameAction =
    | { type: 'ADD_PLAYER'; payload: { playerId: string; username: string; connection: DataConnection } }
    | { type: 'CHANGE_DIRECTION'; payload: { playerId: string; direction: Direction } }
    | { type: 'UPDATE_PLAYERS'; payload: Player[] }
    | { type: 'SPAWN_APPLE' }
    | { type: 'REMOVE_APPLE'; payload: Position }
    | { type: 'TOGGLE_PAUSE' };

function reducer(state: GameState, action: GameAction): GameState {
    if (action.type === 'ADD_PLAYER') {
        const startXy = chooseStartPos();

        const cowTail: CowTail = {
            type: 'tail',
            pos: {
                x: startXy.x - 2,
                y: startXy.y,
            },
            dir: 'right',
            nextPiece: undefined,
        };
        const cowMiddle: CowMiddle = {
            type: 'middle',
            pos: {
                x: startXy.x - 1,
                y: startXy.y,
            },
            dir: 'right',
            nextPiece: cowTail,
        };
        const head: CowHead = {
            type: 'head',
            pos: startXy,
            dir: 'right',
            nextPiece: cowMiddle,
        };
        const player: Player = {
            id: action.payload.playerId,
            username: action.payload.username,
            headPiece: head,
            score: 0,
            isAlive: true,
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
            apples: state.apples.toSpliced(
                state.apples.findIndex((apple) => apple.pos.x === action.payload.x && apple.pos.y === action.payload.y),
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

        const apples = state.apples;
        apples.push({
            type: 'apple',
            pos: chooseStartPos(),
        });

        return {
            ...state,
            apples,
            ticksSinceApple: 0,
        };
    }

    if (action.type === 'TOGGLE_PAUSE') {
        state.connections.forEach((connection) => {
            connection.send({ type: state.isPaused ? 'resumed' : 'paused' });
        });
        return {
            ...state,
            isPaused: !state.isPaused,
        };
    }

    return state;
}

function movePlayers(state: GameState, dispatch: Dispatch<GameAction>) {
    // Calculate new player positions
    let players = state.players.map((player) => {
        if (!player.isAlive) {
            return player;
        }

        const tempPlayer = { ...player };
        tempPlayer.headPiece = move(state.apples, player.headPiece);
        return tempPlayer;
    });

    // Check collisions with apples
    players = players.map((player) => {
        if (!isAlive(player)) {
            return player;
        }

        // Check for apple
        const appleCollided = playerHasCollidedWithAnyApple(player.headPiece.pos, state.apples);
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

export const Snakes = () => {
    const [peerId, setPeerId] = useState<string>();
    const peerRef = useRef<Peer>(null);

    const [gameState, dispatch] = useReducer(reducer, {
        players: [],
        apples: [],
        cells: generateGrid(),
        ticksSinceApple: 0,
        isPaused: true,
        connections: [],
    });

    useEffect(() => {
        const peer = new Peer('cowch-1');
        peerRef.current = peer;

        peer.on('open', function (id) {
            setPeerId(id);
        });

        peer.on('connection', function (conn: DataConnection) {
            conn.on('data', function (data: unknown) {
                const action = data as PlayerAction;
                if (action.type === 'join') {
                    dispatch({
                        type: 'ADD_PLAYER',
                        payload: { playerId: conn.peer, username: action.payload, connection: conn },
                    });
                }
                if (action.type === 'move') {
                    dispatch({
                        type: 'CHANGE_DIRECTION',
                        payload: { playerId: conn.peer, direction: action.payload },
                    });
                }
                if (action.type === 'pause') {
                    dispatch({ type: 'TOGGLE_PAUSE' });
                }
            });
        });
        peer.on('disconnected', () => {
            // setUsername(undefined);
        });

        return () => {
            peer.destroy();
        };
    }, []);

    useInterval(
        () => {
            movePlayers(gameState, dispatch);
            dispatch({ type: 'SPAWN_APPLE' });
        },
        gameState.isPaused ? null : config.tick,
    );

    const togglePause = useCallback(() => {
        dispatch({ type: 'TOGGLE_PAUSE' });
    }, []);

    return (
        <div className="flex flex-col bg-[#FDFDFC] p-6 text-[#1b1b18] lg:p-8">
            <header className="mb-6 w-full max-w-[335px] text-sm not-has-[nav]:hidden lg:max-w-4xl">
                <nav className="flex items-center justify-start gap-4">
                    <img src="/cowch-logo.png" alt="Cowch" className="h-8" />
                </nav>
            </header>

            <div className="flex w-full justify-between gap-8">
                <div className="grow">
                    <div className="mb-8">
                        <p className="text-[#706f6c]] mb-8">Join code: {peerId}</p>
                        <p>
                            <button
                                className="cursor-pointer rounded-sm bg-lime-500 px-4 py-2 font-extrabold text-white hover:bg-lime-400 active:bg-lime-300"
                                onClick={togglePause}
                            >
                                {gameState.isPaused ? 'Resume' : 'Pause'}
                            </button>
                        </p>
                    </div>
                    {/* Scoreboard */}
                    <div>
                        <ul>
                            {gameState.players.map((player) => (
                                <li key={player.id} className="flex justify-between gap-8">
                                    <div className="font-extrabold">
                                        {player.username} {!player.isAlive && '(Dead)'}
                                    </div>
                                    <div>{player.score}</div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Grid */}
                <div className="relative">
                    {gameState.cells.map((row, y) => (
                        <div key={y} className="flex w-full flex-nowrap">
                            {row.map((piece, x) => (
                                <div
                                    key={x}
                                    style={{ width: config.cellSize, height: config.cellSize }}
                                    className={classNames(
                                        'flex items-center justify-center border-1 border-black text-lg',
                                        x < row.length - 1 && 'border-r-0',
                                        y < gameState.cells.length - 1 && 'border-b-0',
                                    )}
                                >
                                    &nbsp;
                                </div>
                            ))}
                        </div>
                    ))}
                    {gameState.players.map(
                        (player) => isAlive(player) && <RenderCowPiece key={player.id} piece={player.headPiece} />,
                    )}
                    {gameState.apples.map((apple) => (
                        <RenderApple apple={apple} key={`apple-[${apple.pos.x},${apple.pos.y}]`} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Snakes;

const RenderCowPiece = (props: { piece: CowPiece }) => {
    return (
        <>
            {props.piece.type === 'head' && (
                <div
                    className="absolute flex items-center justify-center bg-amber-950 text-white"
                    style={{
                        height: config.cellSize,
                        width: config.cellSize,
                        top: props.piece.pos.y * config.cellSize,
                        left: props.piece.pos.x * config.cellSize,
                    }}
                >
                    H
                </div>
            )}

            {props.piece.type === 'middle' && (
                <div
                    className="absolute flex items-center justify-center bg-neutral-500 text-black"
                    style={{
                        height: config.cellSize,
                        width: config.cellSize,
                        top: props.piece.pos.y * config.cellSize,
                        left: props.piece.pos.x * config.cellSize,
                    }}
                >
                    M
                </div>
            )}

            {!!props.piece.nextPiece && <RenderCowPiece piece={props.piece.nextPiece} />}

            {props.piece.type === 'tail' && (
                <div
                    className="absolute flex items-center justify-center bg-neutral-700 text-white"
                    style={{
                        height: config.cellSize,
                        width: config.cellSize,
                        top: props.piece.pos.y * config.cellSize,
                        left: props.piece.pos.x * config.cellSize,
                    }}
                >
                    T
                </div>
            )}
        </>
    );
};

const RenderApple = (props: { apple: Apple }) => (
    <div
        className="absolute flex items-center justify-center bg-red-800 text-white"
        style={{
            height: config.cellSize,
            width: config.cellSize,
            top: props.apple.pos.y * config.cellSize,
            left: props.apple.pos.x * config.cellSize,
        }}
    >
        A
    </div>
);
