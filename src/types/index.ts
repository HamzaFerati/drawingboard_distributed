export interface Point {
  x: number;
  y: number;
}

export interface DrawingEvent {
  id: string;
  type: 'draw' | 'erase' | 'clear' | 'undo';
  userId: string;
  timestamp: number;
  data: any;
  version: number;
}

export interface DrawingOperation {
  type: 'stroke' | 'erase' | 'clear';
  points: Point[];
  color: string;
  size: number;
  tool: DrawingTool;
  timestamp: number;
}

export interface User {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  lastSeen: number;
  cursor?: Point;
}

export interface SystemState {
  users: Record<string, User>;
  operations: DrawingOperation[];
  currentVersion: number;
  lastUpdate: number;
}

export type DrawingTool = 'pen' | 'eraser' | 'line' | 'rectangle' | 'circle';

export interface DistributedNode {
  id: string;
  isLeader: boolean;
  lastHeartbeat: number;
  state: SystemState;
}