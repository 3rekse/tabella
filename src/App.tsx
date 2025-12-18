import { useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Controls } from './components/Controls';
import { Editor } from './components/Editor';
import { TableGrid } from './components/TableGrid';
import { useInterpreterStore } from './lib/interpreter';
import { generateRandomTarget } from './lib/targetGenerator';

import './App.css';

function App() {
  const { currentGrid, targetGrid, setTargetGrid, loadProgram, sourceCode, totalMovements, mode, isRunning, step } = useInterpreterStore();

  useEffect(() => {
    // Generate initial target on mount
    setTargetGrid(generateRandomTarget());
  }, []);

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
          <PanelGroup direction="horizontal" className="h-full">

            {/* AREA 1: Target */}
            <Panel defaultSize={25} minSize={20} className="border-r border-zinc-800">
              <TableGrid grid={targetGrid} label="Objective" />
            </Panel>

            <PanelResizeHandle className="w-1 bg-zinc-950 hover:bg-purple-500/50 transition-colors" />

            {/* AREA 2: Editor */}
            <Panel defaultSize={40} minSize={30}>
              <Editor />
            </Panel>

            <PanelResizeHandle className="w-1 bg-zinc-950 hover:bg-purple-500/50 transition-colors" />

            {/* AREA 3: Result */}
            <Panel defaultSize={35} minSize={20} className="border-l border-zinc-800">
              <TableGrid grid={currentGrid} label="Result" className="bg-zinc-900/50 transition-colors" totalMovements={mode === 'GRID' ? totalMovements : undefined} />
            </Panel>

          </PanelGroup>
        </div>
      </div>
    </div>
  );
}

export default App;
