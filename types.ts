
export interface Word {
  word: string;
  hint: string;
}

export interface PlacedWord {
  text: string;
  hint: string;
  found: boolean;
  positions: { x: number; y: number }[];
  color: string;
}

export interface GridCell {
  letter: string;
}

export type Grid = GridCell[][];

export interface GameLevel {
  level: number;
  gridSize: number;
  timeLimitSeconds: number;
  words: Word[];
}

export interface GameDefinition {
  id: string;
  theme: string;
  language: string;
  levels: GameLevel[];
}

export interface GameHistory {
  theme:string;
  language: string;
  levelsCompleted: number;
  totalLevels: number;
  date: string; // ISO string
  won: boolean;
}


export enum GameState {
  Setup,
  Loading,
  Generated,
  Playing,
  Won,
  Lost,
  ShowingAnswers,
}

export enum View {
  Settings,
  Maker,
  Player,
  Help,
  AILog,
}

export enum Theme {
  Light = 'light',
  Dark = 'dark',
  System = 'system',
}

export interface Position {
  x: number;
  y: number;
}

export enum AIProvider {
  Community = 'community',
  BYOLLM = 'byollm', // Bring Your Own LLM
}

export interface BYOLLMSettings {
  providerName: string;
  apiKey: string;
  baseURL: string;
  modelName: string;
}

export interface AIProviderSettings {
  provider: AIProvider;
  communityModel?: string;
  byollm?: BYOLLMSettings;
}

export enum AILogType {
  Info = 'info',
  Error = 'error',
  Request = 'request',
  Response = 'response',
  Warning = 'warning',
}

export enum AILogStatus {
  Pending = 'pending',
  Success = 'success',
  Error = 'error',
  InProgress = 'in_progress',
}

export enum AILogState {
  Idle = 'idle',
  Processing = 'processing',
  Completed = 'completed',
}

export interface AILogEntry {
  id: string;
  timestamp: Date;
  type: AILogType;
  status: AILogStatus;
  message: string;
  details?: string;
  metadata?: Record<string, any>;
}