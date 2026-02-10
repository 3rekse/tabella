import React, { useRef, useState } from 'react';
import { useInterpreterStore } from '../lib/interpreter';
import { clsx } from 'clsx';
import { Eraser, HelpCircle, Lock } from 'lucide-react';
import { HelpModal } from './HelpModal';

export const Editor: React.FC = () => {
    const { sourceCode, setSourceCode, pc, isRunning, error, currentGrid, loadProgram, isLocked } = useInterpreterStore();
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Line highlighting logic could be complex with a textarea.
    // A simple approach is to use a backdrop div for highlighting and a transparent textarea on top.

    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        const backdrop = document.getElementById('editor-backdrop');
        if (backdrop) {
            backdrop.scrollTop = e.currentTarget.scrollTop;
            backdrop.scrollLeft = e.currentTarget.scrollLeft;
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e]">
            <div className="bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-400 border-b border-zinc-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <span className="tracking-widest font-bold text-[11px] uppercase opacity-70">Editor</span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => loadProgram('', false)}
                            disabled={isLocked}
                            className="p-1 px-1.5 hover:bg-zinc-800 rounded transition-colors flex items-center gap-1.5 group disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Clear Code"
                        >
                            <Eraser size={14} className="group-hover:text-red-400 transition-colors" />
                            <span className="text-[10px] hidden sm:inline opacity-0 group-hover:opacity-100 transition-opacity">CLEAR</span>
                        </button>
                        <button
                            onClick={() => setIsHelpOpen(true)}
                            className="p-1 px-1.5 hover:bg-zinc-800 rounded transition-colors flex items-center gap-1.5 group"
                            title="Format Help"
                        >
                            <HelpCircle size={14} className="group-hover:text-emerald-400 transition-colors" />
                            <span className="text-[10px] hidden sm:inline opacity-0 group-hover:opacity-100 transition-opacity">HELP</span>
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {isLocked && (
                        <div className="flex items-center gap-1.5 text-zinc-500 bg-zinc-900/50 px-2 py-0.5 rounded border border-zinc-800 animate-pulse">
                            <Lock size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Locked</span>
                        </div>
                    )}
                    {error && <span className="text-red-500 text-[10px] font-mono truncate max-w-[200px]" title={error}>{error}</span>}
                </div>
            </div>

            <div className="relative flex-1 overflow-hidden font-mono text-sm leading-6">
                {/* Highlight Backdrop */}
                <div
                    id="editor-backdrop"
                    className="absolute inset-0 p-4 pointer-events-none whitespace-pre overflow-hidden"
                    style={{ fontFamily: 'monospace' }}
                >
                    {sourceCode.split('\n').map((line, i) => (
                        <div
                            key={i}
                            className={clsx(
                                "w-full px-1 rounded transition-colors duration-150",
                                i === pc && (isRunning || currentGrid !== null) ? "bg-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)] border-l-2 border-yellow-500" : "transparent"
                            )}
                        >
                            {/* Invisible text to maintain height */}
                            <span className="opacity-0">{line || ' '}</span>
                        </div>
                    ))}
                </div>

                {/* Actual Input */}
                <textarea
                    ref={textareaRef}
                    className={clsx(
                        "absolute inset-0 w-full h-full p-4 bg-transparent text-zinc-300 resize-none focus:outline-none transition-opacity duration-300",
                        isLocked && "opacity-50 cursor-not-allowed"
                    )}
                    value={sourceCode}
                    onChange={(e) => setSourceCode(e.target.value)}
                    onScroll={handleScroll}
                    spellCheck={false}
                    readOnly={isLocked}
                    style={{
                        fontFamily: 'monospace',
                        caretColor: isLocked ? 'transparent' : '#fff',
                        lineHeight: '1.5rem' // Match leading-6 (1.5rem = 24px)
                    }}
                    placeholder={`START 5#5\n3 R 0 0\n...`}
                />
            </div>

            <div className="bg-zinc-900 border-t border-zinc-800 p-2 text-xs text-zinc-500 flex justify-between">
                <span>Ln {sourceCode.split('\n').length}, Col 0</span>
                <span>UTF-8</span>
            </div>
            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        </div>
    );
};
