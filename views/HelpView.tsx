
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useI18n } from '../hooks/useI18n';

// This list acts as a manifest. Adding a key here will make it appear in the docs.
const DOC_PAGES_CONFIG = [
    { key: 'introduction' },
    { key: 'maker' },
    { key: 'player' },
    { key: 'settings' },
];

interface TocEntry {
    level: number;
    text: string;
    id: string;
}

interface ParsedContent {
    html: string;
    toc: TocEntry[];
}

// Function to create a slug for heading IDs
const createSlug = (text: string) => {
    return text
        .toLowerCase()
        .replace(/<[^>]+>/g, '') // remove html tags
        .replace(/[^a-z0-9\s-]/g, '') // remove non-alphanumeric characters
        .trim()
        .replace(/\s+/g, '-') // replace spaces with hyphens
        .replace(/-+/g, '-'); // replace multiple hyphens with a single one
};


const HelpView: React.FC = () => {
    const { t, language } = useI18n();
    const [activePageKey, setActivePageKey] = useState<string>(DOC_PAGES_CONFIG[0]?.key || '');
    const [pagesContent, setPagesContent] = useState<Map<string, ParsedContent>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [activeSectionId, setActiveSectionId] = useState<string>('');
    const observer = useRef<IntersectionObserver | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Fetch and parse markdown content when the active page or language changes
    useEffect(() => {
        const pageConfig = DOC_PAGES_CONFIG.find(p => p.key === activePageKey);
        if (!pageConfig) return;

        const docId = `${activePageKey}-${language}`;
        if (pagesContent.has(docId)) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const fetchDoc = async () => {
            const path = `/docs/${language}/${pageConfig.key}.md`;
            const fallbackPath = `/docs/en/${pageConfig.key}.md`;
            try {
                let response = await fetch(path);
                if (!response.ok) {
                    console.warn(`Documentation for language '${language}' not found at ${path}. Falling back to English.`);
                    response = await fetch(fallbackPath);
                    if (!response.ok) throw new Error(`Failed to fetch ${fallbackPath}`);
                }

                const markdown = await response.text();

                const toc: TocEntry[] = [];
                const renderer = new marked.Renderer();

                (renderer as any).heading = (text: string, level: number) => {
                    const id = createSlug(text);
                    toc.push({ level, text, id });
                    const mappedLevel = level + 1; // H1 -> H2, etc.
                    const sizeClasses = { 2: 'text-3xl', 3: 'text-2xl', 4: 'text-xl' }[mappedLevel] || 'text-lg';
                    return `<h${mappedLevel} id="${id}" class="help-section scroll-mt-16 ${sizeClasses} font-bold text-slate-900 dark:text-slate-100 mb-4 mt-8 first:mt-0">${text}</h${mappedLevel}>`;
                };

                renderer.paragraph = (text) => `<p class="mb-4 text-slate-700 dark:text-slate-300 leading-relaxed">${text}</p>`;
                renderer.list = (body) => `<ul class="list-disc list-inside space-y-2 pl-4 mb-4 text-slate-700 dark:text-slate-300">${body}</ul>`;
                renderer.strong = (text) => `<strong class="text-slate-900 dark:text-slate-100 font-semibold">${text}</strong>`;

                (renderer as any).link = (href: string, title: string | null, text: string) => {
                    return `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer" class="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline font-medium">${text}</a>`;
                };

                marked.use({ renderer });

                const rawHtml = await marked.parse(markdown);
                const sanitizedHtml = DOMPurify.sanitize(rawHtml);

                setPagesContent(prev => new Map(prev).set(docId, { html: sanitizedHtml, toc }));
            } catch (error) {
                console.error("Error loading documentation:", error);
                const errorHtml = DOMPurify.sanitize(`<div class="text-red-500"><h3>Error</h3><p>Could not load documentation file.</p></div>`);
                setPagesContent(prev => new Map(prev).set(docId, { html: errorHtml, toc: [] }));
            } finally {
                setIsLoading(false);
            }
        };

        fetchDoc();

    }, [activePageKey, pagesContent, language]);

     // Setup intersection observer for section highlighting
    useEffect(() => {
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver((entries) => {
            const intersectingEntry = entries.find(entry => entry.isIntersecting);
            if (intersectingEntry) {
                 setActiveSectionId(intersectingEntry.target.id);
            }
        }, { rootMargin: '-20% 0px -75% 0px', threshold: 0 });

        const contentEl = contentRef.current;
        if (contentEl) {
            const sections = contentEl.querySelectorAll('.help-section');
            if (sections.length > 0) {
                sections.forEach(section => observer.current?.observe(section));
            } else if (currentPageContent?.toc.length) {
                // If no section is in view, default to the first one
                setActiveSectionId(currentPageContent.toc[0].id);
            }
        }

        return () => observer.current?.disconnect();
    }, [pagesContent, activePageKey, language]);

    const currentPageContent = useMemo(() => pagesContent.get(`${activePageKey}-${language}`), [pagesContent, activePageKey, language]);

    const translatedDocPages = useMemo(() => DOC_PAGES_CONFIG.map(page => ({
        key: page.key,
        title: t(`help.topics.${page.key}`)
    })), [t]);


    return (
        <div className="w-full max-w-6xl mx-auto overflow-x-hidden animate-fade-in">
            <header className="w-full text-center mb-8">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 dark:from-purple-400 dark:via-pink-400 dark:to-purple-400">
                    {t('help.title')}
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">{t('help.subtitle')}</p>
            </header>

             <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
                {/* Pages Navigation */}
                <aside className="md:w-64 lg:w-72 flex-shrink-0">
                    <nav className="md:sticky top-4 self-start card-elevated rounded-2xl shadow-xl p-4 animate-slide-in-left">
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                            <svg className="w-5 h-5 text-purple-500 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('help.topics.title')}</h3>
                        </div>
                        <ul className="space-y-1">
                            {translatedDocPages.map((page) => (
                                <li key={page.key}>
                                    <button
                                        onClick={() => setActivePageKey(page.key)}
                                        className={`group w-full text-left py-3 px-4 rounded-xl transition-all duration-200 text-sm min-h-[44px] flex items-center gap-3
                                            ${activePageKey === page.key
                                                ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-700 dark:text-purple-300 font-semibold shadow-sm'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-50 dark:hover:from-slate-800/50 dark:hover:to-slate-700/50'
                                            }`}
                                    >
                                        <span className={`transition-transform duration-200 ${activePageKey === page.key ? 'scale-110' : 'group-hover:scale-105'}`}>
                                            {activePageKey === page.key ? (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            )}
                                        </span>
                                        <span className="truncate">{page.title}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>

                        {/* Table of Contents for the current page */}
                        {currentPageContent && currentPageContent.toc.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {t('help.onThisPage')}
                                </h3>
                                <ul className="space-y-1">
                                    {currentPageContent.toc.map((section) => (
                                        <li key={section.id}>
                                            <a
                                                href={`#${section.id}`}
                                                style={{ paddingLeft: `${0.75 + (section.level - 1) * 0.5}rem` }}
                                                className={`block text-sm py-2 rounded-lg transition-all duration-200 border-l-2
                                                    ${activeSectionId === section.id
                                                        ? 'border-purple-500 text-purple-700 dark:text-purple-300 font-semibold bg-purple-50 dark:bg-purple-900/20 pl-3'
                                                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                                    }`}
                                            >
                                                {section.text}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 min-w-0 animate-fade-in-up">
                    <div className="card-elevated rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 min-h-[50vh]">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-4">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full border-4 border-slate-200 dark:border-slate-700"></div>
                                    <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-purple-500 animate-spin"></div>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 font-medium">{t('help.loading') || 'Loading...'}</p>
                            </div>
                        ) : (
                            <div
                                ref={contentRef}
                                className="prose prose-slate dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: currentPageContent?.html || '' }}
                            />
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default HelpView;
