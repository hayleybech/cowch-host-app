import { generateRandomString, getRandomElement } from '@/lib/utils';
import { getRotationFromSurroundingPieces, isAlive, shouldUseStraightPiece } from '@/pages/games/cow';
import { movePlayers, reducer } from '@/pages/games/game';
import { Apple, CowBreed, CowPiece, PlayerAction } from '@/pages/games/types';
import classNames from 'classnames';
import Peer, { DataConnection } from 'peerjs';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useInterval } from 'react-use';
import { config, getSpriteBgPos, spriteBgSize, sprites } from './config';

const generateGrid = () => {
    const cellsTemp = [];
    for (let y = 0; y < config.rows; y++) {
        const row = [];
        for (let x = 0; x < config.cols; x++) {
            row.push({
                rotation: getRandomElement(['rotate-0', 'rotate-90', 'rotate-180', 'rotate-270']),
            });
        }
        cellsTemp.push(row);
    }
    return cellsTemp;
};

export const Snakes = () => {
    const [joinCode, setJoinCode] = useState<string>();
    const peerRef = useRef<Peer>(null);

    const [gameState, dispatch] = useReducer(reducer, {
        players: [],
        food: [],
        cells: generateGrid(),
        ticksSinceApple: 0,
        isPaused: true,
        resumeGracePeriodSeconds: 0,
        connections: [],
    });

    useEffect(() => {
        const joinCode = generateRandomString(4, true, false, false);
        const peer = new Peer(`COWCH-${joinCode}`);
        peerRef.current = peer;

        peer.on('open', function () {
            setJoinCode(joinCode);
        });

        peer.on('connection', function (conn: DataConnection) {
            conn.on('data', function (data: unknown) {
                const action = data as PlayerAction;
                if (action.type === 'join') {
                    dispatch({
                        type: 'ADD_PLAYER',
                        payload: {
                            playerId: conn.peer,
                            username: action.payload.username,
                            breed: action.payload.breed,
                            connection: conn,
                        },
                    });
                }
                if (action.type === 'move') {
                    dispatch({
                        type: 'CHANGE_DIRECTION',
                        payload: { playerId: conn.peer, direction: action.payload },
                    });
                }
                if (action.type === 'pause') {
                    dispatch({ type: 'REQUEST_TOGGLE_PAUSE' });
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
            dispatch({ type: 'TICK_RESUME_COUNTDOWN' });
        },
        gameState.resumeGracePeriodSeconds > 0 ? 1000 : null,
    );

    useInterval(
        () => {
            movePlayers(gameState, dispatch);
            dispatch({ type: 'SPAWN_APPLE' });
        },
        gameState.isPaused ? null : config.tick,
    );

    const togglePause = useCallback(() => {
        dispatch({ type: 'REQUEST_TOGGLE_PAUSE' });
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
                        <p className="text-[#706f6c]] mb-8 text-2xl font-extrabold">Join code: {joinCode}</p>
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
                        <ul className="flex flex-col gap-4">
                            {gameState.players.map((player) => (
                                <li key={player.id} className="flex justify-between gap-8">
                                    <div className="flex gap-2">
                                        <CowAvatar breed={player.breed} />
                                        <div className="font-extrabold">
                                            {player.username} {!player.isAlive && '(Dead)'}
                                        </div>
                                    </div>
                                    <div>{player.score}</div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Grid */}
                <div className="relative bg-lime-900">
                    {gameState.cells.map((row, y) => (
                        <div key={y} className="flex w-full flex-nowrap">
                            {row.map((cell, x) => (
                                <div
                                    key={x}
                                    style={{
                                        width: config.cellSize,
                                        height: config.cellSize,
                                        backgroundImage: "url('/sprite.png')",
                                        backgroundSize: spriteBgSize,
                                        backgroundPosition: getSpriteBgPos(sprites.ground.grass),
                                    }}
                                    className={classNames(
                                        'flex items-center justify-center text-lg',
                                        cell.rotation,
                                        // x < row.length - 1 && 'border-r-0',
                                        // y < gameState.cells.length - 1 && 'border-b-0',
                                    )}
                                >
                                    &nbsp;
                                </div>
                            ))}
                        </div>
                    ))}
                    {gameState.players.map(
                        (player) =>
                            isAlive(player) && (
                                <RenderCowPiece
                                    key={player.id}
                                    piece={player.headPiece}
                                    colour={player.breed}
                                    prevPiece={player.headPiece}
                                />
                            ),
                    )}
                    {gameState.food.map((tuft) => (
                        <RenderTuft tuft={tuft} key={`tuft-[${tuft.pos.x},${tuft.pos.y}]`} />
                    ))}
                    {gameState.isPaused && (
                        <div className="absolute top-0 right-0 bottom-0 left-0 flex flex-col items-center justify-center gap-2 bg-neutral-900 text-2xl font-extrabold text-white opacity-70">
                            {gameState.resumeGracePeriodSeconds > 0 ? (
                                <>
                                    <div>RESUMING</div>
                                    <div className="text-3xl">{gameState.resumeGracePeriodSeconds}</div>
                                </>
                            ) : (
                                'PAUSED'
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Snakes;

const CowAvatar = (props: { breed: CowBreed }) => (
    <div
        style={{
            height: config.cellSize,
            width: config.cellSize * 2,
            backgroundImage: "url('/sprite.png')",
            backgroundSize: spriteBgSize,
            backgroundPosition: getSpriteBgPos(sprites.cow[props.breed].sideView),
        }}
    >
        &nbsp;
    </div>
);

const RenderCowPiece = (props: { piece: CowPiece; colour: CowBreed; prevPiece: CowPiece }) => {
    return (
        <>
            {props.piece.type === 'head' && (
                <div
                    className={classNames(
                        'absolute flex items-center justify-center text-white',
                        props.piece.dir === 'down' && 'rotate-90',
                        props.piece.dir === 'up' && '-rotate-90',
                        props.piece.dir === 'left' && 'rotate-180',
                    )}
                    style={{
                        height: config.cellSize,
                        width: config.cellSize,
                        top: props.piece.pos.y * config.cellSize,
                        left: props.piece.pos.x * config.cellSize,
                        backgroundImage: "url('/sprite.png')",
                        backgroundSize: spriteBgSize,
                        backgroundPosition: getSpriteBgPos(sprites.cow[props.colour].head),
                    }}
                >
                    &nbsp;
                </div>
            )}
            {props.piece.type === 'middle' && (
                <>
                    {shouldUseStraightPiece(props.piece, props.prevPiece, props.piece.nextPiece) ? (
                        // if prev and next piece facing same direction, render straight
                        <div
                            className={classNames(
                                'absolute flex items-center justify-center text-black',
                                props.piece.dir === 'down' && 'rotate-90',
                                props.piece.dir === 'up' && '-rotate-90',
                                props.piece.dir === 'left' && 'rotate-180',
                            )}
                            style={{
                                height: config.cellSize,
                                width: config.cellSize,
                                top: props.piece.pos.y * config.cellSize,
                                left: props.piece.pos.x * config.cellSize,
                                backgroundImage: "url('/sprite.png')",
                                backgroundSize: spriteBgSize,
                                backgroundPosition: getSpriteBgPos(sprites.cow[props.colour].middle),
                            }}
                        >
                            &nbsp;
                        </div>
                    ) : (
                        <div
                            className={classNames(
                                'absolute flex items-center justify-center text-black',
                                getRotationFromSurroundingPieces(props.piece, props.prevPiece, props.piece.nextPiece),
                            )}
                            style={{
                                height: config.cellSize,
                                width: config.cellSize,
                                top: props.piece.pos.y * config.cellSize,
                                left: props.piece.pos.x * config.cellSize,
                                backgroundImage: "url('/sprite.png')",
                                backgroundSize: spriteBgSize,
                                backgroundPosition: getSpriteBgPos(sprites.cow[props.colour].bend),
                            }}
                        >
                            &nbsp;
                        </div>
                    )}
                </>
            )}

            {!!props.piece.nextPiece && (
                <RenderCowPiece piece={props.piece.nextPiece} colour={props.colour} prevPiece={props.piece} />
            )}
            {props.piece.type === 'tail' && (
                <div
                    className={classNames(
                        'absolute flex items-center justify-center text-white',
                        props.piece.dir === 'down' && 'rotate-90',
                        props.piece.dir === 'up' && '-rotate-90',
                        props.piece.dir === 'left' && 'rotate-180',
                    )}
                    style={{
                        height: config.cellSize,
                        width: config.cellSize,
                        top: props.piece.pos.y * config.cellSize,
                        left: props.piece.pos.x * config.cellSize,
                        backgroundImage: "url('/sprite.png')",
                        backgroundSize: spriteBgSize,
                        backgroundPosition: getSpriteBgPos(sprites.cow[props.colour].tail),
                    }}
                >
                    &nbsp;
                </div>
            )}
        </>
    );
};

const RenderTuft = (props: { tuft: Apple }) => (
    <div
        className="absolute flex items-center justify-center text-white"
        style={{
            height: config.cellSize,
            width: config.cellSize,
            top: props.tuft.pos.y * config.cellSize,
            left: props.tuft.pos.x * config.cellSize,
            backgroundImage: "url('/sprite.png')",
            backgroundSize: spriteBgSize,
            backgroundPosition: getSpriteBgPos(sprites.food.tuft),
        }}
    >
        &nbsp;
    </div>
);
