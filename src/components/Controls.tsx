import React, { useRef } from 'react';
import { useInterpreterStore } from '../lib/interpreter';
import { generateRandomTarget } from '../lib/targetGenerator';
import { Play, StepForward, RotateCcw, Save, Upload, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

export const Controls: React.FC = () => {
    const { run, step, reset, loadProgram, sourceCode, isRunning, error } = useInterpreterStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSave = () => {
        const blob = new Blob([sourceCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'program.tbl';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const text = ev.target?.result as string;
                loadProgram(text);
            };
            reader.readAsText(file);
        }
    };

    return (
        <div className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-4 justify-between">
            <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mr-4">
                    TABELLA
                </h1>

                <div className="h-6 w-px bg-zinc-700 mx-2" />

                <ActionButton onClick={run} disabled={isRunning} icon={<Play size={16} />} label="Run" color="blue" />
                <ActionButton onClick={step} disabled={false} icon={<StepForward size={16} />} label="Step" />
                <ActionButton onClick={reset} disabled={false} icon={<RotateCcw size={16} />} label="Reset" color="red" />

                <ActionButton onClick={() => useInterpreterStore.getState().setTargetGrid(generateRandomTarget())} disabled={false} icon={<RotateCcw size={16} />} label="New Goal" />
            </div>

            {error && (
                <div className="flex items-center gap-2 text-red-500 bg-red-950/30 px-3 py-1.5 rounded-full border border-red-900/50">
                    <AlertCircle size={14} />
                    <span className="text-xs font-medium">{error}</span>
                </div>
            )}

            <div className="flex items-center gap-2">
                <ActionButton onClick={handleSave} disabled={false} icon={<Save size={16} />} label="Save" />
                <div className="relative">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".tbl"
                        onChange={handleLoad}
                        className="hidden"
                    />
                    <ActionButton
                        onClick={() => fileInputRef.current?.click()}
                        disabled={false}
                        icon={<Upload size={16} />}
                        label="Load"
                    />
                </div>
            </div>
        </div>
    );
};

interface ActionButtonProps {
    onClick: () => void;
    disabled: boolean;
    icon: React.ReactNode;
    label: string;
    color?: 'default' | 'blue' | 'red';
}

const ActionButton: React.FC<ActionButtonProps> = ({ onClick, disabled, icon, label, color = 'default' }) => {
    const colorStyles = {
        default: "hover:bg-zinc-800 text-zinc-300",
        blue: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20",
        red: "hover:bg-red-900/50 text-red-400 hover:text-red-300",
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                colorStyles[color]
            )}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
};
