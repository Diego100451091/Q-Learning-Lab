export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export const ACTIONS: Direction[] = ['LEFT', 'RIGHT', 'UP', 'DOWN'];

export enum CellType {
  EMPTY = 'EMPTY',
  WALL = 'WALL',
  TRAP = 'TRAP', // Negative reward
  GOAL = 'GOAL', // Positive reward
  START = 'START'
}

export interface Position {
  x: number; // col
  y: number; // row
}

export interface CellConfig {
  type: CellType;
  reward: number;
}

export interface GridConfig {
  rows: number;
  cols: number;
  cells: CellConfig[][];
}

export interface QTable {
  [key: string]: {
    LEFT: number;
    RIGHT: number;
    UP: number;
    DOWN: number;
  };
}

export interface SimulationStep {
  stepIndex: number;
  state: Position;
  action: Direction;
  reward: number;
  nextState: Position;
  maxNextQ: number; // Max Q value of next state (for display/hint)
}

export interface GlobalSettings {
  learningRate: number; // Alpha
  discountFactor: number; // Gamma
}