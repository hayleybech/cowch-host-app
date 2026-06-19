import React from 'react';
import { SpriteKey } from '@/pages/Games/types';
import { config, getSpriteBgPos, getSpriteFromKey, spriteBgSize } from '@/pages/Games/config';
import classNames from 'classnames';

interface SpriteProps {
    spriteKey: SpriteKey;
    rotation?: string | number;
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
}

export const Sprite = ({ spriteKey, rotation, className, style, children }: SpriteProps) => {
    const sprite = getSpriteFromKey(spriteKey);

    let rotationClass = '';
    let inlineRotationStyle: React.CSSProperties = {};

    if (typeof rotation === 'string') {
        rotationClass = rotation;
    } else if (typeof rotation === 'number') {
        inlineRotationStyle = { transform: `rotate(${rotation}deg)` };
    }

    return (
        <div
            className={classNames(className, rotationClass)}
            style={{
                height: config.cellSize,
                width: config.cellSize,
                backgroundImage: "url('/sprite.png')",
                backgroundSize: spriteBgSize,
                backgroundPosition: getSpriteBgPos(sprite),
                ...inlineRotationStyle,
                ...style,
            }}
        >
            {children || <>&nbsp;</>}
        </div>
    );
};
