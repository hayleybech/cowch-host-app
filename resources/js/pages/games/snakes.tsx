import classNames from 'classnames';
import Peer, { DataConnection } from 'peerjs';
import { useCallback, useEffect, useRef, useState } from 'react';

type Direction = 'up' | 'down' | 'right' | 'left';

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(value, max));
}

function getRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const rows = 20;
const cols = 20;

type GameState = {
    players: Player[];
    cells: (Piece | null)[][];
};

type Player = {
    id: string;
    username: string;
    headPiece?: CowHead;
    pos?: CowPos;
};

type CowPos = {
    x: number;
    y: number;
    dir: Direction; // The direction the piece is queued to move on its NEXT frame
};

type Piece = CowHead | CowMiddle | CowTail;

type CowHead = {
    type: 'head';

    // references back up to Player. could be replaced with a direct reference to Player.
    playerId: string;

    pos?: CowPos;

    // Linked list of bits of cow. Thanks, bachelor degree!
    // @todo narrow to exclude CowHead
    nextPiece?: Piece;
};
type CowMiddle = {
    type: 'middle';
    pos: CowPos;
    nextPiece?: Piece;
};
type CowTail = {
    type: 'tail';
    pos: CowPos;
    nextPiece?: Piece; // @todo narrow exclude nextPiece on CowTail
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

const chooseStartPos = () => ({
    x: getRandomNumber(1, cols - 2),
    y: getRandomNumber(1, rows - 2),
});

const move = (cells: (Piece | null)[][], piece?: Piece, queueDir?: Direction) => {
    if (!piece || !piece.pos) {
        return piece;
    }

    const newPiece = { ...piece };
    newPiece.pos = shiftPos(newPiece.pos as CowPos);

    // Remove from old cell, put in new cell
    cells[piece.pos.y][piece.pos.x] = null;
    cells[newPiece.pos.y][newPiece.pos.x] = newPiece;

    // Queue the piece to move in the direction its parent piece just moved
    newPiece.pos.dir = queueDir ?? newPiece.pos.dir; // If undefined, assume headPiece and keep moving straight

    // Recursively move the next piece(s)
    newPiece.nextPiece = move(cells, newPiece.nextPiece, piece.pos.dir);
    return newPiece;
};

const shiftPos = (pos: CowPos): CowPos => {
    const newPos = {
        x: pos.x,
        y: pos.y,
        dir: pos.dir,
    };
    if (pos.dir === 'up') {
        newPos.y = clamp(pos.y - 1, 0, cols - 1);
        return newPos;
    }
    if (pos.dir === 'right') {
        newPos.x = clamp(pos.x + 1, 0, rows - 1);
        return newPos;
    }
    if (pos.dir === 'down') {
        newPos.y = clamp(pos.y + 1, 0, cols - 1);
        return newPos;
    }

    newPos.x = clamp(pos.x - 1, 0, rows - 1);
    return newPos;
};

export const Snakes = () => {
    const [peerId, setPeerId] = useState<string>();
    const peerRef = useRef<Peer>(null);

    const [gameState, setGameState] = useState<GameState>(() => ({
        players: [],
        cells: generateGrid(),
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

    const tick = 800;
    useEffect(() => {
        // tick
        setInterval(() => {
            setGameState((prev) => {
                const tempCells = [...prev.cells];
                const tempPlayers = prev.players.map((player) => {
                    const tempPlayer = { ...player };
                    tempPlayer.headPiece = move(tempCells, player.headPiece) as CowHead | undefined;
                    return tempPlayer;
                });

                return {
                    players: tempPlayers,
                    cells: tempCells,
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
                                        <div className="flex h-10 w-10 items-center justify-center bg-purple-500 text-white">
                                            H
                                        </div>
                                    )}
                                    {piece?.type === 'middle' && 'M'}
                                    {piece?.type === 'tail' && 'T'}
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
