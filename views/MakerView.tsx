
import lz from 'lz-string';
import React, { useState, useCallback } from 'react';

import { useFeedback } from '../components/Feedback';
import { ArrowLeftIcon } from '../components/Icons';
import LanguageSelector from '../components/LanguageSelector';
import { useI18n } from '../hooks/useI18n';
import { generateGameLevels } from '../services/geminiService';
import type { GameDefinition, GameLevel, AIProviderSettings, AILogEntry, Word } from '../types';
import { AILogType, AILogStatus } from '../types';


interface GameSettings {
  theme: string;
  gridSize: number;
  wordCount: number;
  levelCount: number;
  timePerLevel: number;
  language: string;
}

interface MakerViewProps {
    onGameCreated: (game: GameDefinition) => void;
    setLogs: React.Dispatch<React.SetStateAction<AILogEntry[]>>;
    aiSettings: AIProviderSettings;
    /** #65: opens the AI Log view so a failed generation can be diagnosed. */
    onOpenAiLogs?: () => void;
}

const MakerView: React.FC<MakerViewProps> = ({ onGameCreated, setLogs, aiSettings, onOpenAiLogs }) => {
    const { language: uiLanguage, t } = useI18n();
    const { toast } = useFeedback();
    const [status, setStatus] = useState<'form' | 'loading' | 'result'>('form');
    const [gameDefinition, setGameDefinition] = useState<GameDefinition | null>(null);
    // #65: last generation failure, kept so the AI Log link persists after
    // the error toast disappears (the toast alone discarded the reason).
    const [lastError, setLastError] = useState<string | null>(null);
    const [settings, setSettings] = useState<GameSettings>({
        theme: 'Space Exploration',
        gridSize: 15,
        wordCount: 15,
        levelCount: 1,
        timePerLevel: 600,
        language: uiLanguage,
    });
    const [shareCopied, setShareCopied] = useState(false);

    const handleGenerateGame = useCallback(async (newSettings: GameSettings) => {
        setStatus('loading');
        setGameDefinition(null);
        setLogs([]);
        setLastError(null);

        const log = (entry: AILogEntry) => setLogs(prev => [...prev, entry]);

        try {
            // Single batched request for all levels - avoids chained requests
            // that risk proxy rate limits (429) mid-generation (#26).
            log({
              id: 'level-batch',
              timestamp: new Date(),
              type: AILogType.Info,
              status: AILogStatus.InProgress,
              message: `--- Generating ${newSettings.levelCount} level(s) in one AI request ---`,
            });
            let allGeneratedWords: Word[][] = (
                await generateGameLevels({
                    theme: newSettings.theme,
                    wordCount: newSettings.wordCount,
                    levelCount: newSettings.levelCount,
                    language: newSettings.language,
                    onLog: log,
                    aiSettings,
                })
            ).filter(levelWords => levelWords.length > 0)
             .slice(0, newSettings.levelCount);

            if (allGeneratedWords.length < newSettings.levelCount) {
                const missing = newSettings.levelCount - allGeneratedWords.length;
                log({
                  id: 'level-topup',
                  timestamp: new Date(),
                  type: AILogType.Warning,
                  status: AILogStatus.InProgress,
                  message: `Batched generation returned ${allGeneratedWords.length}/${newSettings.levelCount} levels. Falling back to ${missing} sequential request(s).`,
                });
                for (let i = 0; i < missing; i++) {
                    const topUp = await generateGameLevels({
                        theme: newSettings.theme,
                        wordCount: newSettings.wordCount,
                        levelCount: 1,
                        language: newSettings.language,
                        onLog: log,
                        aiSettings,
                    });
                    if (topUp.length === 0 || topUp[0].length === 0) {
                        throw new Error(`AI failed to generate words for level ${allGeneratedWords.length + 1}.`);
                    }
                    allGeneratedWords.push(topUp[0]);
                }
            }

            if (allGeneratedWords.length === 0) throw new Error("AI failed to generate any words. Check the AI Log in Settings for details.");

            const levels: GameLevel[] = allGeneratedWords.map((wordList, index) => ({
                level: index + 1,
                gridSize: newSettings.gridSize,
                timeLimitSeconds: newSettings.timePerLevel,
                words: wordList,
            }));

            const newGameDefinition: GameDefinition = {
                id: new Date().toISOString(),
                theme: newSettings.theme,
                language: newSettings.language,
                levels,
            };

            onGameCreated(newGameDefinition);
            setGameDefinition(newGameDefinition);
            setStatus('result');

        } catch (error) {
            console.error("Failed to generate game:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setLastError(errorMessage);
            toast(`${t('maker.error.generationFailed')} ${errorMessage}`, 'error');
            setStatus('form');
        }
    }, [onGameCreated, setLogs, aiSettings, t, toast]);

    const handleNewGame = () => {
        setGameDefinition(null);
        setLogs([]);
        setStatus('form');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (settings.theme.trim()) {
            handleGenerateGame(settings);
        }
    };

    const handleInputChange = (field: keyof GameSettings, value: string | number) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleNumericInputChange = (field: keyof GameSettings, value: string) => {
        handleInputChange(field, parseInt(value, 10) || 0)
    };

    if (status === 'loading') {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center animate-fade-in">
                <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-accent/30"></div>
                    <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-accent-deep animate-spin"></div>
                </div>
                <p className="mt-6 text-lg font-semibold text-ink font-display">{t('maker.generatingText')}</p>
                <p className="text-sm text-ink-soft mt-1">{t('maker.generatingSubtext')}</p>
            </div>
        );
    }

    if (status === 'result' && gameDefinition) {
        const downloadGameDefinition = () => {
            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
              JSON.stringify(gameDefinition, null, 2)
            )}`;
            const link = document.createElement("a");
            link.href = jsonString;
            link.download = `${gameDefinition.theme.replace(/\s+/g, '_')}_word_search.json`;
            link.click();
        };

        const handleShare = (): Promise<{ copied: boolean; error?: any }> => {
            const jsonString = JSON.stringify(gameDefinition);
            const compressed = lz.compressToEncodedURIComponent(jsonString);
            const url = `${window.location.origin}${window.location.pathname}#game=${compressed}`;

            return navigator.clipboard.writeText(url).then(() => {
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 2000);
                return { copied: true };
            }).catch(err => {
                console.error('Failed to copy share link: ', err);
                return { copied: false, error: err };
            });
        };

        return (
            <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 animate-fade-in-up">
                <header className="w-full text-center relative">
                    <button
                        onClick={handleNewGame}
                        className="absolute left-0 top-1/2 -translate-y-1/2 p-3 text-ink-soft hover:text-ink hover:bg-ink/5 rounded-xl transition-all min-h-[44px]"
                        title={t('maker.result.backToSetupAria')}
                    >
                        <ArrowLeftIcon />
                    </button>
                    <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-ink">
                        {t('maker.result.title')}
                    </h1>
                    <p className="text-ink-soft mt-2">{t('maker.result.subtitle')}</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card-elevated p-8 flex flex-col items-center justify-center text-center animate-slide-in-left">
                        <div className="w-16 h-16 rounded-xl bg-accent border border-ink/20 flex items-center justify-center mb-6">
                            <svg className="w-8 h-8 text-ink-onAccent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink mb-2">&ldquo;{gameDefinition.theme}&rdquo;</h2>
                        <div className="flex items-center gap-3 mt-4">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-accent/40 text-ink font-semibold border border-ink/15">
                                {t('maker.result.levels', { count: gameDefinition.levels.length })}
                            </span>
                            <span className="text-ink-soft font-medium">
                                {gameDefinition.levels[0].words.length} {t('maker.result.words', { count: gameDefinition.levels[0].words.length })}
                            </span>
                        </div>
                    </div>

                    <aside className="w-full animate-slide-in-right">
                        <div className="card-elevated p-6 h-full flex flex-col">
                            <h3 className="font-display text-lg font-bold text-ink mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-ink-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                                {t('maker.result.nextSteps')}
                            </h3>
                            <div className="space-y-3 flex-1">
                                <div className="p-4 rounded-xl bg-accent/25 border border-ink/10">
                                    <p className="text-sm text-ink font-medium">
                                        {t('maker.result.playInstruction')}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={handleShare}
                                        className="relative flex items-center justify-center gap-2 p-4 btn-secondary rounded-xl font-semibold min-h-[56px]"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                        </svg>
                                        {t('maker.result.shareButton')}
                                        {shareCopied && (
                                            <span className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium bg-ink text-paper px-3 py-1.5 rounded-lg shadow-xl animate-scale-in">
                                                {t('player.available.copied')}
                                            </span>
                                        )}
                                    </button>
                                    <button
                                        onClick={downloadGameDefinition}
                                        className="flex items-center justify-center gap-2 p-4 btn-secondary rounded-xl font-semibold min-h-[56px]"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        {t('maker.result.downloadButton')}
                                    </button>
                                </div>
                                <button
                                    onClick={handleNewGame}
                                    className="w-full flex items-center justify-center gap-2 p-4 btn-primary rounded-xl font-bold font-display min-h-[56px]"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    {t('maker.result.newGameButton')}
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto animate-fade-in">
            <div className="card-elevated p-6 sm:p-8 md:p-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-accent border border-ink/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-ink-onAccent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">
                            {t('maker.title')}
                        </h2>
                        <p className="text-sm text-ink-soft mt-0.5">{t('maker.subtitle')}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
                        <label htmlFor="theme" className="block text-ink text-sm font-semibold mb-2.5">
                            {t('maker.themeLabel')}
                        </label>
                        <input
                            id="theme"
                            type="text"
                            value={settings.theme}
                            onChange={(e) => handleInputChange('theme', e.target.value)}
                            className="input-base w-full px-4 py-3 text-ink min-h-[48px]"
                            placeholder={t('maker.themePlaceholder')}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-fade-in" style={{ animationDelay: '100ms' }}>
                        <div>
                            <label htmlFor="levelCount" className="block text-ink text-sm font-semibold mb-2.5">
                                {t('maker.levelsLabel')}
                            </label>
                            <input
                                id="levelCount" type="number" min="1" max="10"
                                value={settings.levelCount}
                                onChange={(e) => handleNumericInputChange('levelCount', e.target.value)}
                                className="input-base w-full px-4 py-3 text-ink min-h-[48px]"
                            />
                        </div>
                        <div>
                            <label htmlFor="wordCount" className="block text-ink text-sm font-semibold mb-2.5">
                                {t('maker.wordsLabel')}
                            </label>
                            <input
                                id="wordCount" type="number" min="5" max="30"
                                value={settings.wordCount}
                                onChange={(e) => handleNumericInputChange('wordCount', e.target.value)}
                                className="input-base w-full px-4 py-3 text-ink min-h-[48px]"
                            />
                        </div>
                    </div>

                    <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
                        <LanguageSelector
                            label={t('maker.languageLabel')}
                            value={settings.language}
                            onChange={(lang) => handleInputChange('language', lang)}
                        />
                    </div>

                    <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
                        <label htmlFor="timePerLevel" className="block text-ink text-sm font-semibold mb-2.5">
                            {t('maker.timeLabel')}
                        </label>
                        <input
                            id="timePerLevel" type="number" min="30" max="1800" step="30"
                            value={settings.timePerLevel}
                            onChange={(e) => handleNumericInputChange('timePerLevel', e.target.value)}
                            className="input-base w-full px-4 py-3 text-ink min-h-[48px]"
                        />
                    </div>

            <div className="animate-fade-in" style={{ animationDelay: '250ms' }}>
              <div className="flex items-center justify-between mb-2.5">
                <label htmlFor="gridSizeInput" className="block text-ink text-sm font-semibold">
                  {t('maker.gridSizeLabel')}
                </label>
                <span className="inline-flex items-center px-3 py-1 rounded-lg bg-accent/40 text-ink font-display font-bold text-sm border border-ink/15">
                  {settings.gridSize}×{settings.gridSize}
                </span>
              </div>
              <div className="relative h-2 bg-ink/15 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-accent rounded-full transition-all duration-150"
                  style={{ width: `${((settings.gridSize - 10) / 10) * 100}%` }}
                />
                <input
                  id="gridSizeInput"
                  type="range"
                  min="10"
                  max="20"
                  value={settings.gridSize}
                  onChange={(e) => handleNumericInputChange('gridSize', e.target.value)}
                  aria-label={t('maker.gridSize')}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
                        <div className="flex justify-between text-xs text-ink-faint mt-2">
                            <span>10×10</span>
                            <span>15×15</span>
                            <span>20×20</span>
                        </div>
                    </div>

                    <div className="pt-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
                        <button
                            type="submit"
                            className="w-full btn-primary font-bold font-display py-4 px-6 rounded-xl min-h-[56px]"
                            disabled={!settings.theme.trim()}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                {t('maker.generateButton')}
                            </span>
                        </button>
                        {lastError && onOpenAiLogs && (
                            <button
                                type="button"
                                onClick={onOpenAiLogs}
                                className="mt-3 flex items-center justify-center gap-2 w-full px-4 py-3 bg-error/10 text-error hover:bg-error/20 font-semibold rounded-xl transition-colors min-h-[44px]"
                            >
                                {t('maker.error.openAiLogs')}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MakerView;
