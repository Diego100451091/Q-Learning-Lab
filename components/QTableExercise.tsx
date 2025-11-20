import React, { useState } from 'react';
import { QTable, ACTIONS, Position } from '../types';
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';

interface QTableExerciseProps {
  userTable: QTable;
  realTable: QTable;
  onUpdate: (x: number, y: number, action: string, value: string) => void;
  highlightPos?: Position | null;
}

export const QTableExercise: React.FC<QTableExerciseProps> = ({ 
  userTable, 
  realTable, 
  onUpdate,
  highlightPos 
}) => {
  const [showValidation, setShowValidation] = useState(false);

  // Convert "x,y" keys to sorted array for rendering
  const cells = Object.keys(userTable).sort((a, b) => {
    const [ax, ay] = a.split(',').map(Number);
    const [bx, by] = b.split(',').map(Number);
    return ay - by || ax - bx;
  });

  return (
    <div className="w-full overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-sm">Tabla Q</span>
          <span className="text-sm font-normal text-slate-500">(Tu respuesta)</span>
        </h3>
        <button
          onClick={() => setShowValidation(!showValidation)}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2
            ${showValidation 
              ? 'bg-indigo-100 text-indigo-700' 
              : 'bg-slate-800 text-white hover:bg-slate-700'}`}
        >
           {showValidation ? 'Ocultar Solución' : 'Comprobar Resultados'}
        </button>
      </div>
      
      <div className="overflow-auto flex-1 p-0">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 border-b">Estado (x,y)</th>
              {ACTIONS.map(action => (
                <th key={action} className="px-2 py-3 text-center border-b min-w-[80px]">
                  {action}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cells.map((key) => {
              const [x, y] = key.split(',').map(Number);
              const isHighlighted = highlightPos?.x === x && highlightPos?.y === y;
              
              return (
                <tr 
                  key={key} 
                  className={`border-b last:border-0 transition-colors ${isHighlighted ? 'bg-yellow-50' : 'hover:bg-slate-50'}`}
                >
                  <td className="px-4 py-2 font-mono font-medium text-slate-600 border-r bg-slate-50/50">
                    ({x}, {y})
                  </td>
                  {ACTIONS.map((action) => {
                    const userVal = userTable[key][action];
                    const realVal = realTable[key][action];
                    // Simple validation: match roughly within 0.01 tolerance or exact string
                    const isCorrect = Math.abs(Number(userVal) - realVal) < 0.01;
                    
                    return (
                      <td key={action} className="px-2 py-2 text-center relative p-0">
                        <div className="relative group">
                          <input
                            type="number"
                            step="0.1"
                            value={userVal}
                            onChange={(e) => onUpdate(x, y, action, e.target.value)}
                            className={`
                              w-full h-10 text-center bg-transparent rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none
                              ${showValidation 
                                ? (isCorrect ? 'text-green-600 font-bold bg-green-50' : 'text-red-600 font-bold bg-red-50') 
                                : (isHighlighted ? 'bg-white border border-yellow-300 text-slate-900 font-bold shadow-sm' : 'text-slate-700')
                              }
                            `}
                          />
                          {showValidation && !isCorrect && (
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                              Correcto: {realVal}
                            </div>
                          )}
                          {showValidation && (
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none">
                                {isCorrect ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-red-500" />}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};