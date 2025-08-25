
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
                    return `<h${mappedLevel} id="${id}" class="help-section scroll-mt-16 ${sizeClasses} font-bold text-purple-500 dark:text-purple-400 mb-4 border-b-2 border-slate-200 dark:border-slate-700 pb-2">${text}</h${mappedLevel}>`;
                };
                
                renderer.paragraph = (text) => `<p class="mb-4 text-slate-700 dark:text-slate-300">${text}</p>`;
                renderer.list = (body) => `<ul class="list-disc list-inside space-y-2 pl-4 mb-4">${body}</ul>`;
                renderer.strong = (text) => `<strong class="text-slate-900 dark:text-slate-100">${text}</strong>`;
                
                (renderer as any).link = (href: string, title: string | null, text: string) => {
                    return `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer" class="text-purple-600 dark:text-purple-400 hover:underline">${text}</a>`;
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
        <div className="w-full max-w-6xl mx-auto">
            <header className="w-full text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600">
                    {t('help.title')}
                </h1>
                <p className="text-slate-600 dark:text-slate-400">{t('help.subtitle')}</p>
            </header>
            
             <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
                {/* Pages Navigation */}
                <aside className="md:w-1/4 lg:w-1/5">
                    <nav className="md:sticky top-4 self-start">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">{t('help.topics.title')}</h3>
                        <ul className="space-y-1">
                            {translatedDocPages.map((page) => (
                                <li key={page.key}>
                                    <button
                                        onClick={() => setActivePageKey(page.key)}
                                        className={`w-full text-left px-3 py-2 rounded-md transition-colors duration-200 text-sm
                                            ${activePageKey === page.key
                                                ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300 font-semibold'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        {page.title}
                                    </button>
                                </li>
                            ))}
                        </ul>

                        {/* Table of Contents for the current page */}
                        {currentPageContent && currentPageContent.toc.length > 0 && (
                            <div className="mt-8">
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">{t('help.onThisPage')}</h3>
                                <ul className="space-y-2 border-l-2 border-slate-200 dark:border-slate-700">
                                    {currentPageContent.toc.map((section) => (
                                        <li key={section.id}>
                                            <a
                                                href={`#${section.id}`}
                                                style={{ paddingLeft: `${1 + (section.level - 1) * 0.75}rem` }}
                                                className={`block text-sm transition-colors duration-200 py-1 border-l-2
                                                    ${activeSectionId === section.id
                                                        ? 'border-purple-500 text-purple-600 dark:text-purple-400 font-semibold'
                                                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
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
                <main className="md:w-3/4 lg:w-4/5 min-w-0">
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg shadow-2xl p-8 min-h-[50vh]">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                            </div>
                        ) : (
                            <div
                                ref={contentRef}
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