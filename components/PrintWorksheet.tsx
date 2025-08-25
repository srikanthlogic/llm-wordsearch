import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { GameDefinition, Grid, PlacedWord } from '../types';
import { generatePuzzle } from '../utils/wordSearchGenerator';
import { WORD_COLORS } from '../constants';
import { ArrowLeftIcon, DownloadIcon, Loader2Icon } from './Icons';
import { useI18n } from '../hooks/useI18n';

interface PuzzleData {
    grid: Grid;
    words: PlacedWord[];
}

const COMPLEX_SCRIPT_LANGS = ['ta', 'hi', 'bn'];

const PrintGrid: React.FC<{ grid: Grid; placedWords?: PlacedWord[]; showAnswers: boolean; language: string; }> = ({ grid, placedWords = [], showAnswers, language }) => {
    const positionToWordMap = new Map<string, PlacedWord>();
    if (showAnswers) {
        placedWords.forEach(word => {
            word.positions.forEach(pos => {
                positionToWordMap.set(`${pos.y}-${pos.x}`, word);
            });
        });
    }

    const isComplex = COMPLEX_SCRIPT_LANGS.includes(language);
    const cellClasses = `flex items-center justify-center text-center font-mono uppercase leading-none ${isComplex ? 'text-base' : 'text-lg'}`;

    return (
        <div className="border border-black aspect-square w-full">
            <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${grid.length}, minmax(0, 1fr))` }}>
                {grid.map((row, y) => row.map((cell, x) => {
                    const wordData = positionToWordMap.get(`${y}-${x}`);
                    const style: React.CSSProperties = {
                        backgroundColor: showAnswers && wordData ? wordData.color : 'transparent',
                        color: showAnswers && wordData ? 'white' : 'black',
                        outline: '1px solid #ccc',
                    };
                    return (
                        <div key={`${y}-${x}`} className={cellClasses} style={style}>
                            {cell.letter}
                        </div>
                    );
                }))}
            </div>
        </div>
    );
};


const PrintWorksheet: React.FC<{ game: GameDefinition, onBack: () => void }> = ({ game, onBack }) => {
    const { t } = useI18n();
    const [puzzles, setPuzzles] = useState<PuzzleData[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const generatedPuzzles = game.levels.map(level => {
            const puzzle = generatePuzzle(level.words.map(w => w.word), level.gridSize, game.language);
            const placedWordsWithData = puzzle.placedWords.map((pw, index) => {
                const originalWord = level.words.find(w => w.word.toUpperCase() === pw.text.toUpperCase());
                return {
                    ...pw,
                    hint: originalWord?.hint || '',
                    found: true,
                    color: WORD_COLORS[index % WORD_COLORS.length],
                };
            }).sort((a,b) => a.text.localeCompare(b.text)); // Sort words alphabetically for the list
            return { grid: puzzle.grid, words: placedWordsWithData };
        });
        setPuzzles(generatedPuzzles);
    }, [game]);
    
    const handleDownload = async () => {
        setIsGenerating(true);
        const worksheetPages = document.querySelectorAll<HTMLElement>('.printable-page');
        if (worksheetPages.length === 0) {
            console.error("No printable pages found to generate PDF.");
            setIsGenerating(false);
            return;
        }

        try {
            const pdf = new jsPDF({ orientation: 'p', unit: 'in', format: 'letter' });
            const canvasOptions = { scale: 2, useCORS: true, backgroundColor: '#ffffff' };
            const pageInfo = pdf.internal.pageSize;
            const pdfWidth = pageInfo.getWidth();
            const pdfHeight = pageInfo.getHeight();

            for (let i = 0; i < worksheetPages.length; i++) {
                const canvas = await html2canvas(worksheetPages[i], canvasOptions);
                const imgData = canvas.toDataURL('image/png', 1.0);
                
                if (i > 0) {
                    pdf.addPage();
                }
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            }
            pdf.save(`${game.theme.replace(/\s+/g, '_')}_worksheet.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert(t('worksheet.error.pdf'));
        } finally {
            setIsGenerating(false);
        }
    };

    const portalRoot = document.getElementById('portal-root');
    if (!portalRoot) return null;

    if (puzzles.length === 0) {
        return ReactDOM.createPortal(
            <div className="fixed inset-0 bg-white dark:bg-slate-900 flex flex-col items-center justify-center z-50">
                <Loader2Icon className="w-12 h-12 animate-spin text-purple-500" />
                <p className="mt-4 text-slate-700 dark:text-slate-300">{t('worksheet.generating')}</p>
            </div>,
            portalRoot
        );
    }

    return ReactDOM.createPortal(
        <div className="print-container bg-slate-200 dark:bg-slate-900 text-black">
            <header className="no-print fixed top-0 left-0 right-0 bg-white dark:bg-slate-800 shadow-md p-4 flex justify-between items-center z-50">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">{game.theme}</h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{t('worksheet.preview')}</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md text-slate-800 dark:text-slate-200">
                        <ArrowLeftIcon /> {t('worksheet.back')}
                    </button>
                    <button onClick={handleDownload} disabled={isGenerating} className="flex items-center justify-center gap-2 px-4 py-2 w-40 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-semibold disabled:bg-purple-400 dark:disabled:bg-purple-800 disabled:cursor-wait transition-colors">
                        {isGenerating ? (
                            <>
                                <Loader2Icon className="w-5 h-5 animate-spin" />
                                <span>{t('worksheet.generatingPDF')}</span>
                            </>
                        ) : (
                            <>
                                <DownloadIcon className="w-5 h-5" />
                                <span>{t('worksheet.downloadPDF')}</span>
                            </>
                        )}
                    </button>
                </div>
            </header>
            <main className="pt-24">
                {puzzles.map((puzzle, index) => {
                    const level = game.levels[index];
                    return (
                        <React.Fragment key={level.level}>
                            {/* Worksheet */}
                            <div className="printable-page p-8 w-[8.5in] h-[11in] mx-auto bg-white shadow-lg my-4 flex flex-col">
                                <h2 className="text-3xl font-bold text-center mb-1">{game.theme}</h2>
                                <h3 className="text-xl text-center text-gray-600 mb-6">{t('worksheet.level')} {level.level}</h3>
                                <div className="flex flex-col items-center">
                                    <div className="w-full max-w-lg">
                                        <PrintGrid grid={puzzle.grid} showAnswers={false} language={game.language} />
                                    </div>
                                    <div className="w-full mt-8">
                                        <h4 className="text-2xl font-semibold mb-4 border-b-2 border-black pb-2">{t('worksheet.clues')}</h4>
                                        <ol className="text-sm list-decimal list-inside columns-3 gap-x-8 gap-y-2">
                                            {puzzle.words.map(w => <li key={w.text} className="break-inside-avoid">{w.hint}</li>)}
                                        </ol>
                                    </div>
                                </div>
                            </div>
                            {/* Answer Key */}
                            <div className="printable-page p-8 w-[8.5in] h-[11in] mx-auto bg-white shadow-lg my-4 flex flex-col">
                                <h2 className="text-3xl font-bold text-center mb-1">{game.theme} - <span className="text-red-600">{t('worksheet.answerKey')}</span></h2>
                                <h3 className="text-xl text-center text-gray-600 mb-6">{t('worksheet.level')} {level.level}</h3>
                                <div className="flex flex-col items-center">
                                    <div className="w-full max-w-lg">
                                        <PrintGrid grid={puzzle.grid} placedWords={puzzle.words} showAnswers={true} language={game.language} />
                                    </div>
                                    <div className="w-full mt-8">
                                        <h4 className="text-2xl font-semibold mb-4 border-b-2 border-black pb-2">{t('worksheet.words')}</h4>
                                        <ul className="text-sm columns-3 gap-x-8 gap-y-2">
                                            {puzzle.words.map(w => <li key={w.text} className="break-inside-avoid font-mono uppercase">{w.text}</li>)}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
            </main>
        </div>,
        portalRoot
    );
};

export default PrintWorksheet;