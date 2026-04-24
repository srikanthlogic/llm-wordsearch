
import React from 'react';

import { useI18n } from '../hooks/useI18n';

const PrivacyView: React.FC = () => {
  const { t } = useI18n();
  const lastUpdated = 'April 24, 2026';

  const PrivacySection: React.FC<{ title: string; children: React.ReactNode; icon: React.ReactNode }> = ({ title, children, icon }) => (
    <div className="card-elevated rounded-2xl shadow-xl p-6 sm:p-8 animate-fade-in-up">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
          {icon}
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
      </div>
      <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
        {children}
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto text-slate-700 dark:text-slate-300 space-y-6 overflow-x-hidden animate-fade-in">
      <header className="w-full text-center mb-8">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 dark:from-purple-400 dark:via-pink-400 dark:to-purple-400">
          Privacy Policy
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Last updated: {lastUpdated}</p>
      </header>

      <div className="space-y-6">
        <PrivacySection
          title="Data Collection"
          icon={
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        >
          <p className="mb-4">
            LLM-Wordsearch stores all your data locally in your browser using localStorage. This includes:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-4 mb-4">
            <li>Your saved games and puzzles</li>
            <li>Your game history and progress</li>
            <li>Theme preferences (light/dark mode)</li>
            <li>AI provider settings (if configured)</li>
          </ul>
          <p>
            <strong>No data is sent to our servers.</strong> Everything stays on your device.
          </p>
        </PrivacySection>

        <PrivacySection
          title="AI Service"
          icon={
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        >
          <p className="mb-4">
            When you use the AI-powered puzzle generation feature, your requests are sent to OpenRouter (or your configured AI provider). This is an optional feature.
          </p>
          <p className="mb-4">
            Please review OpenRouter&apos;s privacy policy at{' '}
            <a
              href="https://openrouter.ai/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline font-medium"
            >
              openrouter.ai/privacy
            </a>
          </p>
          <p>
            If you use the &quot;Bring Your Own LLM&quot; feature, your API key and requests are stored locally and sent directly to your chosen provider.
          </p>
        </PrivacySection>

        <PrivacySection
          title="Analytics"
          icon={
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        >
          <p>
            We do not currently use any analytics or tracking tools. We may add privacy-focused analytics in the future to help improve the application. If we do, we will update this policy.
          </p>
        </PrivacySection>

        <PrivacySection
          title="Your Rights"
          icon={
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        >
          <p className="mb-4">
            You have full control over your data:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-4 mb-4">
            <li>Clear your browser&apos;s localStorage to delete all saved games and settings</li>
            <li>Use the &quot;Clear Application Data&quot; button in Settings to remove all data</li>
            <li>Your data never leaves your device unless you explicitly share a game via URL</li>
          </ul>
          <p>
            Game share links contain your puzzle data encoded in the URL itself - no external server is involved.
          </p>
        </PrivacySection>

        <PrivacySection
          title="Contact"
          icon={
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        >
          <p>
            If you have any questions about this Privacy Policy, please contact us at:{''}
            <a
              href="mailto:signup-llmwordsearch@srik.me"
              className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline font-medium ml-1"
            >
              signup-llmwordsearch@srik.me
            </a>
          </p>
        </PrivacySection>
      </div>
    </div>
  );
};

export default PrivacyView;
