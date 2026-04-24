
import React from 'react';

const TermsView: React.FC = () => {
  const lastUpdated = 'April 24, 2026';

  return (
    <div className="w-full max-w-4xl mx-auto overflow-x-hidden animate-fade-in">
      <header className="w-full text-center mb-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 dark:from-purple-400 dark:via-pink-400 dark:to-purple-400">
          Terms of Service
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-3 text-sm">
          Last Updated: {lastUpdated}
        </p>
      </header>

      <div className="card-elevated rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 space-y-8">
        {/* Acceptance */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
              1
            </span>
            Acceptance of Terms
          </h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            By accessing or using LLM-Wordsearch, you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use the service.
          </p>
        </section>

        {/* Usage */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
              2
            </span>
            Permitted Use
          </h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
            LLM-Wordsearch is free to use for personal and educational purposes. You may:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-4 text-slate-700 dark:text-slate-300">
            <li>Create and solve word search puzzles</li>
            <li>Export puzzles for personal use</li>
            <li>Share puzzles with others via generated links</li>
            <li>Use the service in educational settings</li>
          </ul>
        </section>

        {/* Disclaimer */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
              3
            </span>
            Disclaimer
          </h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            The service is provided &quot;as-is&quot; without warranties of any kind, either express
            or implied. We do not guarantee that the service will be uninterrupted, error-free,
            or suitable for any particular purpose. AI-generated content may occasionally contain
            inaccuracies or unexpected results.
          </p>
        </section>

        {/* Limitation */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
              4
            </span>
            Limitation of Liability
          </h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            In no event shall the authors or contributors be liable for any damages arising from
            the use of this service, including but not limited to direct, indirect, incidental,
            special, or consequential damages, even if advised of the possibility of such damages.
          </p>
        </section>

        {/* Changes */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
              5
            </span>
            Changes to Terms
          </h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            We reserve the right to modify these terms at any time. Changes will be effective
            immediately upon posting. Continued use of the service constitutes acceptance of
            any modified terms. Please check this page periodically for updates.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
              6
            </span>
            Contact
          </h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            For questions about these Terms of Service, please contact us at:{`
            `}
            <a
              href="mailto:signup-llmwordsearch@srik.me"
              className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline font-medium ml-1"
            >
              signup-llmwordsearch@srik.me
            </a>
          </p>
        </section>

        {/* Footer note */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Thank you for using LLM-Wordsearch!
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsView;
