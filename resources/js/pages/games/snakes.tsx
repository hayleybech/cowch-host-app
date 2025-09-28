import classNames from 'classnames';
import Peer, { DataConnection } from 'peerjs';
import { useEffect, useRef, useState } from 'react';

type Direction = 'up' | 'down' | 'right' | 'left';

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(value, max));
}

const rows = 20;
const cols = 20;

type CowPos = {
    x: number;
    y: number;
    dir: Direction;
    next?: CowPos;
};

// const players = [
//     {
//         name: 'jsmith42',
//         score: 69,
//     },
//     {
//         name: 'djackson',
//         score: 7,
//     },
//     {
//         name: 'hayley',
//         score: 33,
//     },
// ];
export const Snakes = () => {
    const [peerId, setPeerId] = useState<string>();
    const peerRef = useRef<Peer>(null);

    const [username, setUsername] = useState<string>();

    useEffect(() => {
        const peer = new Peer();
        peerRef.current = peer;

        peer.on('open', function (id) {
            setPeerId(id);
        });

        // const conn = peer.connect('another-peers-id');
        // // on open will be launch when you successfully connect to PeerServer
        // conn.on('open', function () {
        //     // here you have conn.id
        //     conn.send('hi!');
        // });
        //

        type Action =
            | {
                  type: 'join';
                  payload: string;
              }
            | {
                  type: 'move';
                  payload: Direction;
              };
        peer.on('connection', function (conn: DataConnection) {
            conn.on('data', function (data: unknown) {
                const action = data as Action;
                if (action.type === 'join') {
                    setUsername(action.payload);
                }
                if (action.type === 'move') {
                    setCowPos((prev) => ({ ...prev, dir: action.payload }));
                }
            });
        });
        peer.on('disconnected', () => {
            setUsername(undefined);
        });

        return () => {
            peer.destroy(); // Clean up the peer instance on component unmount
        };
    }, []);

    const [cowPos, setCowPos] = useState<CowPos>(() => {
        // const startX = Math.floor(Math.random() * cols);
        // const startY = Math.floor(Math.random() * rows);
        const startX = Math.floor(cols / 2);
        const startY = Math.floor(rows / 2);
        return {
            x: startX,
            y: startY,
            dir: 'right',
            next: {
                x: startX - 1,
                y: startY,
                dir: 'right',
            },
        };
    });

    const [cells, setCells] = useState(() => {
        const cellsTemp = [];
        for (let y = 0; y < rows; y++) {
            const row = [];
            for (let x = 0; x < cols; x++) {
                row.push('');
            }
            cellsTemp.push(row);
        }
        return cellsTemp;
    });

    const move = (pos: CowPos): CowPos => {
        const newPos = {
            x: pos.x,
            y: pos.y,
            dir: pos.dir,

            // The next piece takes the place of the previous piece.
            next: {
                x: pos.x,
                y: pos.y,
                dir: pos.dir,
                next: pos.next?.next,
            },
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

    const tick = 800;

    useEffect(() => {
        // tick
        setInterval(() => {
            setCowPos((prev) => move(prev));
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
                <p className="text-[#706f6c]] mb-8">{peerId}</p>
                {/* Scoreboard */}
                <div>
                    <ul>
                        {username && (
                            <li
                                key={username}
                                className="flex justify-between gap-8"
                            >
                                <div className="font-extrabold">{username}</div>
                                <div>{0}</div>
                            </li>
                        )}
                        {/*{players.map((player) => (*/}
                        {/*    <li*/}
                        {/*        key={player.name}*/}
                        {/*        className="flex justify-between gap-8"*/}
                        {/*    >*/}
                        {/*        <div className="font-extrabold">*/}
                        {/*            {player.name}*/}
                        {/*        </div>*/}
                        {/*        <div>{player.score}</div>*/}
                        {/*    </li>*/}
                        {/*))}*/}
                    </ul>
                </div>

                {/* Grid */}
                <div>
                    {cells.map((row, y) => (
                        <div key={y} className="flex w-full flex-nowrap">
                            {row.map((col, x) => (
                                <div
                                    key={x}
                                    className={classNames(
                                        'flex h-10 w-10 items-center justify-center border-1 border-black text-lg',
                                        x < row.length - 1 && 'border-r-0',
                                        y < cells.length - 1 && 'border-b-0',
                                    )}
                                >
                                    {cowPos.x === x && cowPos.y === y
                                        ? 'H'
                                        : ''}
                                    {cowPos.next?.x === x &&
                                    cowPos.next?.y === y
                                        ? 'T'
                                        : ''}
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
