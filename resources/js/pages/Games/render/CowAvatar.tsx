import { CowBreed } from '@/pages/Games/types';
import { config } from '@/pages/Games/config';
import { Sprite } from '@/pages/Games/ui/Sprite';

export const CowAvatar = (props: { breed: CowBreed }) => (
    <Sprite
        spriteKey={`cow.${props.breed}.sideView`}
        style={{
            width: config.cellSize * 2,
        }}
    />
);
