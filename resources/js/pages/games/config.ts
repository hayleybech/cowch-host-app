export const config = {
    rows: 20,
    cols: 30,
    cellSize: 32,
    tick: 500,
    appleRate: 10,
    resumeGracePeriod: 3,
} as const;

export const sprites = {
    cellSize: 32,
    pixelRatio: 1,
    ground: {
        grass: {
            x: 4,
            y: 0,
        },
    },
    food: {
        tuft: {
            x: 3,
            y: 1,
        },
    },
    cow: {
        holstein_friesian: {
            head: {
                x: 3,
                y: 0,
            },
            middle: {
                x: 1,
                y: 1,
            },
            bend: {
                x: 2,
                y: 0,
            },
            tail: {
                x: 0,
                y: 1,
            },
            sideView: {
                x: 0,
                y: 0,
            },
        },
        hereford: {
            head: {
                x: 3,
                y: 2,
            },
            middle: {
                x: 1,
                y: 3,
            },
            bend: {
                x: 2,
                y: 2,
            },
            tail: {
                x: 0,
                y: 3,
            },
            sideView: {
                x: 0,
                y: 2,
            },
        },
        angus: {
            head: {
                x: 3,
                y: 4,
            },
            middle: {
                x: 1,
                y: 5,
            },
            bend: {
                x: 2,
                y: 4,
            },
            tail: {
                x: 0,
                y: 5,
            },
            sideView: {
                x: 0,
                y: 4,
            },
        },
        highland: {
            head: {
                x: 3,
                y: 6,
            },
            middle: {
                x: 1,
                y: 7,
            },
            bend: {
                x: 2,
                y: 6,
            },
            tail: {
                x: 0,
                y: 7,
            },
            sideView: {
                x: 0,
                y: 6,
            },
        },
    },
} as const;

export const spriteBgSize = `${sprites.cellSize * sprites.pixelRatio} ${sprites.cellSize * sprites.pixelRatio}`;

export const getSpriteBgPos = (sprite: { x: number; y: number }) =>
    `${-sprite.x * sprites.pixelRatio * sprites.cellSize}px ` +
    `${-sprite.y * sprites.pixelRatio * sprites.cellSize}px`;
