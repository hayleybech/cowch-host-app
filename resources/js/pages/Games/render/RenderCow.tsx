import { CowBreed, CowPiece } from '@/pages/Games/types';
import { config } from '@/pages/Games/config';
import { getRotationFromSurroundingPieces, shouldUseStraightPiece } from '@/pages/Games/cow';
import classNames from 'classnames';
import { Sprite } from '@/pages/Games/ui/Sprite';

const directionToRotation = {
    'right': '',
    'down': 'rotate-90',
    'left': 'rotate-180',
    'up': '-rotate-90',
} as const;

export const RenderCowPiece = (props: { piece: CowPiece; colour: CowBreed; prevPiece: CowPiece }) => {
    return (
        <>
            {props.piece.type === 'head' && (
                <Sprite
                    spriteKey={`cow.${props.colour}.head`}
                    className={classNames(
                        'absolute flex items-center justify-center text-white',
                        directionToRotation[props.piece.dir],
                    )}
                    style={{
                        top: props.piece.pos.y * config.cellSize,
                        left: props.piece.pos.x * config.cellSize,
                    }}
                />
            )}
            {props.piece.type === 'middle' && (
                <>
                    {shouldUseStraightPiece(props.piece, props.prevPiece, props.piece.nextPiece) ? (
                        // if prev and next piece facing same direction, render straight
                        <Sprite
                            spriteKey={`cow.${props.colour}.middle`}
                            className={classNames(
                                'absolute flex items-center justify-center text-black',
                                directionToRotation[props.piece.dir],
                            )}
                            style={{
                                top: props.piece.pos.y * config.cellSize,
                                left: props.piece.pos.x * config.cellSize,
                            }}
                        />
                    ) : (
                        <Sprite
                            spriteKey={`cow.${props.colour}.bend`}
                            className={classNames(
                                'absolute flex items-center justify-center text-black',
                                getRotationFromSurroundingPieces(props.piece, props.prevPiece, props.piece.nextPiece),
                            )}
                            style={{
                                top: props.piece.pos.y * config.cellSize,
                                left: props.piece.pos.x * config.cellSize,
                            }}
                        />
                    )}
                </>
            )}

            {!!props.piece.nextPiece && (
                <RenderCowPiece piece={props.piece.nextPiece} colour={props.colour} prevPiece={props.piece} />
            )}
            {props.piece.type === 'tail' && (
                <Sprite
                    spriteKey={`cow.${props.colour}.tail`}
                    className={classNames(
                        'absolute flex items-center justify-center text-white',
                        directionToRotation[props.piece.dir],
                    )}
                    style={{
                        top: props.piece.pos.y * config.cellSize,
                        left: props.piece.pos.x * config.cellSize,
                    }}
                />
            )}
        </>
    );
};
