import { isAlive, isCowInHoneyPatch, isCowInMilkPatch } from '@/pages/Games/cow';
import { CowAvatar } from '@/pages/Games/render/CowAvatar';
import { RenderFood } from '@/pages/Games/render/RenderFood';
import { GameAction, HoneyPatch, MilkPatch, Player } from '@/pages/Games/types';
import { Button } from '@/pages/Games/ui/Button';
import classNames from 'classnames';
import { Snail, Zap } from 'lucide-react';
import React from 'react';
import { config } from '../config';

interface ScoreboardProps {
    players: Player[];
    honeyPatches: HoneyPatch[];
    milkPatches: MilkPatch[];
    dispatch: React.Dispatch<GameAction>;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
    players,
    honeyPatches,
    milkPatches,
    dispatch,
}) => {
    return (
        <div>
            <ul className="flex flex-col gap-4">
                {players.map((player) => (
                    <li key={player.id} className="flex justify-between gap-8">
                        <div className="flex gap-2">
                            <CowAvatar breed={player.breed} />

                            <div className="flex flex-col">
                                <div className="text-xl">
                                    {player.username} {!player.isAlive && '(Dead)'}
                                </div>
                                {config.isDebugEnabled && isAlive(player) && (
                                    <Button
                                        variant={player.isFrozen ? 'primary' : 'secondary'}
                                        size="sm"
                                        className={classNames(
                                            'w-fit',
                                            player.isFrozen ? 'bg-blue-600 hover:bg-blue-500' : '',
                                        )}
                                        onClick={() =>
                                            dispatch({
                                                type: 'TOGGLE_FREEZE_PLAYER',
                                                payload: { playerId: player.id },
                                            })
                                        }
                                    >
                                        {player.isFrozen ? 'Unfreeze' : 'Freeze'}
                                    </Button>
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
                                    honeyPatches.some((patch) =>
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
                                    milkPatches.some((patch) =>
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
                        <div className="text-xl">{player.score}</div>
                    </li>
                ))}
            </ul>
        </div>
    );
};
