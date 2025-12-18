import React, { useRef } from 'react';
import { useInterpreterStore } from '../lib/interpreter';
import { clsx } from 'clsx';

export const Editor: React.FC = () => {
    const { sourceCode, setSourceCode, pc, isRunning, error } = useInterpreterStore();
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
                <span>EDITOR</span>
                {error && <span className="text-red-500 text-xs truncate max-w-[200px]" title={error}>{error}</span>}
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
                                i === pc && isRunning ? "bg-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.1)] border-l-2 border-yellow-500" : "transparent"
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
                    className="absolute inset-0 w-full h-full p-4 bg-transparent text-zinc-300 resize-none focus:outline-none"
                    value={sourceCode}
                    onChange={(e) => setSourceCode(e.target.value)}
                    onScroll={handleScroll}
                    spellCheck={false}
                    style={{
                        fontFamily: 'monospace',
                        caretColor: '#fff',
                        lineHeight: '1.5rem' // Match leading-6 (1.5rem = 24px)
                    }}
                    placeholder={`START 5#5\n3 R 0 0\n...`}
                />
            </div>

            <div className="bg-zinc-900 border-t border-zinc-800 p-2 text-xs text-zinc-500 flex justify-between">
                <span>Ln {sourceCode.split('\n').length}, Col 0</span>
                <span>UTF-8</span>
            </div>
        </div>
    );
};
