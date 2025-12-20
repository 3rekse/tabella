import React, { useRef, useEffect } from 'react';
import { useInterpreterStore } from '../lib/interpreter';
import { generateRandomTarget } from '../lib/targetGenerator';
import { Play, StepForward, RotateCcw, Save, Upload, AlertCircle, Trophy, Timer } from 'lucide-react';
import { clsx } from 'clsx';

export const Controls: React.FC = () => {
    const {
        run, step, reset, loadProgram, sourceCode, isRunning, error, mode, setMode,
        isChallengeActive, timeLeft, startChallenge, stopChallenge, tickTimer, setTargetGrid
    } = useInterpreterStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let interval: any;
        if (isChallengeActive) {
            interval = setInterval(() => {
                tickTimer();
            }, 1000);

            // Anti-reload protection
            const handleBeforeUnload = (e: BeforeUnloadEvent) => {
                e.preventDefault();
                e.returnValue = '';
            };
            window.addEventListener('beforeunload', handleBeforeUnload);

            // Visibility protection (Anti-tab switch)
            const handleVisibilityChange = () => {
                if (document.hidden && isChallengeActive) {
                    console.warn("Visibility lost during challenge!");
                }
            };
            document.addEventListener('visibilitychange', handleVisibilityChange);

            return () => {
                clearInterval(interval);
                window.removeEventListener('beforeunload', handleBeforeUnload);
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            };
        }
        return () => clearInterval(interval);
    }, [isChallengeActive, tickTimer]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSave = () => {
        const blob = new Blob([sourceCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const extension = mode === 'GRID' ? 'grd' : 'tbl';
        a.download = `program.${extension}`;
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
                loadProgram(text, true);
            };
            reader.readAsText(file);
        }
    };

    return (
        <div className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-4 justify-between">
            <div className="flex items-center gap-2">
                <img src="/ccla.svg" alt="CCLA Logo" className="h-8 w-auto mr-2" />
                <div className="relative group mr-4">
                    <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value as 'TABLE' | 'GRID')}
                        disabled={isChallengeActive}
                        className="appearance-none bg-transparent text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent cursor-pointer outline-none hover:opacity-80 transition-opacity pr-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value="TABLE" className="text-zinc-900 bg-zinc-100">TABLE</option>
                        <option value="GRID" className="text-zinc-900 bg-zinc-100">GRID</option>
                    </select>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-blue-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>

                <div className="h-6 w-px bg-zinc-700 mx-2" />

                <ActionButton onClick={run} disabled={isRunning} icon={<Play size={16} />} label="Run" color="blue" />
                <ActionButton onClick={step} disabled={false} icon={<StepForward size={16} />} label="Step" />
                <ActionButton onClick={reset} disabled={false} icon={<RotateCcw size={16} />} label="Reset" color="red" />

                <ActionButton onClick={() => setTargetGrid(generateRandomTarget())} disabled={isChallengeActive} icon={<RotateCcw size={16} />} label="New Goal" />

                <div className="h-6 w-px bg-zinc-700 mx-2" />

                <ActionButton
                    onClick={isChallengeActive ? stopChallenge : startChallenge}
                    disabled={false}
                    icon={<Trophy size={16} className={isChallengeActive ? "text-yellow-500 animate-pulse" : ""} />}
                    label={isChallengeActive ? "Stop Challenge" : "Start Challenge"}
                    color={isChallengeActive ? 'red' : 'blue'}
                />

                {isChallengeActive && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-md border border-zinc-700 ml-2 animate-in slide-in-from-left-2 transition-all">
                        <Timer size={16} className="text-emerald-400" />
                        <span className="font-mono text-emerald-400 tabular-nums font-bold">
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                )}
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
                        accept=".tbl,.grd"
                        onChange={handleLoad}
                        className="hidden"
                    />
                    <ActionButton
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isChallengeActive}
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
