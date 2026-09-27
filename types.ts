
export interface Word {
  word: string;
  hint: string;
  /** v2 reposition spec §5: corpus-sourced words carry the full contextual
   *  entry — how the meaning shifts by setting, and a usage fragment. */
  context?: string;
  usage?: string;
}

export interface PlacedWord {
  text: string;
  hint: string;
  /** Corpus-sourced entries carry the contextual payload (#104). */
  context?: string;
  usage?: string;
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
  Author,
  Vocab,
  Trophies,
  Owner,
  Help,
  AILog,
  Privacy,
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
  /** Route this request through the server-side LLM proxy instead of
   *  calling the provider directly. Required (and set automatically) for
   *  the shared community provider so its API key stays server-side. */
  useProxy?: boolean;
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

export enum InstanceMode {
  Author = 'author',
  Serve = 'serve',
}

export interface DomainLink {
  label: string;
  url: string;
}

export interface InstanceLevels {
  perDomain: number;
  wordsPerLevel: number;
}

export interface WordKeyConfig {
  mode: InstanceMode;
  title: string;
  owner: string;
  blurb: string;
  locale: string;
  links: DomainLink[];
  levels: InstanceLevels;
  progression: { sequentialLevels: boolean };
}

export interface CorpusEntry {
  term: string;
  gloss: string;
  context: string;
  usage: string;
  related: string[];
}

export interface CorpusDomain {
  domain: string;
  title: string;
  blurb: string;
  locale: string;
  provenance?: 'sample' | 'owner-authored';
  entries: CorpusEntry[];
}

export interface CorpusValidation {
  data: CorpusDomain | null;
  errors: string[];
  warnings: string[];
}

export interface DomainProgress {
  unlockedLevel: number;
  completedLevels: number[];
  bestTimeSeconds: Record<number, number>;
}

export interface BadgeDef {
  id: string;
  icon: string;
  titleKey: string;
  descriptionKey: string;
}

export interface BadgeState {
  earned: Record<string, number>;
  counters: { wordsFound: number; lostLevels: number; localesPlayed: string[]; domainsMastered: string[] };
  streak: { lastPlayedDate?: string; current: number; best: number };
}

export interface GameBadgeEvent {
  domainSlug?: string;
  level: number;
  isLastLevel: boolean;
  wonLevel: boolean;
  lostLevel: boolean;
  secondsLeft: number;
  timeLimitSeconds: number;
  wrongSelections: number;
  wordsFoundInLevel: number;
  locale: string;
  /** Injectable for tests; real callers omit it (defaults to now). */
  playedDate?: string;
}