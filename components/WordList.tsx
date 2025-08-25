
import React, { useState } from 'react';
import type { PlacedWord } from '../types';
import { useI18n } from '../hooks/useI18n';

interface WordListProps {
  words: PlacedWord[];
}

const WordList: React.FC<WordListProps> = ({ words }) => {
  const [showWords, setShowWords] = useState(false);
  const { t } = useI18n();

  return (
    <div className="flex-grow flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          {t('wordlist.title')}
        </h3>
        <div className="flex items-center">
            <span className="text-sm mr-2 text-slate-600 dark:text-slate-400">{t('wordlist.toggle')}</span>
            <button 
              onClick={() => setShowWords(!showWords)} 
              className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none ${showWords ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-600'}`}
              aria-pressed={showWords}
              aria-label={t('wordlist.toggleAriaLabel')}
            >
                <span aria-hidden="true" className={`inline-block h-5 w-5 rounded-full bg-white shadow-lg transform ring-0 transition ease-in-out duration-200 ${showWords ? 'translate-x-5' : 'translate-x-0'}`}></span>
            </button>
        </div>
      </div>
      
      <ul className="space-y-3 overflow-y-auto pr-2 -mr-2">
        {words.map((word, index) => (
          <li key={word.text} className="flex items-start gap-3">
            <div 
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold text-white mt-0.5"
              style={{ backgroundColor: word.color }}
            >
              {index + 1}
            </div>
            <div className="flex-grow">
              <p className={`transition-colors duration-300 text-slate-700 dark:text-slate-300 ${word.found ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                {word.hint}
              </p>
              {showWords && (
                <p className={`font-semibold uppercase tracking-wider transition-colors duration-300 ${word.found ? 'line-through text-opacity-60' : ''}`} style={{color: word.color}}>
                  {word.text}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WordList;
