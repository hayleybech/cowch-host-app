// import { dashboard, login, register } from '@/routes';
import { Head } from '@inertiajs/react';
import Peer from 'peerjs';
import { useEffect, useRef, useState } from 'react';

export default function Welcome() {
    // const { auth } = usePage<SharedData>().props;

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
        peer.on('connection', function (conn) {
            conn.on('data', function (data: unknown) {
                setUsername(data as string);
            });
        });

        return () => {
            peer.destroy(); // Clean up the peer instance on component unmount
        };
    }, []);

    return (
        <>
            <Head title="Welcome">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600"
                    rel="stylesheet"
                />
            </Head>
            <div className="flex min-h-screen flex-col items-center bg-[#FDFDFC] p-6 text-[#1b1b18] lg:justify-center lg:p-8">
                <header className="mb-6 w-full max-w-[335px] text-sm not-has-[nav]:hidden lg:max-w-4xl">
                    <nav className="flex items-center justify-start gap-4">
                        <img src="/cowch-logo.png" alt="Cowch" />
                        {/*{auth.user ? (*/}
                        {/*    <Link*/}
                        {/*        href={dashboard()}*/}
                        {/*        className="inline-block rounded-sm border border-[#19140035] px-5 py-1.5 text-sm leading-normal text-[#1b1b18] hover:border-[#1915014a] dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"*/}
                        {/*    >*/}
                        {/*        Dashboard*/}
                        {/*    </Link>*/}
                        {/*) : (*/}
                        {/*    <>*/}
                        {/*        <Link*/}
                        {/*            href={login()}*/}
                        {/*            className="inline-block rounded-sm border border-transparent px-5 py-1.5 text-sm leading-normal text-[#1b1b18] hover:border-[#19140035] dark:text-[#EDEDEC] dark:hover:border-[#3E3E3A]"*/}
                        {/*        >*/}
                        {/*            Log in*/}
                        {/*        </Link>*/}
                        {/*        <Link*/}
                        {/*            href={register()}*/}
                        {/*            className="inline-block rounded-sm border border-[#19140035] px-5 py-1.5 text-sm leading-normal text-[#1b1b18] hover:border-[#1915014a] dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"*/}
                        {/*        >*/}
                        {/*            Register*/}
                        {/*        </Link>*/}
                        {/*    </>*/}
                        {/*)}*/}
                    </nav>
                </header>
                <div className="flex w-full items-center justify-center opacity-100 transition-opacity duration-750 lg:grow starting:opacity-0">
                    <main className="flex w-full max-w-[335px] flex-col-reverse lg:max-w-4xl lg:flex-row">
                        <div className="flex-1 rounded-br-lg rounded-bl-lg border-4 border-neutral-800 bg-white p-6 pb-12 lg:rounded-tl-lg lg:rounded-br-none lg:p-20">
                            <h1 className="mb-1 text-lg font-extrabold">
                                Let's get started
                            </h1>
                            <p className="text-[#706f6c]] mb-8">{peerId}</p>
                            <ul className="flex gap-3 text-sm leading-normal">
                                <li>
                                    <a
                                        href="https://cloud.laravel.com"
                                        target="_blank"
                                        className="font-f inline-block rounded-sm border-2 border-black bg-lime-500 px-5 py-1.5 font-display text-2xl leading-normal font-extrabold text-white [-webkit-text-stroke:1px_black] hover:bg-lime-400"
                                    >
                                        Start Game
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div className="relative -mb-px aspect-[335/376] w-full shrink-0 overflow-hidden rounded-t-lg bg-lime-900 lg:mb-0 lg:-ml-px lg:aspect-auto lg:w-[438px] lg:rounded-t-none lg:rounded-r-lg">
                            <div className="p-6 text-white">
                                <h2 className="mb-4 text-lg font-extrabold">
                                    Joined Players
                                </h2>
                                <div className="mb-2 text-lg">{username}</div>
                            </div>
                            <div className="absolute inset-0 rounded-t-lg shadow-[inset_0px_0px_0px_1px_rgba(26,26,0,0.16)] lg:rounded-t-none lg:rounded-r-lg dark:shadow-[inset_0px_0px_0px_1px_#fffaed2d]" />
                        </div>
                    </main>
                </div>
                <div className="hidden h-14.5 lg:block"></div>
            </div>
        </>
    );
}
