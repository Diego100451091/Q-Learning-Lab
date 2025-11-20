import React, { useState, useCallback } from 'react';
import { MapEditor } from './components/MapEditor';
import { QTableExercise } from './components/QTableExercise';
import { GridConfig, CellType, Position, GlobalSettings, QTable, ACTIONS, Direction } from './types';
import { getInitialQTable, getNextPosition, getMaxQ } from './services/qLearningService';
import { Play, RefreshCw, ArrowRight, Settings2, RotateCcw, HelpCircle, Target, Skull, Zap, Calculator, Undo2 } from 'lucide-react';

const INITIAL_SIZE = { rows: 4, cols: 4 };

interface StepInfo {
    state: string;
    action: string;
    reward: number;
    nextState: string;
    oldQ: number;
    maxNextQ: number;
    target: number;
    result: number;
}

interface HistoryState {
  agentPos: Position;
  realQTable: QTable;
  userQTable: QTable;
  gameLog: string[];
  lastStep: StepInfo | null;
}

function App() {
  // --- State ---
  const [grid, setGrid] = useState<GridConfig>({
    rows: INITIAL_SIZE.rows,
    cols: INITIAL_SIZE.cols,
    cells: Array(INITIAL_SIZE.rows).fill(null).map(() => 
      Array(INITIAL_SIZE.cols).fill({ type: CellType.EMPTY, reward: 0 })
    )
  });

  const [settings, setSettings] = useState<GlobalSettings>({
    learningRate: 0.5,
    discountFactor: 0.9
  });

  const [rewards, setRewards] = useState({
    goal: 100,
    trap: -10
  });

  const [agentPos, setAgentPos] = useState<Position>({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState<Position>({ x: 0, y: 0 });
  
  // Two tables: one for user input, one for internal ground truth validation
  const [userQTable, setUserQTable] = useState<QTable>(getInitialQTable(INITIAL_SIZE.rows, INITIAL_SIZE.cols));
  const [realQTable, setRealQTable] = useState<QTable>(getInitialQTable(INITIAL_SIZE.rows, INITIAL_SIZE.cols));
  
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [isEditingMap, setIsEditingMap] = useState(true);
  const [lastStep, setLastStep] = useState<StepInfo | null>(null);

  // --- Logic ---

  const resetTables = useCallback(() => {
    const newTable = getInitialQTable(grid.rows, grid.cols);
    setUserQTable(newTable);
    setRealQTable(newTable);
    setGameLog([]);
    setHistory([]);
    setAgentPos(startPos);
    setLastStep(null);
  }, [grid.rows, grid.cols, startPos]);

  const updateRewardConfig = (type: 'goal' | 'trap', value: number) => {
    setRewards(prev => ({ ...prev, [type]: value }));
    
    setGrid(prevGrid => {
        const newCells = prevGrid.cells.map(row => 
            row.map(cell => {
                if (type === 'goal' && cell.type === CellType.GOAL) {
                    return { ...cell, reward: value };
                }
                if (type === 'trap' && cell.type === CellType.TRAP) {
                    return { ...cell, reward: value };
                }
                return cell;
            })
        );
        return { ...prevGrid, cells: newCells };
    });
    // Note: We don't auto-reset tables here to allow non-destructive editing, 
    // but users should manually reset if they want clean slate.
  };

  const handleCellClick = (pos: Position) => {
    if (!isEditingMap) return;

    const newGrid = { ...grid };
    const currentCell = newGrid.cells[pos.y][pos.x];
    let nextType = CellType.EMPTY;
    let nextReward = 0;

    // Rotation logic: Empty -> Wall -> Trap -> Goal -> Start -> Empty
    switch (currentCell.type) {
      case CellType.EMPTY: 
        nextType = CellType.WALL; nextReward = 0; break;
      case CellType.WALL: 
        nextType = CellType.TRAP; nextReward = rewards.trap; break;
      case CellType.TRAP: 
        nextType = CellType.GOAL; nextReward = rewards.goal; break;
      case CellType.GOAL: 
        nextType = CellType.START; nextReward = 0; break;
      case CellType.START: 
        nextType = CellType.EMPTY; nextReward = 0; break;
      default: 
        nextType = CellType.EMPTY;
    }

    // Enforce single start position logic if selecting START
    if (nextType === CellType.START) {
       // Clear old start
       newGrid.cells.forEach((r, y) => r.forEach((c, x) => {
          if (c.type === CellType.START) newGrid.cells[y][x] = { type: CellType.EMPTY, reward: 0 };
       }));
       setStartPos(pos);
       setAgentPos(pos);
    }

    newGrid.cells[pos.y][pos.x] = { type: nextType, reward: nextReward };
    setGrid(newGrid);
    
    // Reset tables on map change to ensure consistency
    resetTables();
  };

  const handleResize = (rows: number, cols: number) => {
    const newCells = Array(rows).fill(null).map((_, y) => 
      Array(cols).fill(null).map((_, x) => {
        // Preserve existing cells if possible
        if (grid.cells[y] && grid.cells[y][x]) return grid.cells[y][x];
        return { type: CellType.EMPTY, reward: 0 };
      })
    );
    setGrid({ rows, cols, cells: newCells });
    setStartPos({x:0, y:0});
    setAgentPos({x:0, y:0});
    
    setTimeout(() => {
        const newTable = getInitialQTable(rows, cols);
        setUserQTable(newTable);
        setRealQTable(newTable);
        setGameLog([]);
        setHistory([]);
        setLastStep(null);
    }, 50);
  };

  const handleUserQUpdate = (x: number, y: number, action: string, value: string) => {
    setUserQTable(prev => ({
      ...prev,
      [`${x},${y}`]: {
        ...prev[`${x},${y}`],
        [action]: value
      }
    }));
  };

  const undoLastStep = () => {
    if (history.length === 0) return;

    const prevState = history[history.length - 1];
    setAgentPos(prevState.agentPos);
    setRealQTable(prevState.realQTable);
    setUserQTable(prevState.userQTable);
    setGameLog(prevState.gameLog);
    setLastStep(prevState.lastStep);
    
    setHistory(prev => prev.slice(0, -1));
  };

  const performAction = (action: Direction) => {
    // Save state to history before performing action
    setHistory(prev => [...prev, {
        agentPos: { ...agentPos },
        realQTable: JSON.parse(JSON.stringify(realQTable)),
        userQTable: JSON.parse(JSON.stringify(userQTable)),
        gameLog: [...gameLog],
        lastStep: lastStep
    }]);

    const currentPos = { ...agentPos };
    const nextPos = getNextPosition(currentPos, action, grid);
    
    const cell = grid.cells[nextPos.y][nextPos.x];
    const reward = cell.reward;

    const currentQ = realQTable[`${currentPos.x},${currentPos.y}`][action];
    const maxNextQ = getMaxQ(realQTable, nextPos);
    
    // UPDATE: Trap is NOT terminal anymore, only GOAL is terminal.
    const isTerminal = cell.type === CellType.GOAL;
    
    const targetQ = isTerminal 
      ? reward 
      : reward + settings.discountFactor * maxNextQ;
    
    const newQ = (1 - settings.learningRate) * currentQ + settings.learningRate * targetQ;
    const roundedNewQ = parseFloat(newQ.toFixed(2));

    // Store step info for the UI helper BEFORE updating the table
    setLastStep({
        state: `(${currentPos.x},${currentPos.y})`,
        action,
        reward,
        nextState: `(${nextPos.x},${nextPos.y})`,
        oldQ: currentQ,
        maxNextQ,
        target: parseFloat(targetQ.toFixed(2)),
        result: roundedNewQ
    });

    setRealQTable(prev => ({
      ...prev,
      [`${currentPos.x},${currentPos.y}`]: {
        ...prev[`${currentPos.x},${currentPos.y}`],
        [action]: roundedNewQ
      }
    }));

    const logEntry = `S(${currentPos.x},${currentPos.y}) + A(${action}) -> R(${reward}) -> S'(${nextPos.x},${nextPos.y})`;
    setGameLog(prev => [logEntry, ...prev]);

    if (isTerminal) {
      setGameLog(prev => ["--- META ALCANZADA (Reiniciando) ---", ...prev]);
      setAgentPos(startPos);
    } else {
      setAgentPos(nextPos);
    }
  };

  const generateRandomStep = () => {
    const randomAction = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    performAction(randomAction);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans p-4 md:p-8">
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
              <Zap className="w-6 h-6" />
            </div>
            Q-Learning Lab
          </h1>
          <p className="text-slate-500 mt-1">Configura el entorno, muévete y calcula los valores Q manualmente.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 px-2">
              <label className="text-xs font-bold uppercase text-slate-500">Alpha (α):</label>
              <input 
                type="number" 
                step="0.1" min="0" max="1"
                value={settings.learningRate}
                onChange={(e) => setSettings(s => ({...s, learningRate: parseFloat(e.target.value)}))}
                className="w-20 border border-slate-300 bg-white text-slate-900 rounded px-2 py-1 text-sm text-right font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="flex items-center gap-2 px-2">
              <label className="text-xs font-bold uppercase text-slate-500">Gamma (γ):</label>
              <input 
                type="number" 
                step="0.1" min="0" max="1"
                value={settings.discountFactor}
                onChange={(e) => setSettings(s => ({...s, discountFactor: parseFloat(e.target.value)}))}
                className="w-20 border border-slate-300 bg-white text-slate-900 rounded px-2 py-1 text-sm text-right font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Map & Controls */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Map Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                <Settings2 className="w-5 h-5 text-indigo-600" />
                Entorno
              </h2>
              <div className="flex gap-2">
                 <button 
                    onClick={() => setIsEditingMap(!isEditingMap)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors
                      ${isEditingMap ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300'}`}
                 >
                    {isEditingMap ? 'Editando' : 'Bloqueado'}
                 </button>
                 <button onClick={resetTables} title="Resetear Posición y Tablas" className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                    <RotateCcw className="w-4 h-4" />
                 </button>
              </div>
            </div>

            {/* Rewards Config */}
            {isEditingMap && (
              <div className="mb-6 p-3 bg-slate-50 rounded-lg border border-slate-100 grid grid-cols-2 gap-4">
                 <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1">
                       <Target className="w-3 h-3" /> Meta
                    </label>
                    <input 
                      type="number" 
                      value={rewards.goal}
                      onChange={(e) => updateRewardConfig('goal', parseFloat(e.target.value))}
                      className="w-full border border-slate-300 bg-white text-slate-900 rounded px-2 py-1 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                 </div>
                 <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1">
                       <Skull className="w-3 h-3" /> Trampa
                    </label>
                    <input 
                      type="number" 
                      value={rewards.trap}
                      onChange={(e) => updateRewardConfig('trap', parseFloat(e.target.value))}
                      className="w-full border border-slate-300 bg-white text-slate-900 rounded px-2 py-1 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                 </div>
              </div>
            )}

            {/* Grid Size Controls */}
            {isEditingMap && (
                <div className="flex gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-medium">Filas:</span>
                        <div className="flex rounded border border-slate-300 bg-white overflow-hidden shadow-sm">
                           <button className="px-3 py-1 hover:bg-slate-50 text-slate-600 border-r border-slate-200" onClick={() => handleResize(Math.max(2, grid.rows-1), grid.cols)}>-</button>
                           <span className="px-3 py-1 bg-white font-mono text-slate-800 min-w-[2rem] text-center">{grid.rows}</span>
                           <button className="px-3 py-1 hover:bg-slate-50 text-slate-600 border-l border-slate-200" onClick={() => handleResize(Math.min(8, grid.rows+1), grid.cols)}>+</button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-medium">Cols:</span>
                        <div className="flex rounded border border-slate-300 bg-white overflow-hidden shadow-sm">
                           <button className="px-3 py-1 hover:bg-slate-50 text-slate-600 border-r border-slate-200" onClick={() => handleResize(grid.rows, Math.max(2, grid.cols-1))}>-</button>
                           <span className="px-3 py-1 bg-white font-mono text-slate-800 min-w-[2rem] text-center">{grid.cols}</span>
                           <button className="px-3 py-1 hover:bg-slate-50 text-slate-600 border-l border-slate-200" onClick={() => handleResize(grid.rows, Math.min(8, grid.cols+1))}>+</button>
                        </div>
                    </div>
                </div>
            )}

            <MapEditor 
              grid={grid} 
              agentPos={agentPos} 
              onCellClick={handleCellClick}
              readOnly={!isEditingMap}
            />
          </div>

          {/* Action Controls */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                    <Play className="w-5 h-5 text-indigo-600" />
                    Simulación
                </h2>
                <button 
                    onClick={undoLastStep}
                    disabled={history.length === 0}
                    className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors
                        ${history.length === 0 
                            ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 shadow-sm'}`}
                >
                    <Undo2 className="w-3.5 h-3.5" />
                    Deshacer
                </button>
             </div>
             
             <div className="grid grid-cols-2 gap-6">
                
                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-2 place-items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div></div>
                    <button onClick={() => performAction('UP')} className="p-3 bg-white border border-slate-200 shadow-sm rounded-lg hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 active:scale-95 transition-all">
                        <ArrowRight className="w-5 h-5 -rotate-90 text-slate-700" />
                    </button>
                    <div></div>
                    
                    <button onClick={() => performAction('LEFT')} className="p-3 bg-white border border-slate-200 shadow-sm rounded-lg hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 active:scale-95 transition-all">
                        <ArrowRight className="w-5 h-5 rotate-180 text-slate-700" />
                    </button>
                    <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                    <button onClick={() => performAction('RIGHT')} className="p-3 bg-white border border-slate-200 shadow-sm rounded-lg hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 active:scale-95 transition-all">
                        <ArrowRight className="w-5 h-5 text-slate-700" />
                    </button>

                    <div></div>
                    <button onClick={() => performAction('DOWN')} className="p-3 bg-white border border-slate-200 shadow-sm rounded-lg hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 active:scale-95 transition-all">
                        <ArrowRight className="w-5 h-5 rotate-90 text-slate-700" />
                    </button>
                    <div></div>
                </div>

                {/* Random & Help */}
                <div className="flex flex-col gap-3 justify-center">
                   <button 
                      onClick={generateRandomStep}
                      className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm font-semibold"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Paso Aleatorio
                   </button>
                   
                   <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 flex items-start gap-2 border border-blue-100 mt-auto">
                        <HelpCircle className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
                        <p>
                           Mueve el agente y rellena la tabla Q con la fórmula.
                        </p>
                   </div>
                </div>
             </div>
          </div>
          
          {/* Log */}
          <div className="bg-slate-900 p-4 rounded-xl shadow-inner h-48 overflow-y-auto font-mono text-xs text-slate-300 custom-scrollbar">
             <div className="text-slate-500 mb-2 uppercase tracking-wider font-bold text-[10px] flex justify-between">
                <span>Log de Eventos</span>
                <span className="text-slate-600">History</span>
             </div>
             {gameLog.length === 0 && <div className="text-slate-600 italic py-4 text-center">Esperando acciones del agente...</div>}
             {gameLog.map((log, i) => (
               <div key={i} className="mb-1.5 border-l-2 border-indigo-500 pl-3 py-0.5 hover:bg-slate-800/50 rounded-r transition-colors">
                 {log}
               </div>
             ))}
          </div>

        </div>

        {/* Right Column: Q-Table Input */}
        <div className="lg:col-span-7 h-full min-h-[500px]">
          <QTableExercise 
            userTable={userQTable} 
            realTable={realQTable} 
            onUpdate={handleUserQUpdate}
            highlightPos={agentPos} 
          />
        </div>
      </main>
    </div>
  );
}

export default App;