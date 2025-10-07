import { isAlive } from '@/pages/games/cow';
import { movePlayers, reducer } from '@/pages/games/game';
import { Apple, CowPiece, PlayerAction } from '@/pages/games/types';
import classNames from 'classnames';
import Peer, { DataConnection } from 'peerjs';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useInterval } from 'react-use';
import { config } from './config';

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
                    className={classNames(
                        'absolute flex items-center justify-center bg-amber-950 text-white',
                        props.piece.dir === 'down' && 'rotate-90',
                        props.piece.dir === 'up' && '-rotate-90',
                    )}
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
                    className={classNames(
                        'absolute flex items-center justify-center bg-neutral-500 text-black',
                        props.piece.dir === 'down' && 'rotate-90',
                        props.piece.dir === 'up' && '-rotate-90',
                    )}
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
                    className={classNames(
                        'absolute flex items-center justify-center bg-neutral-700 text-white',
                        props.piece.dir === 'down' && 'rotate-90',
                        props.piece.dir === 'up' && '-rotate-90',
                    )}
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
