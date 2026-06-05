import { RenderFood } from '@/pages/Games/render/RenderFood';

export function PowerupLegend() {
    return (
        <div className="flex w-full justify-center gap-8 bg-neutral-800 p-4 text-white">
            <div className="flex items-center gap-4">
                <RenderFood food={{ type: 'tuft', pos: { x: 0, y: 0 } }} isInline />
                <div>
                    <div className="text-2xl text-green-500 uppercase">Tuft</div>
                    <div className="text-lg [text-shadow:none]">
                        <div>Basic food</div>
                        <div>All foods make you longer!</div>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <RenderFood food={{ type: 'honey', pos: { x: 0, y: 0 } }} isInline />
                <div>
                    <div className="text-2xl text-amber-500 uppercase">Honey</div>
                    <div className="text-lg [text-shadow:none]">
                        <div>Use: Slows self</div>
                        <div>Drop: Slows everyone</div>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <RenderFood food={{ type: 'milk', pos: { x: 0, y: 0 } }} isInline />
                <div>
                    <div className="text-2xl text-blue-400 uppercase">Milk</div>
                    <div className="text-lg [text-shadow:none]">
                        <div>Use: Boosts self</div>
                        <div>Drop: Boosts everyone</div>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <RenderFood food={{ type: 'bean', pos: { x: 0, y: 0 } }} isInline />
                <div>
                    <div className="text-2xl text-lime-500 uppercase">Bean</div>
                    <div className="text-lg [text-shadow:none]">
                        <div>Use: Trample</div>
                        <div>Drop: Blinding fart cloud</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
