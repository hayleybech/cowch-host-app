import { Apple } from '@/pages/games/board';
import { appleRate, cols, rows, tick } from '@/pages/games/config';
import { chooseStartPos, CowHead, CowMiddle, CowTail, Direction, move, Player } from '@/pages/games/cow';
import classNames from 'classnames';
import Peer, { DataConnection } from 'peerjs';
import { useCallback, useEffect, useRef, useState } from 'react';

class Piece {}

type GameState = {
    players: Player[];
    cells: (Piece | null)[][];
    ticksSinceApple: number;
};

type Action =
    | {
          type: 'join';
          payload: string;
      }
    | {
          type: 'move';
          payload: Direction;
      };

const generateGrid = () => {
    const cellsTemp = [];
    for (let y = 0; y < rows; y++) {
        const row = [];
        for (let x = 0; x < cols; x++) {
            row.push(null);
        }
        cellsTemp.push(row);
    }
    return cellsTemp;
};

export const Snakes = () => {
    const [peerId, setPeerId] = useState<string>();
    const peerRef = useRef<Peer>(null);

    const [gameState, setGameState] = useState<GameState>(() => ({
        players: [],
        cells: generateGrid(),
        ticksSinceApple: 0,
    }));

    const addPlayer = useCallback((id: string, username: string) => {
        const startXy = chooseStartPos();

        const cowTail: CowTail = {
            type: 'tail',
            pos: {
                x: startXy.x - 2,
                y: startXy.y,
                dir: 'right',
            },
        };
        const cowMiddle: CowMiddle = {
            type: 'middle',
            pos: {
                x: startXy.x - 1,
                y: startXy.y,
                dir: 'right',
            },
            nextPiece: cowTail,
        };
        const head: CowHead = {
            type: 'head',
            playerId: id,
            pos: {
                x: startXy.x,
                y: startXy.y,
                dir: 'right',
            },
            nextPiece: cowMiddle,
        };

        setGameState((prev) => {
            const tempCells = [...prev.cells];
            tempCells[startXy.y][startXy.x] = head;
            tempCells[cowMiddle.pos.y][cowMiddle.pos.x] = { ...cowMiddle };
            tempCells[cowTail.pos.y][cowTail.pos.x] = { ...cowTail };

            return {
                ...prev,
                players: [...prev.players, { id, username, headPiece: head, pos: head.pos }],
                cells: tempCells,
            };
        });
    }, []);

    useEffect(() => {
        const peer = new Peer('cowch-1');
        peerRef.current = peer;

        peer.on('open', function (id) {
            setPeerId(id);
        });

        peer.on('connection', function (conn: DataConnection) {
            conn.on('data', function (data: unknown) {
                const action = data as Action;
                if (action.type === 'join') {
                    addPlayer(conn.peer, action.payload);
                }
                if (action.type === 'move') {
                    setGameState((prev) => {
                        const temp = [...prev.players];
                        const player = temp.find((player) => player.id == conn.peer);

                        if (!player || !player.headPiece || !player.headPiece.pos) {
                            return prev;
                        }
                        player.headPiece.pos.dir = action.payload;

                        return {
                            ...prev,
                            players: temp,
                            cells: prev.cells,
                        };
                    });
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

    useEffect(() => {
        // tick
        setInterval(() => {
            setGameState((prev) => {
                // Move all players
                const cells = [...prev.cells];
                const players = prev.players.map((player) => {
                    const tempPlayer = { ...player };
                    tempPlayer.headPiece = move(cells, player.headPiece) as CowHead | undefined;
                    return tempPlayer;
                });

                // Spawn apples
                let ticksSinceApple = prev.ticksSinceApple;
                console.log({ ticksSinceApple, appleRate });
                if (prev.ticksSinceApple > appleRate) {
                    console.log('appling');
                    const apple: Apple = {
                        type: 'apple',
                        ...chooseStartPos(),
                    };
                    cells[apple.y][apple.x] = { ...apple };
                    ticksSinceApple = 0;
                } else {
                    ticksSinceApple++;
                }

                // Update game state
                return {
                    ...prev,
                    players: players,
                    cells,
                    ticksSinceApple,
                };
            });
        }, tick);
    }, []);

    return (
        <div className="flex flex-col bg-[#FDFDFC] p-6 text-[#1b1b18] lg:p-8">
            <header className="mb-6 w-full max-w-[335px] text-sm not-has-[nav]:hidden lg:max-w-4xl">
                <nav className="flex items-center justify-start gap-4">
                    <img src="/cowch-logo.png" alt="Cowch" className="h-8" />
                </nav>
            </header>

            <div className="flex w-full justify-between">
                <p className="text-[#706f6c]] mb-8">Join code: {peerId}</p>
                {/* Scoreboard */}
                <div>
                    <ul>
                        {gameState.players.map((player) => (
                            <li key={player.id} className="flex justify-between gap-8">
                                <div className="font-extrabold">{player.username}</div>
                                <div>{0}</div>
                            </li>
                        ))}
                        {/*{username && (*/}
                        {/*    <li*/}
                        {/*        key={username}*/}
                        {/*        className="flex justify-between gap-8"*/}
                        {/*    >*/}
                        {/*        <div className="font-extrabold">{username}</div>*/}
                        {/*        <div>{0}</div>*/}
                        {/*    </li>*/}
                        {/*)}*/}
                    </ul>
                </div>

                {/* Grid */}
                <div>
                    {gameState.cells.map((row, y) => (
                        <div key={y} className="flex w-full flex-nowrap">
                            {row.map((piece, x) => (
                                <div
                                    key={x}
                                    className={classNames(
                                        'flex h-10 w-10 items-center justify-center border-1 border-black text-lg',
                                        x < row.length - 1 && 'border-r-0',
                                        y < gameState.cells.length - 1 && 'border-b-0',
                                    )}
                                >
                                    {/* new mp logic*/}
                                    {piece?.type === 'head' && (
                                        <div className="flex h-10 w-10 items-center justify-center bg-amber-950 text-white">
                                            H
                                        </div>
                                    )}
                                    {piece?.type === 'middle' && 'M'}
                                    {piece?.type === 'tail' && 'T'}
                                    {piece?.type === 'apple' && (
                                        <div className="flex h-10 w-10 items-center justify-center bg-red-800 text-white">
                                            A
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Snakes;
