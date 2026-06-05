import { Food } from '@/pages/Games/types';
import classNames from 'classnames';
import { config, getSpriteBgPos, spriteBgSize, sprites } from '@/pages/Games/config';

export const RenderFood = ({ food, className, isInline = false }: { food: Food; isInline?: boolean; className?: string }) => {
    return (
        <div
            className={classNames(className, !isInline && 'absolute flex items-center justify-center text-white')}
            style={{
                height: config.cellSize,
                width: config.cellSize,
                ...(isInline
                    ? {}
                    : {
                          top: food.pos.y * config.cellSize,
                          left: food.pos.x * config.cellSize,
                      }),
                backgroundImage: "url('/sprite.png')",
                backgroundSize: spriteBgSize,
                backgroundPosition: getSpriteBgPos(sprites.food[food.type]),
            }}
        >
            &nbsp;
        </div>
    );
};
