import { generateRandomString, getRandomElement } from '@/lib/utils';
import { isAlive } from '@/pages/Games/cow';
import { movePlayers, reducer } from '@/pages/Games/game';
import { RenderCowPiece } from '@/pages/Games/render/RenderCow';
import { RenderFood } from '@/pages/Games/render/RenderFood';
import { RenderCloud, RenderHoneyPatch, RenderMilkPatch } from '@/pages/Games/render/RenderPatch';
import { PlayerAction } from '@/pages/Games/types';
import { Button } from '@/pages/Games/ui/Button';
import { PowerupLegend } from '@/pages/Games/ui/PowerupLegend';
import { Scoreboard } from '@/pages/Games/ui/Scoreboard';
import classNames from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
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
        clouds: [],
        honeyPatches: [],
        milkPatches: [],
        hasStarted: false,
        isSuddenDeath: false,
        winner: null,
    });

    const gameStateRef = useRef(gameState);
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

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
                            uuid: action.payload.uuid,
                            username:
                                action.payload.username.length > 8
                                    ? action.payload.username.slice(0, 8)
                                    : action.payload.username,
                            connection: conn,
                        },
                    });
                }
                console.log('Received action:', action.type);
                if (action.type === 'join') {
                    dispatch({
                        type: 'JOIN_PLAYER',
                        payload: {
                            uuid: action.uuid,
                            breed: action.payload.breed,
                        },
                    });
                }
                if (action.type === 'move') {
                    dispatch({
                        type: 'CHANGE_DIRECTION',
                        payload: { uuid: action.uuid, direction: action.payload },
                    });
                }
                if (action.type === 'drop_powerup') {
                    dispatch({
                        type: 'DROP_TRAP',
                        payload: { uuid: action.uuid },
                    });
                }
                if (action.type === 'use_powerup') {
                    dispatch({
                        type: 'APPLY_POWERUP',
                        payload: { uuid: action.uuid },
                    });
                }
                if (action.type === 'pause') {
                    dispatch({
                        type: 'REQUEST_TOGGLE_PAUSE',
                        payload: { uuid: action.uuid },
                    });
                }
                if (action.type === 'start_game') {
                    if (!gameStateRef.current.hasStarted || gameStateRef.current.winner) {
                        dispatch({ type: 'REQUEST_START_GAME' });
                    }
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
        gameState.isPaused ? null : gameState.isSuddenDeath ? config.suddenDeathTick : config.tick,
    );

    const togglePause = useCallback(() => {
        dispatch({ type: 'REQUEST_TOGGLE_PAUSE' });
    }, []);

    const startGame = useCallback(() => {
        dispatch({ type: 'REQUEST_START_GAME' });
    }, []);

    return (
        <div className="flex h-screen flex-col bg-neutral-800 text-white text-shadow-lg">
            <header className="w-full px-4 py-2 text-sm">
                <div className="relative flex items-center justify-center gap-8">
                    {/*<img src="/cowch-logo.png" alt="Cowch" className="h-8" />*/}
                    <h1 className="text-shadow relative bottom-1 text-6xl text-white italic">cowch</h1>

                    <p className="text-2xl text-gray-300">
                        Join at <span className="text-4xl text-white">cowch.expo.app</span>
                    </p>

                    <p className="text-2xl text-gray-300">
                        Lobby code: <span className="text-4xl text-white">{joinCode}</span>
                    </p>

                    <p className="absolute right-0 flex gap-4">
                        {!gameState.hasStarted || gameState.winner ? (
                            <Button onClick={startGame} disabled={gameState.players.length === 0}>
                                {gameState.winner ? 'Play Again' : 'Start Game'}
                            </Button>
                        ) : (
                            <Button onClick={togglePause}>{gameState.isPaused ? 'Resume' : 'Pause'}</Button>
                        )}
                    </p>
                </div>
            </header>

            <div className="flex w-full justify-between">
                <div className="grow bg-neutral-700 px-4 py-4">
                    <Scoreboard
                        players={gameState.players}
                        honeyPatches={gameState.honeyPatches}
                        milkPatches={gameState.milkPatches}
                        dispatch={dispatch}
                    />
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
                                    key={player.uuid}
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
                        {gameState.honeyPatches.map((patch, index) => (
                            <RenderHoneyPatch patch={patch} key={`honey-${index}`} />
                        ))}
                        {gameState.milkPatches.map((patch, index) => (
                            <RenderMilkPatch patch={patch} key={`milk-${index}`} />
                        ))}
                        {gameState.isSuddenDeath && !gameState.winner && (
                            <motion.div
                                key="sudden-death-toast"
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{
                                    opacity: [0, 1, 1, 1, 0],
                                    scale: [0, 1.2, 1, 1, 1.5],
                                    y: [0, 0, 0, 0, -100],
                                }}
                                transition={{ duration: 3, times: [0, 0.1, 0.2, 0.8, 1] }}
                                className="absolute top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2 transform rounded-lg px-8 py-4 text-4xl font-black text-red-600 shadow-2xl ring-4 text-shadow-lg"
                            >
                                SUDDEN DEATH!
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {gameState.isPaused && (
                        <div className="text-shadow absolute top-0 right-0 bottom-0 left-0 z-20 flex flex-col items-center justify-center">
                            <div className="absolute top-0 right-0 bottom-0 left-0 bg-neutral-900 opacity-70" />
                            <div className="text-shadow z-15 flex flex-col items-center justify-center gap-2 text-2xl text-white">
                                {gameState.winner ? (
                                    <>
                                        <div className="text-4xl">WINNER!</div>
                                        <div className="text-5xl text-lime-400">{gameState.winner.username}</div>
                                        <Button size="lg" className="mt-4" onClick={startGame}>
                                            Play Again
                                        </Button>
                                    </>
                                ) : gameState.resumeGracePeriodSeconds > 0 ? (
                                    <>
                                        <div>{gameState.hasStarted ? 'RESUMING' : 'STARTING'}</div>
                                        <div className="text-3xl">{gameState.resumeGracePeriodSeconds}</div>
                                    </>
                                ) : !gameState.hasStarted ? (
                                    <>
                                        <div className="mb-4 text-center text-4xl">
                                            Waiting for players...
                                            <br />
                                            <span className="text-xl">Press Start when ready!</span>
                                        </div>
                                        <Button
                                            size="lg"
                                            className="mt-4"
                                            onClick={startGame}
                                            disabled={gameState.players.length === 0}
                                        >
                                            Start Game
                                        </Button>
                                    </>
                                ) : (
                                    'PAUSED'
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <PowerupLegend />
        </div>
    );
};

export default CowGame;
