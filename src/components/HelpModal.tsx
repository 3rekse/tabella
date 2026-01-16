import React from 'react';
import { X } from 'lucide-react';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col scale-in-center">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/50">
                    <h2 className="text-xl font-bold text-white tracking-tight">Guida alla Programmazione</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                    <section>
                        <h3 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Modalità TABLE (Assoluta)
                        </h3>
                        <div className="bg-zinc-950/50 rounded-lg p-4 font-mono text-sm border border-zinc-800/50 space-y-3">
                            <div>
                                <p className="text-zinc-500 mb-1">// Definisce le dimensioni della griglia</p>
                                <p className="text-blue-400">START rows#cols</p>
                                <p className="text-zinc-400 text-xs mt-1">Es: <span className="text-zinc-300 italic">5#5</span> (massimo 16x16)</p>
                            </div>
                            <div>
                                <p className="text-zinc-500 mb-1">// Colora celle in una posizione specifica</p>
                                <p className="text-emerald-500">count color row col</p>
                                <p className="text-zinc-400 text-xs mt-1">Es: <span className="text-zinc-300 italic">3 R 0 0</span> (colora 3 celle di Rosso a partire dalla riga 0, colonna 0)</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-blue-400 font-semibold mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Modalità GRID (Relativa)
                        </h3>
                        <div className="bg-zinc-950/50 rounded-lg p-4 font-mono text-sm border border-zinc-800/50 space-y-3">
                            <div>
                                <p className="text-zinc-500 mb-1">// Colora celle relative all'ultima posizione</p>
                                <p className="text-blue-500">count color deltaX deltaY</p>
                                <p className="text-zinc-400 text-xs mt-1">Es: <span className="text-zinc-300 italic">2 G 1 0</span> (si sposta di 1 a destra e colora 2 celle di Verde)</p>
                            </div>
                            <p className="text-zinc-500 text-xs italic">NB: L'ultima posizione viene aggiornata alla fine di ogni comando di colore.</p>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Modalità MAZE (Labirinto)
                        </h3>
                        <div className="bg-zinc-950/50 rounded-lg p-4 font-mono text-sm border border-zinc-800/50 space-y-3">
                            <div>
                                <p className="text-zinc-500 mb-1">// Ruota il robot di 90, 180 o 270 gradi a sinistra</p>
                                <p className="text-blue-400">ruota 1|2|3</p>
                                <p className="text-zinc-400 text-xs mt-1">Es: <span className="text-zinc-300 italic">ruota 1</span> (ruota di 90°)</p>
                            </div>
                            <div>
                                <p className="text-zinc-500 mb-1">// Muove il robot in avanti</p>
                                <p className="text-emerald-500">muovi n</p>
                                <p className="text-zinc-400 text-xs mt-1">Es: <span className="text-zinc-300 italic">muovi 2</span> (avanza di 2 posizioni)</p>
                            </div>
                            <p className="text-zinc-500 text-xs italic">NB: Se colpisci un muro rosso, il programma si ferma.</p>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-zinc-400 font-semibold mb-3">Colori Disponibili</h3>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2 text-sm text-zinc-300">
                                <div className="w-4 h-4 rounded-sm bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]"></div>
                                <span>R (Red)</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-zinc-300">
                                <div className="w-4 h-4 rounded-sm bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]"></div>
                                <span>G (Green)</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-zinc-300">
                                <div className="w-4 h-4 rounded-sm bg-[#3b82f6] shadow-[0_0_8px_rgba(59,130,246,0.3)]"></div>
                                <span>B (Blue)</span>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-zinc-400 font-semibold mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                            Modalità MATRIX (Scheda)
                        </h3>
                        <div className="bg-zinc-950/50 rounded-lg p-4 font-mono text-sm border border-zinc-800/50 space-y-3">
                            <div>
                                <p className="text-zinc-500 mb-1">// Accende (+) o Spegne (-) righe e colonne</p>
                                <p className="text-fuchsia-400">+ A ... - 1</p>
                                <p className="text-zinc-400 text-xs mt-1">Es: <span className="text-zinc-300 italic">+ A</span> (Accende colonna A), <span className="text-zinc-300 italic">- 3</span> (Spegne riga 3)</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-yellow-400 font-semibold mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                            Modalità PIXEL (Grafica)
                        </h3>
                        <div className="bg-zinc-950/50 rounded-lg p-4 font-mono text-sm border border-zinc-800/50 space-y-3">
                            <div className="mb-2">
                                <span className="text-xs uppercase bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/20">Importante</span>
                                <p className="text-zinc-400 text-xs mt-1">Ogni riga di codice corrisponde esattamente a una riga dello schermo (0-15).</p>
                            </div>
                            <div>
                                <p className="text-zinc-500 mb-1">// Colori e Loop</p>
                                <p className="text-yellow-400">R, G, B, O</p>
                                <p className="text-zinc-400 text-xs mt-1">
                                    <span className="block mb-1"><span className="text-zinc-300">R</span> = Rosso, <span className="text-zinc-300">G</span> = Verde, <span className="text-zinc-300">O</span> = Spento</span>
                                    <span className="block mb-1"><span className="text-zinc-300">RG</span> = Giallo (R+G), <span className="text-zinc-300">RGB</span> = Bianco</span>
                                    <span className="block"><span className="text-zinc-300">R + B</span> = Pixel Rosso poi Pixel Blu</span>
                                </p>
                            </div>
                            <div>
                                <p className="text-zinc-500 mb-1">// Ripetizione</p>
                                <p className="text-purple-400">16 * ( R )</p>
                                <p className="text-zinc-400 text-xs mt-1">Ripete il comando R per 16 volte.</p>
                            </div>
                        </div>
                    </section>

                    <section className="pt-6 border-t border-zinc-800/50">
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
                            <p className="text-sm leading-relaxed text-zinc-300 text-center italic">
                                "Questa applicazione è stata creata a scopo didattico per apprendere e sviluppare le capacità di coding degli studenti del biennio dell'ITI 'G. Omar' di Novara dal professor <span className="text-emerald-400 font-semibold not-italic">Fabrizio Bonfiglio</span>."
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
