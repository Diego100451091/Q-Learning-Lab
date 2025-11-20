import React from 'react';
import { GridConfig, Position, CellType } from '../types';
import { Target, Skull, Ban, MapPin, Flag } from 'lucide-react';

interface MapEditorProps {
  grid: GridConfig;
  agentPos: Position;
  onCellClick: (pos: Position) => void;
  readOnly?: boolean;
}

export const MapEditor: React.FC<MapEditorProps> = ({ grid, agentPos, onCellClick, readOnly = false }) => {
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${grid.cols}, minmax(3rem, 1fr))`,
        }}
      >
        {grid.cells.map((row, y) =>
          row.map((cell, x) => {
            const isAgent = agentPos.x === x && agentPos.y === y;
            let bgColor = 'bg-white';
            let icon = null;

            switch (cell.type) {
              case CellType.WALL:
                bgColor = 'bg-slate-800';
                icon = <Ban className="w-5 h-5 text-slate-500" />;
                break;
              case CellType.TRAP:
                bgColor = 'bg-red-100 border-red-300';
                icon = <Skull className="w-5 h-5 text-red-500" />;
                break;
              case CellType.GOAL:
                bgColor = 'bg-emerald-100 border-emerald-300';
                icon = <Target className="w-5 h-5 text-emerald-600" />;
                break;
              case CellType.START:
                bgColor = 'bg-blue-50 border-blue-200';
                icon = <Flag className="w-4 h-4 text-blue-400" />;
                break;
              default:
                bgColor = 'bg-white hover:bg-slate-50';
            }

            return (
              <div
                key={`${x}-${y}`}
                onClick={() => !readOnly && onCellClick({ x, y })}
                className={`
                  relative h-12 w-12 sm:h-16 sm:w-16 flex items-center justify-center 
                  border-2 rounded-md cursor-pointer transition-all duration-200
                  ${bgColor}
                  ${isAgent ? 'ring-4 ring-blue-500 ring-opacity-50 z-10' : 'border-slate-200'}
                `}
                title={`(${x},${y}) R:${cell.reward}`}
              >
                <span className="absolute top-0.5 left-1 text-[10px] text-slate-400 font-mono">
                  {x},{y}
                </span>
                
                {icon}

                {isAgent && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-blue-600 text-white p-1 rounded-full shadow-lg animate-bounce-slight">
                      <MapPin className="w-6 h-6" fill="currentColor" />
                    </div>
                  </div>
                )}

                {cell.reward !== 0 && cell.type !== CellType.WALL && (
                  <span className={`absolute bottom-0.5 right-1 text-[10px] font-bold ${cell.reward > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {cell.reward}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
      {!readOnly && (
        <p className="mt-3 text-xs text-slate-500">
          Clic en las celdas para rotar: Vacío → Muro → Trampa → Meta → Inicio
        </p>
      )}
    </div>
  );
};
