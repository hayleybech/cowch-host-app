import { CowBreed } from '@/pages/Games/types';
import { config, getSpriteBgPos, spriteBgSize, sprites } from '@/pages/Games/config';

export const CowAvatar = (props: { breed: CowBreed }) => (
    <div
        style={{
            height: config.cellSize,
            width: config.cellSize * 2,
            backgroundImage: "url('/sprite.png')",
            backgroundSize: spriteBgSize,
            backgroundPosition: getSpriteBgPos(sprites.cow[props.breed].sideView),
        }}
    >
        &nbsp;
    </div>
);
