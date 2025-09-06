
import React, { useState, useCallback } from 'react';
import type { GameDefinition, GameLevel, AIProviderSettings } from '../types';
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
    setLogs: React.Dispatch<React.SetStateAction<string[]>>;
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

        const log = (message: string) => setLogs(prev => [...prev, message]);

        try {
            const allGeneratedWords: Word[][] = [];
            for (let i = 0; i < newSettings.levelCount; i++) {
                log(`--- Generating Level ${i + 1} of ${newSettings.levelCount} ---`);
                const singleLevelWords = await generateGameLevels({
                    theme: newSettings.theme,
                    wordCount: newSettings.wordCount,
                    levelCount: 1, // Ask for one level at a time
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
            <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 dark:border-purple-400"></div>
                <p className="mt-4 text-slate-700 dark:text-slate-300">{t('maker.generatingText')}</p>
                <p className="text-sm text-slate-500">{t('maker.generatingSubtext')}</p>
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
            <div className="w-full max-w-4xl mx-auto flex flex-col gap-8">
                <header className="w-full text-center relative">
                    <button 
                        onClick={handleNewGame} 
                        className="absolute left-0 top-1/2 -translate-y-1/2 p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition"
                        title={t('maker.result.backToSetupAria')}
                    >
                        <ArrowLeftIcon />
                    </button>
                    <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600">
                        {t('maker.result.title')}
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">{t('maker.result.subtitle')}</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg flex flex-col items-center justify-center text-center p-8 shadow-2xl">
                        <h2 className="text-3xl font-bold text-purple-500 dark:text-purple-400 mb-2">"{gameDefinition.theme}"</h2>
                        <p className="text-xl text-slate-700 dark:text-slate-300 mb-1">
                            {gameDefinition.levels.length > 1 ? t('maker.result.levels_plural', { count: gameDefinition.levels.length }) : t('maker.result.levels_singular', { count: gameDefinition.levels.length })}
                        </p>
                        <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">{t('maker.result.words', { count: gameDefinition.levels[0].words.length })}</p>
                        <p className="text-slate-600 dark:text-slate-400">{t('maker.result.instructions')}</p>
                    </div>
                    
                    <aside className="w-full">
                        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg shadow-2xl h-full flex flex-col">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">{t('maker.result.nextSteps')}</h3>
                             <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                                <div className="grid grid-cols-1 gap-2 mt-4">
                                    <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-2">{t('maker.result.playInstruction')}</p>
                                    <div className="flex gap-2">
                                    <button 
                                        onClick={handleShare} 
                                        className="relative w-full bg-slate-500 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        {t('maker.result.shareButton')}
                                        {shareCopied && <span className="absolute -bottom-8 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2 py-1 rounded shadow-lg">{t('player.available.copied')}</span>}
                                    </button>
                                    <button 
                                        onClick={downloadGameDefinition} 
                                        className="w-full bg-slate-500 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        {t('maker.result.downloadButton')}
                                    </button>
                                    </div>
                                    <button 
                                    onClick={handleNewGame} 
                                    className="w-full bg-slate-500 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                                    >
                                    {t('maker.result.newGameButton')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        );
    }
    
    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg shadow-2xl p-8">
                <h2 className="text-3xl font-bold text-purple-500 dark:text-purple-400 mb-6">{t('maker.title')}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="theme" className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2">
                        {t('maker.themeLabel')}
                        </label>
                        <input
                        id="theme"
                        type="text"
                        value={settings.theme}
                        onChange={(e) => handleInputChange('theme', e.target.value)}
                        className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder={t('maker.themePlaceholder')}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                        <label htmlFor="levelCount" className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2">
                            {t('maker.levelsLabel')}
                        </label>
                        <input
                            id="levelCount" type="number" min="1" max="10"
                            value={settings.levelCount}
                            onChange={(e) => handleNumericInputChange('levelCount', e.target.value)}
                            className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        </div>
                        <div>
                        <label htmlFor="wordCount" className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2">
                            {t('maker.wordsLabel')}
                        </label>
                        <input
                            id="wordCount" type="number" min="5" max="30"
                            value={settings.wordCount}
                            onChange={(e) => handleNumericInputChange('wordCount', e.target.value)}
                            className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        </div>
                    </div>
                    
                     <LanguageSelector
                        label={t('maker.languageLabel')}
                        value={settings.language}
                        onChange={(lang) => handleInputChange('language', lang)}
                     />

                    <div>
                        <label htmlFor="timePerLevel" className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2">
                        {t('maker.timeLabel')}
                        </label>
                        <input
                        id="timePerLevel" type="number" min="30" max="1800" step="30"
                        value={settings.timePerLevel}
                        onChange={(e) => handleNumericInputChange('timePerLevel', e.target.value)}
                        className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="gridSize" className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2">
                        {t('maker.gridSizeLabel')}: <span className="font-mono text-purple-600 dark:text-purple-300">{settings.gridSize}x{settings.gridSize}</span>
                        </label>
                        <input
                        id="gridSize"
                        type="range"
                        min="10"
                        max="20"
                        value={settings.gridSize}
                        onChange={(e) => handleNumericInputChange('gridSize', e.target.value)}
                        className="w-full h-2 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                    </div>
                    
                    <div className="pt-4">
                        <button
                        type="submit"
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:scale-100 disabled:cursor-not-allowed"
                        disabled={!settings.theme.trim()}
                        >
                        {t('maker.generateButton')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MakerView;
