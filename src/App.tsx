import { useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Controls } from './components/Controls';
import { Editor } from './components/Editor';
import { TableGrid } from './components/TableGrid';
import { CertificateModal } from './components/CertificateModal';
import { useInterpreterStore } from './lib/interpreter';
import { generateRandomTarget, generateMatrixTarget, generatePixelTarget } from './lib/targetGenerator';

import './App.css';

function App() {
  const { currentGrid, targetGrid, setTargetGrid, loadProgram, sourceCode, totalMovements, mode, isRunning, step, mazeState, mazeScore } = useInterpreterStore();

  useEffect(() => {
    // Generate initial target/maze only when switching TO this mode
    // This prevents regenerating the maze on every render
    if (mode === 'MAZE') {
      const currentMazeState = useInterpreterStore.getState().mazeState;
      if (!currentMazeState) {
        // Only reset if there's no maze yet (initial load or mode switch)
        useInterpreterStore.getState().reset();
      }
    } else if (mode === 'MATRIX') {
      const { grid, code } = generateMatrixTarget();
      setTargetGrid(grid, code);
    } else if (mode === 'PIXEL') {
      const { grid, code } = generatePixelTarget();
      setTargetGrid(grid, code);
    } else {
      setTargetGrid(generateRandomTarget());
    }
  }, [mode, setTargetGrid]);

  // Sync execution state is handled in store, but we can add effects here if needed.
  // For the re-parsing when source changes:
  useEffect(() => {
    // Whenever source code changes, we effectively reload the program to parse it
    // But we don't want to reset the grid if we are running.. 
    // Actually simplicity: if you edit, you reset execution.
    // The loadProgram resets everything.
    loadProgram(sourceCode);
  }, [sourceCode]);

  useEffect(() => {
    let interval: any;
    if (isRunning) {
      interval = setInterval(() => {
        step();
      }, 300); // 300ms between steps
    }
    return () => clearInterval(interval);
  }, [isRunning, step]);

  return (
    <div className="app-shell">
      <div className="app-glow-container selection:bg-purple-500/30">
        <Controls />

        <div className="flex-1 overflow-hidden min-h-0">
          <PanelGroup direction="horizontal" className="h-full" id="main-layout">

            {/* AREA 1: Target (Hidden in MAZE mode) */}
            {mode !== 'MAZE' && (
              <>
                <Panel id="objective" order={1} defaultSize={25} minSize={20} className="border-r border-zinc-800">
                  <TableGrid grid={targetGrid} label="Objective" mode={mode} mazeState={mazeState} mazeScore={mazeScore} />
                </Panel>
                <PanelResizeHandle className="w-1 bg-zinc-950 hover:bg-purple-500/50 transition-colors" />
              </>
            )}

            {/* AREA 2: Editor */}
            <Panel id="editor" order={2} defaultSize={mode === 'MAZE' ? 40 : 40} minSize={30}>
              <Editor />
            </Panel>

            <PanelResizeHandle className="w-1 bg-zinc-950 hover:bg-purple-500/50 transition-colors" />

            {/* AREA 3: Result */}
            <Panel id="result" order={3} defaultSize={mode === 'MAZE' ? 60 : 35} minSize={20} className="border-l border-zinc-800">
              <TableGrid grid={currentGrid} label={mode === 'MAZE' ? "Maze" : "Result"} className="bg-zinc-900/50 transition-colors" totalMovements={mode === 'GRID' ? totalMovements : undefined} mode={mode} mazeState={mazeState} mazeScore={mazeScore} />
            </Panel>

          </PanelGroup>
        </div>
      </div>
      <CertificateModal />
    </div>
  );
}

export default App;
