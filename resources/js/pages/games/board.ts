import { CowHead, CowMiddle, CowTail } from '@/pages/games/cow';

export type Piece = Apple | CowHead | CowMiddle | CowTail;
export type Apple = {
    type: 'apple';
    x: number;
    y: number;
};
