import { Direction, GridConfig, Position, QTable, CellType } from '../types';

export const getInitialQTable = (rows: number, cols: number): QTable => {
  const table: QTable = {};
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      table[`${x},${y}`] = { UP: 0, DOWN: 0, LEFT: 0, RIGHT: 0 };
    }
  }
  return table;
};

export const getNextPosition = (
  current: Position,
  action: Direction,
  grid: GridConfig
): Position => {
  let { x, y } = current;

  switch (action) {
    case 'UP': y = Math.max(0, y - 1); break;
    case 'DOWN': y = Math.min(grid.rows - 1, y + 1); break;
    case 'LEFT': x = Math.max(0, x - 1); break;
    case 'RIGHT': x = Math.min(grid.cols - 1, x + 1); break;
  }

  // Check for walls
  if (grid.cells[y][x].type === CellType.WALL) {
    return current; // Bounce back
  }

  return { x, y };
};

export const calculateQUpdate = (
  currentQ: number,
  reward: number,
  maxNextQ: number,
  alpha: number,
  gamma: number
): number => {
  // Q(s,a) = (1 - alpha) * Q(s,a) + alpha * (reward + gamma * max(Q(s', a')))
  // Or commonly: Q(s,a) + alpha * (reward + gamma * max(Q(s', a')) - Q(s,a))
  // We use the direct weighted average form for clarity in step-by-step
  const newValue = (1 - alpha) * currentQ + alpha * (reward + gamma * maxNextQ);
  return parseFloat(newValue.toFixed(3)); // Rounding for UI simplicity
};

export const getMaxQ = (table: QTable, pos: Position): number => {
  const qValues = table[`${pos.x},${pos.y}`];
  if (!qValues) return 0;
  return Math.max(qValues.UP, qValues.DOWN, qValues.LEFT, qValues.RIGHT);
};
