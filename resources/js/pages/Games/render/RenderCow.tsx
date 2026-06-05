import { CowBreed, CowPiece } from '@/pages/Games/types';
import { config, getSpriteBgPos, spriteBgSize, sprites } from '@/pages/Games/config';
import { getRotationFromSurroundingPieces, shouldUseStraightPiece } from '@/pages/Games/cow';
import classNames from 'classnames';

const directionToRotation = {
    'right': '',
    'down': 'rotate-90',
    'left': 'rotate-180',
    'up': '-rotate-90',
} as const;

const commonStyle = {
    height: config.cellSize,
    width: config.cellSize,
    backgroundImage: "url('/sprite.png')",
    backgroundSize: spriteBgSize,
    zIndex: 5,
}

export const RenderCowPiece = (props: { piece: CowPiece; colour: CowBreed; prevPiece: CowPiece }) => {
    return (
        <>
            {props.piece.type === 'head' && (
                <div
                    className={classNames(
                        'absolute flex items-center justify-center text-white',
                        directionToRotation[props.piece.dir],
                    )}
                    style={{
                        ...commonStyle,
                        top: props.piece.pos.y * config.cellSize,
                        left: props.piece.pos.x * config.cellSize,
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
                                directionToRotation[props.piece.dir],
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
                                ...commonStyle,
                                top: props.piece.pos.y * config.cellSize,
                                left: props.piece.pos.x * config.cellSize,
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
                        directionToRotation[props.piece.dir],
                    )}
                    style={{
                        ...commonStyle,
                        top: props.piece.pos.y * config.cellSize,
                        left: props.piece.pos.x * config.cellSize,
                        backgroundPosition: getSpriteBgPos(sprites.cow[props.colour].tail),
                    }}
                >
                    &nbsp;
                </div>
            )}
        </>
    );
};
