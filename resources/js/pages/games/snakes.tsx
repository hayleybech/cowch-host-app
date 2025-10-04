import { Apple, Piece } from '@/pages/games/board';
import { appleRate, cols, rows, tick } from '@/pages/games/config';
import { chooseStartPos, CowHead, CowMiddle, CowTail, Direction, move, Player } from '@/pages/games/cow';
import classNames from 'classnames';
import Peer, { DataConnection } from 'peerjs';
import { useEffect, useReducer, useRef, useState } from 'react';

type GameState = {
    players: Player[];
    cells: (Piece | null)[][];
    ticksSinceApple: number;
};

type PlayerAction =
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

type GameAction =
    | { type: 'ADD_PLAYER'; payload: { playerId: string; username: string } }
    | { type: 'CHANGE_DIRECTION'; payload: { playerId: string; direction: Direction } }
    | { type: 'MOVE_PLAYERS' }
    | { type: 'SPAWN_APPLE' };

function reducer(state: GameState, action: GameAction): GameState {
    if (action.type === 'ADD_PLAYER') {
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
            // @ts-expect-error will be immediately set on the next line, don't want to broaden type
            player: undefined,
            pos: {
                x: startXy.x,
                y: startXy.y,
                dir: 'right',
            },
            nextPiece: cowMiddle,
        };
        const player: Player = {
            id: action.payload.playerId,
            username: action.payload.username,
            headPiece: head,
            pos: head.pos,
            score: 0,
        };
        head.player = player;

        const tempCells = [...state.cells];
        tempCells[startXy.y][startXy.x] = head;
        tempCells[cowMiddle.pos.y][cowMiddle.pos.x] = { ...cowMiddle };
        tempCells[cowTail.pos.y][cowTail.pos.x] = { ...cowTail };

        return {
            ...state,
            players: [...state.players, player],
            cells: tempCells,
        };
    }

    if (action.type === 'CHANGE_DIRECTION') {
        const temp = [...state.players];
        const player = temp.find((player) => player.id == action.payload.playerId);

        if (!player || !player.headPiece || !player.headPiece.pos) {
            return state;
        }
        player.headPiece.pos.dir = action.payload.direction;

        return {
            ...state,
            players: temp,
            cells: state.cells,
        };
    }

    if (action.type === 'MOVE_PLAYERS') {
        const cells = [...state.cells];
        const players = state.players.map((player) => {
            const tempPlayer = { ...player };
            tempPlayer.headPiece = move(cells, player.headPiece) as CowHead | undefined;
            tempPlayer.score = tempPlayer!.headPiece!.player.score;
            return tempPlayer;
        });

        return { ...state, players, cells };
    }

    if (action.type === 'SPAWN_APPLE') {
        const cells = [...state.cells];
        let ticksSinceApple = state.ticksSinceApple;
        if (state.ticksSinceApple > appleRate) {
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
            ...state,
            cells,
            ticksSinceApple,
        };
    }

    return state;
}

export const Snakes = () => {
    const [peerId, setPeerId] = useState<string>();
    const peerRef = useRef<Peer>(null);

    const [gameState, dispatch] = useReducer(reducer, {
        players: [],
        cells: generateGrid(),
        ticksSinceApple: 0,
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
                    dispatch({ type: 'ADD_PLAYER', payload: { playerId: conn.peer, username: action.payload } });
                }
                if (action.type === 'move') {
                    dispatch({
                        type: 'CHANGE_DIRECTION',
                        payload: { playerId: conn.peer, direction: action.payload },
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
            dispatch({ type: 'MOVE_PLAYERS' });
            dispatch({ type: 'SPAWN_APPLE' });
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
                                <div>{player.score}</div>
                            </li>
                        ))}
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
