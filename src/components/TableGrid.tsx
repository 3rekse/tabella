import React from 'react';
import { Turtle, Leaf } from 'lucide-react';
import { clsx } from 'clsx';
import { type Grid as GridType } from '../lib/interpreter';
import { type MazeGrid } from '../lib/mazeGenerator';

interface TableGridProps {
    grid: GridType | null;
    label: string;
    className?: string;
    totalMovements?: number;
    mode: 'TABLE' | 'GRID' | 'MAZE';
    mazeState: {
        walls: MazeGrid['cells'];
        items: MazeGrid['items'];
        exit: { r: number; c: number } | null;
        visited: { r: number; c: number }[];
        turtle: { r: number; c: number; dir: number; };
    } | null;
    mazeScore: number;
}

const CellView: React.FC<{ cell: { color: string | null } }> = ({ cell }) => {
    const colorClasses = {
        'R': 'bg-red-500 shadow-[inset_0_0_10px_rgba(239,68,68,0.5)] border-red-400/30',
        'G': 'bg-green-500 shadow-[inset_0_0_10px_rgba(34,197,94,0.5)] border-green-400/30',
        'B': 'bg-blue-500 shadow-[inset_0_0_10px_rgba(59,130,246,0.5)] border-blue-400/30',
        null: 'bg-zinc-800/50 border-zinc-700/50'
    };

    return (
        <div className={clsx(
            "w-6 h-6 sm:w-8 sm:h-8 border transition-all duration-300 rounded-sm",
            colorClasses[cell?.color as keyof typeof colorClasses || null]
        )} />
    );
};

const CarrotIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M2.27 21.7s9.87-3.5 12.73-6.36a4.5 4.5 0 0 0-6.36-6.37C5.78 11.83 2.27 21.7 2.27 21.7z" fill="currentColor" fillOpacity="0.3" />
        <path d="M19.77 4.23l1.96-1.96M15.53 8.47l1.96-1.96M18.36 5.64l1.96-1.96" />
        <path d="M14 6.5L17.5 10" />
    </svg>
);

const MazeCellView: React.FC<{
    walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
    hasTurtle: boolean;
    turtleDir: number;
    isVisited: boolean;
    isExit: boolean;
    item?: { type: 'leaf' | 'carrot', collected: boolean }
}> = ({ walls, hasTurtle, turtleDir, isVisited, isExit, item }) => {

    // Mapping: 0: Right, 90: Up, 180: Left, 270: Down
    const getTurtleStyle = (dir: number) => {
        switch (dir) {
            case 0: return { transform: 'rotate(0deg)' };       // Right
            case 90: return { transform: 'rotate(270deg)' };        // Up
            case 180: return { transform: 'rotate(180deg) scaleY(-1)' }; // Left + vertical mirror
            case 270: return { transform: 'rotate(90deg)' };      // Down
            default: return { transform: 'rotate(270deg)' };
        }
    };

    return (
        <div className={clsx(
            "w-6 h-6 sm:w-8 sm:h-8 relative transition-all duration-300",
            !isVisited && !isExit && "bg-zinc-800/20",
            isVisited && !isExit && "bg-zinc-700/40",
            isExit && "bg-green-500/30 shadow-[inset_0_0_15px_rgba(34,197,94,0.4)]",
            walls.top && "border-t-[3px] border-red-500 shadow-[0_-2px_6px_-1px_rgba(239,68,68,0.5)]",
            walls.right && "border-r-[3px] border-red-500 shadow-[2px_0_6px_-1px_rgba(239,68,68,0.5)]",
            walls.bottom && "border-b-[3px] border-red-500 shadow-[0_2px_6px_-1px_rgba(239,68,68,0.5)]",
            walls.left && "border-l-[3px] border-red-500 shadow-[-2px_0_6px_-1px_rgba(239,68,68,0.5)]"
        )}>
            {item && !item.collected && (
                <div className="absolute inset-0 flex items-center justify-center p-1">
                    {item.type === 'leaf' ? (
                        <Leaf className="w-full h-full text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
                    ) : (
                        <CarrotIcon className="w-full h-full text-orange-400 drop-shadow-[0_0_4px_rgba(251,146,60,0.5)]" />
                    )}
                </div>
            )}
            {hasTurtle && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="transition-all duration-300" style={getTurtleStyle(turtleDir)}>
                        <Turtle
                            className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]"
                            fill="currentColor"
                            fillOpacity={0.2}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export const TableGrid: React.FC<TableGridProps> = ({ grid, label, className, totalMovements, mode, mazeState, mazeScore }) => {
    const rows = mode === 'MAZE' ? 16 : grid?.length || 0;
    const cols = mode === 'MAZE' ? 16 : grid?.[0]?.length || 0;

    return (
        <div className={clsx("flex flex-col h-full bg-zinc-900 overflow-hidden", className)}>
            <div className="px-4 py-2 bg-zinc-950/50 border-b border-zinc-800 flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{label}</span>
                <span className="text-[10px] font-mono text-zinc-500">{rows}x{cols}</span>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center custom-scrollbar">
                <div
                    className="grid gap-0"
                    style={{
                        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                        width: 'fit-content'
                    }}
                >
                    {mode === 'MAZE' && mazeState ? (
                        mazeState.walls.map((row, rIndex) => (
                            row.map((wall, cIndex) => {
                                const item = mazeState.items.find(it => it.r === rIndex && it.c === cIndex);
                                const isVisited = mazeState.visited.some(v => v.r === rIndex && v.c === cIndex);
                                const isExit = mazeState.exit?.r === rIndex && mazeState.exit?.c === cIndex;
                                return (
                                    <MazeCellView
                                        key={`${rIndex}-${cIndex}`}
                                        walls={wall}
                                        hasTurtle={mazeState.turtle.r === rIndex && mazeState.turtle.c === cIndex}
                                        turtleDir={mazeState.turtle.dir}
                                        isVisited={isVisited}
                                        isExit={isExit}
                                        item={item}
                                    />
                                );
                            })
                        ))
                    ) : (
                        grid?.map((row, rIndex) => (
                            row.map((cell, cIndex) => (
                                <CellView key={`${rIndex}-${cIndex}`} cell={cell} />
                            ))
                        ))
                    )}
                </div>
            </div>

            {mode === 'GRID' && totalMovements !== undefined && (
                <div className="px-4 py-2 bg-emerald-500/5 border-t border-emerald-500/10 flex justify-between items-center">
                    <span className="text-[10px] font-medium text-emerald-400 uppercase">Movement Stats</span>
                    <span className="text-xs font-mono text-emerald-400">{totalMovements} steps</span>
                </div>
            )}
            {mode === 'MAZE' && (
                <div className="px-4 py-3 bg-blue-500/5 border-t border-blue-500/10 flex justify-between items-center">
                    <div className="flex gap-4">
                        <div className="flex items-center gap-1.5 opacity-50">
                            <Leaf size={14} className="text-emerald-400" />
                            <span className="text-[10px] text-zinc-400">1pt</span>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-50">
                            <CarrotIcon className="w-3.5 h-3.5 text-orange-400" />
                            <span className="text-[10px] text-zinc-400">2pt</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-0.5 bg-blue-500/10 rounded border border-blue-500/20">
                        <span className="text-[10px] font-bold text-blue-400 uppercase">Score: {mazeScore}</span>
                    </div>
                </div>
            )}
        </div>
    );
};
