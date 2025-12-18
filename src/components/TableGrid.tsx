import React from 'react';
import type { Grid, Cell } from '../lib/interpreter';
import { clsx } from 'clsx';

interface TableGridProps {
    grid: Grid | null;
    label?: string;
    className?: string;
}

export const TableGrid: React.FC<TableGridProps> = ({ grid, label, className }) => {
    if (!grid) {
        return (
            <div className={clsx("flex flex-col items-center justify-center p-4 h-full text-zinc-500", className)}>
                {label && <h3 className="mb-2 text-lg font-semibold">{label}</h3>}
                <div className="border-2 border-dashed border-zinc-700 w-full h-64 flex items-center justify-center rounded-lg">
                    No Table Defined
                </div>
            </div>
        );
    }

    const rows = grid.length;
    const cols = grid[0].length;

    return (
        <div className={clsx("flex flex-col h-full bg-zinc-900 overflow-hidden", className)}>
            {label && <h3 className="py-2 px-4 text-sm font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-950 border-b border-zinc-800">{label}</h3>}

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center custom-scrollbar">
                <div
                    className="grid gap-[1px] bg-zinc-700 border border-zinc-700 shadow-xl"
                    style={{
                        gridTemplateColumns: `repeat(${cols}, minmax(20px, 1fr))`,
                        maxWidth: '100%',
                        maxHeight: '100%',
                    }}
                >
                    {grid.map((row, rIndex) => (
                        row.map((cell, cIndex) => (
                            <CellView key={`${rIndex}-${cIndex}`} cell={cell} />
                        ))
                    ))}
                </div>
            </div>

            <div className="bg-zinc-950 px-2 py-1 text-xs text-zinc-500 border-t border-zinc-800 flex justify-between">
                <span>{rows}x{cols}</span>
            </div>
        </div>
    );
};

const CellView: React.FC<{ cell: Cell }> = ({ cell }) => {
    let bgColor = 'bg-zinc-800'; // Default empty

    if (cell.color === 'R') bgColor = 'bg-red-500';
    if (cell.color === 'G') bgColor = 'bg-green-500';
    // Use a lighter cyan-blue to avoid any purple tint on dark screens
    if (cell.color === 'B') bgColor = 'bg-[#3b82f6]'; // Tailwind blue-500, brighter and safer

    return (
        <div className={clsx("w-6 h-6 sm:w-8 sm:h-8 transition-colors duration-200", bgColor)}>
        </div>
    );
};
