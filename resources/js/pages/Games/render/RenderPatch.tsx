import { config } from '@/pages/Games/config';
import { motion } from 'framer-motion';

export const RenderCloud = ({ cloud }: { cloud: { pos: { x: number; y: number } } }) => {
    const size = config.cellSize * config.cloudRadius * 2;
    const offset = (size - config.cellSize) / 2;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 2.0 } }}
            className="absolute rounded-full bg-stone-500"
            style={{
                height: size,
                width: size,
                top: cloud.pos.y * config.cellSize - offset,
                left: cloud.pos.x * config.cellSize - offset,
                filter: 'blur(16px)',
                zIndex: 10,
            }}
            transition={{
                duration: 2.0,
                ease: 'easeOut',
                opacity: { duration: 0.5 },
            }}
        />
    );
};

export const RenderHoneyPatch = ({ patch }: { patch: { pos: { x: number; y: number } } }) => {
    const size = config.cellSize * config.honeyPatchRadius * 2;
    const offset = (size - config.cellSize) / 2;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0, transition: { duration: 2.0 } }}
            className="absolute rounded-full bg-amber-500"
            style={{
                height: size,
                width: size,
                top: patch.pos.y * config.cellSize - offset,
                left: patch.pos.x * config.cellSize - offset,
                filter: 'blur(16px)',
                zIndex: 3,
            }}
            transition={{
                duration: 2.0,
                ease: 'easeOut',
                opacity: { duration: 0.5 },
            }}
        />
    );
};

export const RenderMilkPatch = ({ patch }: { patch: { pos: { x: number; y: number } } }) => {
    const size = config.cellSize * config.milkPatchRadius * 2;
    const offset = (size - config.cellSize) / 2;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0, transition: { duration: 2.0 } }}
            className="absolute rounded-full bg-slate-200"
            style={{
                height: size,
                width: size,
                top: patch.pos.y * config.cellSize - offset,
                left: patch.pos.x * config.cellSize - offset,
                filter: 'blur(16px)',
                zIndex: 3,
            }}
            transition={{
                duration: 2.0,
                ease: 'easeOut',
                opacity: { duration: 0.5 },
            }}
        />
    );
};
