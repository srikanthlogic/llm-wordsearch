
import React from 'react';
import type { LucideProps } from 'lucide-react';
import {
  Settings,
  RefreshCw,
  Eye,
  Download,
  Trash2,
  Share2,
  ArrowLeft,
  Wand2,
  Swords,
  HelpCircle,
  ChevronsLeft,
  Info,
  X,
  Timer,
  ListChecks,
  Play,
  Sun,
  Moon,
  Monitor,
  KeyRound,
  Server,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';

// Default size (24px) icons - direct re-export from lucide-react
export const SettingsIcon = Settings;
export const RefreshCwIcon = RefreshCw;
export const EyeIcon = Eye;
export const DownloadIcon = Download;
export const ArrowLeftIcon = ArrowLeft;
export const Wand2Icon = Wand2;
export const SwordsIcon = Swords;
export const HelpCircleIcon = HelpCircle;
export const ChevronsLeftIcon = ChevronsLeft;
export const InfoIcon = Info;
export const XIcon = X;
export const TimerIcon = Timer;
export const ListChecksIcon = ListChecks;
export const SunIcon = Sun;
export const MoonIcon = Moon;
export const MonitorIcon = Monitor;
export const KeyRoundIcon = KeyRound;
export const ServerIcon = Server;
export const Loader2Icon = Loader2;
export const CheckCircle2Icon = CheckCircle2;
export const XCircleIcon = XCircle;
export const ExternalLinkIcon = ExternalLink;

// Icons that were originally 16px are wrapped to set a default size for layout consistency.
export const TrashIcon: React.FC<LucideProps> = (props) => <Trash2 size={16} {...props} />;
export const ShareIcon: React.FC<LucideProps> = (props) => <Share2 size={16} {...props} />;
export const PlayIcon: React.FC<LucideProps> = (props) => <Play size={16} {...props} />;
