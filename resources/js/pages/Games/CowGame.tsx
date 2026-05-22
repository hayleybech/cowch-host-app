import { generateRandomString, getRandomElement } from '@/lib/utils';
import {
    getRotationFromSurroundingPieces,
    isAlive,
    isCowInHoneyPatch,
    isCowInMilkPatch,
    shouldUseStraightPiece,
} from '@/pages/Games/cow';
import { movePlayers, reducer } from '@/pages/Games/game';
import { CowBreed, CowPiece, Food, PlayerAction } from '@/pages/Games/types';
import classNames from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
import { Snail, Zap } from 'lucide-react';
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
export const CowGame = () => {
    const [joinCode, setJoinCode] = useState<string>();
    const peerRef = useRef<Peer>(null);

    const [gameState, dispatch] = useReducer(reducer, {
        players: [],
        food: [],
        cells: generateGrid(),
        tickCount: 0,
        ticksSinceFood: 0,
        isPaused: true,
        resumeGracePeriodSeconds: 0,
        connections: [],
        pendingConnections: [],
        clouds: [],
        honeyPatches: [],
        milkPatches: [],
    });

    useEffect(() => {
        const savedJoinCode = localStorage.getItem('cowch-join-code');
        const joinCode = savedJoinCode || generateRandomString(4, true, false, false);
        const peer = new Peer(`COWCH-${joinCode}`);
        peerRef.current = peer;

        peer.on('open', function () {
            setJoinCode(joinCode);
            localStorage.setItem('cowch-join-code', joinCode);
        });

        peer.on('connection', function (conn: DataConnection) {
            conn.on('data', function (data: unknown) {
                const action = data as PlayerAction;
                if (action.type === 'connect') {
                    dispatch({
                        type: 'CONNECT_PLAYER',
                        payload: {
                            playerId: conn.peer,
                            username: action.payload.username,
                            connection: conn,
                        },
                    });
                }
                console.log('Received action:', action.type);
                if (action.type === 'join') {
                    dispatch({
                        type: 'JOIN_PLAYER',
                        payload: {
                            playerId: conn.peer,
                            breed: action.payload.breed,
                        },
                    });
                }
                if (action.type === 'move') {
                    dispatch({
                        type: 'CHANGE_DIRECTION',
                        payload: { playerId: conn.peer, direction: action.payload },
                    });
                }
                if (action.type === 'drop_powerup') {
                    dispatch({
                        type: 'DROP_TRAP',
                        payload: { playerId: conn.peer },
                    });
                }
                if (action.type === 'use_powerup') {
                    dispatch({
                        type: 'APPLY_POWERUP',
                        payload: { playerId: conn.peer },
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
            dispatch({ type: 'TICK' });
            movePlayers(gameState, dispatch);
            dispatch({ type: 'SPAWN_FOOD' });
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

                                        <div className="flex flex-col">
                                            <div className="font-extrabold">
                                                {player.username} {!player.isAlive && '(Dead)'}
                                            </div>
                                            {config.isDebugEnabled && isAlive(player) && (
                                                <button
                                                    className={classNames(
                                                        'w-fit cursor-pointer rounded px-2 py-0.5 text-xs font-bold text-white',
                                                        player.isFrozen
                                                            ? 'bg-blue-600 hover:bg-blue-500'
                                                            : 'bg-blue-400 hover:bg-blue-300',
                                                    )}
                                                    onClick={() =>
                                                        dispatch({
                                                            type: 'TOGGLE_FREEZE_PLAYER',
                                                            payload: { playerId: player.id },
                                                        })
                                                    }
                                                >
                                                    {player.isFrozen ? 'Unfreeze' : 'Freeze'}
                                                </button>
                                            )}
                                        </div>

                                        <div
                                            className="flex items-center justify-center"
                                            style={{ width: config.cellSize, height: config.cellSize }}
                                        >
                                            {isAlive(player) && player.storedPowerup && (
                                                <RenderFood food={player.storedPowerup} isInline />
                                            )}
                                        </div>
                                        {isAlive(player) &&
                                            (player.slowedTicks > 0 ||
                                                gameState.honeyPatches.some((patch) =>
                                                    isCowInHoneyPatch(
                                                        player.headPiece,
                                                        patch.pos,
                                                        config.honeyPatchRadius,
                                                    ),
                                                )) && (
                                                <div className="flex items-center justify-center p-1">
                                                    <Snail className="h-6 w-6 text-amber-600" />
                                                </div>
                                            )}
                                        {isAlive(player) &&
                                            (player.boostedTicks > 0 ||
                                                gameState.milkPatches.some((patch) =>
                                                    isCowInMilkPatch(
                                                        player.headPiece,
                                                        patch.pos,
                                                        config.milkPatchRadius,
                                                    ),
                                                )) && (
                                                <div className="flex items-center justify-center p-1">
                                                    <Zap className="h-6 w-6 text-blue-500" />
                                                </div>
                                            )}
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
                    {gameState.food.map((food) => (
                        <RenderFood food={food} key={`food-[${food.pos.x},${food.pos.y}]`} />
                    ))}
                    <AnimatePresence>
                        {gameState.clouds.map((cloud, index) => (
                            <RenderCloud cloud={cloud} key={`cloud-${index}`} />
                        ))}
                    </AnimatePresence>
                    <AnimatePresence>
                        {gameState.honeyPatches.map((patch, index) => (
                            <RenderHoneyPatch patch={patch} key={`honey-${index}`} />
                        ))}
                    </AnimatePresence>
                    <AnimatePresence>
                        {gameState.milkPatches.map((patch, index) => (
                            <RenderMilkPatch patch={patch} key={`milk-${index}`} />
                        ))}
                    </AnimatePresence>
                    {gameState.isPaused && (
                        <div className="absolute top-0 right-0 bottom-0 left-0 z-20 flex flex-col items-center justify-center gap-2 bg-neutral-900 text-2xl font-extrabold text-white opacity-70">
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
            <div className="mt-4 flex w-full justify-center gap-8 bg-neutral-800 p-4 text-white">
                <div className="flex items-center gap-4">
                    <RenderFood food={{ type: 'tuft', pos: { x: 0, y: 0 } }} isInline />
                    <div>
                        <div className="font-bold text-green-500 uppercase">Tuft</div>
                        <div className="text-xs">
                            <div>
                                Basic food
                            </div>
                            <div>
                                All foods make you longer!
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <RenderFood food={{ type: 'honey', pos: { x: 0, y: 0 } }} isInline />
                    <div>
                        <div className="font-bold text-amber-500 uppercase">Honey</div>
                        <div className="text-xs">
                            <div>
                                <span className="font-semibold">Use:</span> Slows self
                            </div>
                            <div>
                                <span className="font-semibold">Drop:</span> Slows everyone
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <RenderFood food={{ type: 'milk', pos: { x: 0, y: 0 } }} isInline />
                    <div>
                        <div className="font-bold text-blue-400 uppercase">Milk</div>
                        <div className="text-xs">
                            <div>
                                <span className="font-semibold">Use:</span> Boosts self
                            </div>
                            <div>
                                <span className="font-semibold">Drop:</span> Boosts everyone
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <RenderFood food={{ type: 'bean', pos: { x: 0, y: 0 } }} isInline />
                    <div>
                        <div className="font-bold text-lime-500 uppercase">Bean</div>
                        <div className="text-xs">
                            <div>
                                <span className="font-semibold">Use:</span> Trample
                            </div>
                            <div>
                                <span className="font-semibold">Drop:</span> Blinding fart cloud
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CowGame;

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

const RenderCloud = ({ cloud }: { cloud: { pos: { x: number; y: number } } }) => {
    const size = config.cellSize * config.cloudRadius * 2;
    const offset = (size - config.cellSize) / 2;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 2.0 } }}
            className="absolute rounded-full bg-stone-500"
            style={{
                height: size,
                width: size,
                top: cloud.pos.y * config.cellSize - offset,
                left: cloud.pos.x * config.cellSize - offset,
                filter: 'blur(16px)',
                zIndex: 10,
            }}
            transition={{
                duration: 2.0,
                ease: 'easeOut',
                opacity: { duration: 0.5 },
            }}
        />
    );
};

const RenderHoneyPatch = ({ patch }: { patch: { pos: { x: number; y: number } } }) => {
    const size = config.cellSize * config.honeyPatchRadius * 2;
    const offset = (size - config.cellSize) / 2;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0, transition: { duration: 2.0 } }}
            className="absolute rounded-full bg-amber-500"
            style={{
                height: size,
                width: size,
                top: patch.pos.y * config.cellSize - offset,
                left: patch.pos.x * config.cellSize - offset,
                filter: 'blur(16px)',
                zIndex: 3,
            }}
            transition={{
                duration: 2.0,
                ease: 'easeOut',
                opacity: { duration: 0.5 },
            }}
        />
    );
};

const RenderMilkPatch = ({ patch }: { patch: { pos: { x: number; y: number } } }) => {
    const size = config.cellSize * config.milkPatchRadius * 2;
    const offset = (size - config.cellSize) / 2;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0, transition: { duration: 2.0 } }}
            className="absolute rounded-full bg-slate-200"
            style={{
                height: size,
                width: size,
                top: patch.pos.y * config.cellSize - offset,
                left: patch.pos.x * config.cellSize - offset,
                filter: 'blur(16px)',
                zIndex: 3,
            }}
            transition={{
                duration: 2.0,
                ease: 'easeOut',
                opacity: { duration: 0.5 },
            }}
        />
    );
};

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
                        zIndex: 5,
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
                                zIndex: 5,
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
                                zIndex: 5,
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
                        zIndex: 5,
                    }}
                >
                    &nbsp;
                </div>
            )}
        </>
    );
};

const RenderFood = ({ food, className, isInline = false }: { food: Food; isInline?: boolean; className?: string }) => {
    return (
        <div
            className={classNames(className, !isInline && 'absolute flex items-center justify-center text-white')}
            style={{
                height: config.cellSize,
                width: config.cellSize,
                ...(isInline
                    ? {}
                    : {
                          top: food.pos.y * config.cellSize,
                          left: food.pos.x * config.cellSize,
                      }),
                backgroundImage: "url('/sprite.png')",
                backgroundSize: spriteBgSize,
                backgroundPosition: getSpriteBgPos(sprites.food[food.type]),
            }}
        >
            &nbsp;
        </div>
    );
};
