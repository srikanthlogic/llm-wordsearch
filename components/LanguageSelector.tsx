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
    const [isFocused, setIsFocused] = React.useState(false);

    return (
        <div className="animate-fade-in">
            {label && (
                <label htmlFor={id} className="block text-slate-700 dark:text-slate-200 text-sm font-semibold mb-2.5">
                    {label}
                </label>
            )}
            <div className="relative">
                <select
                    id={id}
                    value={value}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onChange={(e) => onChange(e.target.value)}
                    className={`input-base w-full px-4 py-3 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white appearance-none cursor-pointer transition-all duration-200 ${isFocused ? 'shadow-lg' : 'shadow-sm'}`}
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0.75rem center',
                        backgroundSize: '1.25rem',
                    }}
                >
                    {Object.entries(LANGUAGES).map(([code, name]) => (
                        <option key={code} value={code}>{name}</option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default LanguageSelector;
