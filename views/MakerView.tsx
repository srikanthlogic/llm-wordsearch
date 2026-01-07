
import React, { useState, useCallback } from 'react';
import type { GameDefinition, GameLevel, AIProviderSettings, AILogEntry, Word } from '../types';
import { AILogType, AILogStatus } from '../types';
import { generateGameLevels } from '../services/geminiService';
import lz from 'lz-string';
import { ArrowLeftIcon } from '../components/Icons';
import { useI18n } from '../hooks/useI18n';
import LanguageSelector from '../components/LanguageSelector';


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
}

const MakerView: React.FC<MakerViewProps> = ({ onGameCreated, setLogs, aiSettings }) => {
    const { language: uiLanguage, t } = useI18n();
    const [status, setStatus] = useState<'form' | 'loading' | 'result'>('form');
    const [gameDefinition, setGameDefinition] = useState<GameDefinition | null>(null);
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

        const log = (entry: AILogEntry) => setLogs(prev => [...prev, entry]);

        try {
            const allGeneratedWords: Word[][] = [];
            for (let i = 0; i < newSettings.levelCount; i++) {
                log({
                  id: `level-${i + 1}`,
                  timestamp: new Date(),
                  type: AILogType.Info,
                  status: AILogStatus.InProgress,
                  message: `--- Generating Level ${i + 1} of ${newSettings.levelCount} ---`,
                });
                const singleLevelWords = await generateGameLevels({
                    theme: newSettings.theme,
                    wordCount: newSettings.wordCount,
                    levelCount: 1,
                    language: newSettings.language,
                    onLog: log,
                    aiSettings,
                });

                if (singleLevelWords.length === 0 || singleLevelWords[0].length === 0) {
                    throw new Error(`AI failed to generate words for level ${i + 1}.`);
                }

                allGeneratedWords.push(singleLevelWords[0]);
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
            alert(`${t('maker.error.generationFailed')} ${errorMessage}`);
            setStatus('form');
        }
    }, [onGameCreated, setLogs, aiSettings, t]);

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
                    <div className="w-20 h-20 rounded-full border-4 border-purple-200 dark:border-purple-900/50"></div>
                    <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-purple-500 animate-spin"></div>
                </div>
                <p className="mt-6 text-lg font-semibold text-slate-700 dark:text-slate-300">{t('maker.generatingText')}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('maker.generatingSubtext')}</p>
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

        const getLevelsText = (levels: number) => {
            return levels === 1 ? `${levels} level` : `${levels} levels`;
        };

        return (
            <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 animate-fade-in-up">
                <header className="w-full text-center relative">
                    <button
                        onClick={handleNewGame}
                        className="absolute left-0 top-1/2 -translate-y-1/2 p-3 text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 active:bg-purple-100 dark:active:bg-purple-900/30 rounded-xl transition-all min-h-[44px]"
                        title={t('maker.result.backToSetupAria')}
                    >
                        <ArrowLeftIcon />
                    </button>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 dark:from-purple-400 dark:via-pink-400 dark:to-purple-400 bg-clip-text">
                        {t('maker.result.title')}
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">{t('maker.result.subtitle')}</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card-elevated rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-xl animate-slide-in-left">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6 shadow-lg">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">"{gameDefinition.theme}"</h2>
                        <div className="flex items-center gap-3 mt-4">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-semibold">
                                {getLevelsText(gameDefinition.levels.length)}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="text-slate-600 dark:text-slate-400 font-medium">
                                {gameDefinition.levels[0].words.length} {t('maker.result.words', { count: gameDefinition.levels[0].words.length })}
                            </span>
                        </div>
                    </div>

                    <aside className="w-full animate-slide-in-right">
                        <div className="card-elevated rounded-2xl p-6 shadow-xl h-full flex flex-col">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                                {t('maker.result.nextSteps')}
                            </h3>
                            <div className="space-y-3 flex-1">
                                <div className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
                                    <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                                        {t('maker.result.playInstruction')}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={handleShare}
                                        className="relative flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg min-h-[56px]"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                        </svg>
                                        {t('maker.result.shareButton')}
                                        {shareCopied && (
                                            <span className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 rounded-lg shadow-xl animate-scale-in">
                                                {t('player.available.copied')}
                                            </span>
                                        )}
                                    </button>
                                    <button
                                        onClick={downloadGameDefinition}
                                        className="flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg min-h-[56px]"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        {t('maker.result.downloadButton')}
                                    </button>
                                </div>
                                <button
                                    onClick={handleNewGame}
                                    className="w-full flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 min-h-[56px]"
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
            <div className="card-elevated rounded-2xl shadow-xl p-6 sm:p-8 md:p-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-400 dark:to-pink-400">
                            {t('maker.title')}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('maker.subtitle') || 'Create a custom word search puzzle'}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
                        <label htmlFor="theme" className="block text-slate-700 dark:text-slate-200 text-sm font-semibold mb-2.5">
                            {t('maker.themeLabel')}
                        </label>
                        <input
                            id="theme"
                            type="text"
                            value={settings.theme}
                            onChange={(e) => handleInputChange('theme', e.target.value)}
                            className="input-base w-full px-4 py-3 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white shadow-sm min-h-[48px]"
                            placeholder={t('maker.themePlaceholder')}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-fade-in" style={{ animationDelay: '100ms' }}>
                        <div>
                            <label htmlFor="levelCount" className="block text-slate-700 dark:text-slate-200 text-sm font-semibold mb-2.5">
                                {t('maker.levelsLabel')}
                            </label>
                            <input
                                id="levelCount" type="number" min="1" max="10"
                                value={settings.levelCount}
                                onChange={(e) => handleNumericInputChange('levelCount', e.target.value)}
                                className="input-base w-full px-4 py-3 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white shadow-sm min-h-[48px]"
                            />
                        </div>
                        <div>
                            <label htmlFor="wordCount" className="block text-slate-700 dark:text-slate-200 text-sm font-semibold mb-2.5">
                                {t('maker.wordsLabel')}
                            </label>
                            <input
                                id="wordCount" type="number" min="5" max="30"
                                value={settings.wordCount}
                                onChange={(e) => handleNumericInputChange('wordCount', e.target.value)}
                                className="input-base w-full px-4 py-3 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white shadow-sm min-h-[48px]"
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
                        <label htmlFor="timePerLevel" className="block text-slate-700 dark:text-slate-200 text-sm font-semibold mb-2.5">
                            {t('maker.timeLabel')}
                        </label>
                        <input
                            id="timePerLevel" type="number" min="30" max="1800" step="30"
                            value={settings.timePerLevel}
                            onChange={(e) => handleNumericInputChange('timePerLevel', e.target.value)}
                            className="input-base w-full px-4 py-3 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white shadow-sm min-h-[48px]"
                        />
                    </div>

                    <div className="animate-fade-in" style={{ animationDelay: '250ms' }}>
                        <label htmlFor="gridSize" className="block text-slate-700 dark:text-slate-200 text-sm font-semibold mb-2.5">
                            <div className="flex items-center justify-between">
                                <span>{t('maker.gridSizeLabel')}</span>
                                <span className="inline-flex items-center px-3 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-mono font-bold text-sm">
                                    {settings.gridSize}×{settings.gridSize}
                                </span>
                            </div>
                        </label>
                        <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-150"
                                style={{ width: `${((settings.gridSize - 10) / 10) * 100}%` }}
                            />
                            <input
                                id="gridSize"
                                type="range"
                                min="10"
                                max="20"
                                value={settings.gridSize}
                                onChange={(e) => handleNumericInputChange('gridSize', e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                style={{ opacity: 0 }}
                            />
                            <input
                                type="range"
                                min="10"
                                max="20"
                                value={settings.gridSize}
                                onChange={(e) => handleNumericInputChange('gridSize', e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>
                        <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mt-2">
                            <span>10×10</span>
                            <span>15×15</span>
                            <span>20×20</span>
                        </div>
                    </div>

                    <div className="pt-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
                        <button
                            type="submit"
                            className="w-full btn-primary text-white font-bold py-4 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-md min-h-[56px]"
                            disabled={!settings.theme.trim()}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                {t('maker.generateButton')}
                            </span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MakerView;
