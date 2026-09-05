
import React, { useState } from 'react';

import { useI18n } from '../hooks/useI18n';
import type { PlacedWord } from '../types';

interface WordListProps {
  words: PlacedWord[];
}

const WordList: React.FC<WordListProps> = ({ words }) => {
  const [showWords, setShowWords] = useState(false);
  const { t } = useI18n();

  return (
    <div className="flex-grow flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-2 sm:mb-4">
        <h3 className="text-lg sm:text-xl font-bold text-ink">
          {t('wordlist.title')}
        </h3>
        <div className="flex items-center">
            <span className="text-sm mr-1 sm:mr-2 text-ink-soft">{t('wordlist.toggle')}</span>
            <button
              onClick={() => setShowWords(!showWords)}
              className={`relative inline-flex flex-shrink-0 h-9 sm:h-11 w-16 sm:w-20 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none ${showWords ? 'bg-accent border-ink/25' : 'bg-ink/25'}`}
              aria-pressed={showWords}
              aria-label={t('wordlist.toggleAriaLabel')}
            >
                <span aria-hidden="true" className={`inline-block h-7 sm:h-9 w-7 sm:w-9 rounded-full bg-sheet shadow-lg transform ring-0 transition ease-in-out duration-200 ${showWords ? 'translate-x-9 sm:translate-x-11' : 'translate-x-0'}`}></span>
            </button>
        </div>
      </div>

      <ul className="space-y-2 sm:space-y-3 overflow-y-auto pr-1 sm:pr-2 -mr-2">
        {words.map((word, index) => (
          <li key={word.text} className="flex items-start gap-2 sm:gap-3">
            <div
              className="flex-shrink-0 w-5 sm:w-6 h-5 sm:h-6 rounded-full flex items-center justify-center text-sm font-bold text-white mt-0 sm:mt-0.5"
              style={{ backgroundColor: word.color }}
            >
              {index + 1}
            </div>
            <div className="flex-grow">
              <p className={`transition-colors duration-300 text-ink ${word.found ? 'line-through text-ink-faint' : ''}`}>
                {word.hint}
              </p>
              {showWords && (
                <p className={`font-semiboldr transition-colors duration-300 ${word.found ? 'line-through text-opacity-60' : ''}`} style={{color: word.color}}>
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
