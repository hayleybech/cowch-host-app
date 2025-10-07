export const config = {
    rows: 20,
    cols: 30,
    cellSize: 32,
    tick: 500,
    appleRate: 10,
    resumeGracePeriod: 5,
} as const;

export const sprites = {
    cellSize: 32,
    pixelRatio: 1,
    cow: {
        black: {
            head: {
                x: 3,
                y: 0,
            },
            middle: {
                x: 1,
                y: 1,
            },
            tail: {
                x: 0,
                y: 1,
            },
        },
        brown: {
            head: {
                x: 3,
                y: 2,
            },
            middle: {
                x: 1,
                y: 3,
            },
            tail: {
                x: 0,
                y: 3,
            },
        },
    },
} as const;

export const spriteBgSize = `${sprites.cellSize * sprites.pixelRatio} ${sprites.cellSize * sprites.pixelRatio}`;

export const getSpriteBgPos = (sprite: { x: number; y: number }) =>
    `${-sprite.x * sprites.pixelRatio * sprites.cellSize}px ` +
    `${-sprite.y * sprites.pixelRatio * sprites.cellSize}px`;
