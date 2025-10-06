import { CowHead, CowMiddle, CowTail } from '@/pages/games/cow';

export type Piece = Apple | CowHead | CowMiddle | CowTail;
export type Apple = {
    type: 'apple';
    pos: Position;
};

export type Position = {
    x: number;
    y: number;
};
