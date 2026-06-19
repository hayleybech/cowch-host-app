import { Food } from '@/pages/Games/types';
import classNames from 'classnames';
import { config } from '@/pages/Games/config';
import { Sprite } from '@/pages/Games/ui/Sprite';

export const RenderFood = ({ food, className, isInline = false }: { food: Food; isInline?: boolean; className?: string }) => {
    return (
        <Sprite
            spriteKey={`food.${food.type}`}
            className={classNames(className, !isInline && 'absolute flex items-center justify-center text-white')}
            style={{
                ...(isInline
                    ? {}
                    : {
                          top: food.pos.y * config.cellSize,
                          left: food.pos.x * config.cellSize,
                      }),
            }}
        />
    );
};
