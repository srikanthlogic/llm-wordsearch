import React from 'react';

interface LanguageSelectorProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    id?: string;
}

export const LANGUAGES: Record<string, string> = {
    'en': 'English',
    'es': 'Español (Spanish)',
    'fr': 'Français (French)',
    'de': 'Deutsch (German)',
    'hi': 'हिन्दी (Hindi)',
    'bn': 'বাংলা (Bengali)',
    'ta': 'தமிழ் (Tamil)',
};

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ value, onChange, label, id = 'language-selector' }) => {

    return (
        <div>
            {label && <label htmlFor={id} className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2">{label}</label>}
            <select
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
                {Object.entries(LANGUAGES).map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                ))}
            </select>
        </div>
    );
};

export default LanguageSelector;