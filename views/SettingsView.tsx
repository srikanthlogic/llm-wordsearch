
import React, { useState, useEffect } from 'react';

import { TrashIcon, SunIcon, MoonIcon, MonitorIcon, InfoIcon, KeyRoundIcon, ServerIcon, Wand2Icon, Loader2Icon, CheckCircle2Icon, XCircleIcon, ExternalLinkIcon } from '../components/Icons';
import LanguageSelector from '../components/LanguageSelector';
import { useI18n } from '../hooks/useI18n';
import { testAIConnection } from '../services/geminiService';
import { Theme, AIProviderSettings, AIProvider, BYOLLMSettings, AILogEntry, View } from '../types';

interface SettingsViewProps {
  aiLogs: AILogEntry[];
  onClearData: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  aiSettings: AIProviderSettings;
  onAISettingsChange: (settings: AIProviderSettings) => void;
  setView: (view: View) => void;
}

const providerPresets = [
    { name: 'Custom', providerName: 'Custom', baseURL: '', model: '', website: '' },
    // Cloud providers
    { name: 'OpenRouter', providerName: 'OpenRouter', baseURL: 'https://openrouter.ai/api/v1', model: 'google/gemini-2.5-flash', website: 'https://openrouter.ai' },
    { name: 'Together.ai', providerName: 'Together.ai', baseURL: 'https://api.together.xyz/v1', model: 'meta-llama/Llama-3-8b-chat-hf', website: 'https://docs.together.ai/docs/openai-api-compatibility' },
    { name: 'Fireworks.ai', providerName: 'Fireworks.ai', baseURL: 'https://api.fireworks.ai/inference/v1', model: 'accounts/fireworks/models/llama-v3-8b-instruct', website: 'https://fireworks.ai/docs/openai-compatibility' },
    // Local providers
    { name: 'Jan', providerName: 'Jan', baseURL: 'http://localhost:1337/v1', model: 'llama3', website: 'https://jan.ai' },
    { name: 'LM Studio', providerName: 'LM Studio', baseURL: 'http://localhost:1234/v1', model: 'local-model', website: 'https://lmstudio.ai/docs/local-server' },
    { name: 'Ollama', providerName: 'Ollama', baseURL: 'http://localhost:11434/v1', model: 'llama3', website: 'https://ollama.com' },
];

const SettingsView: React.FC<SettingsViewProps> = ({ aiLogs: _aiLogs, onClearData, theme, onThemeChange, aiSettings, onAISettingsChange, setView }) => {
  const { t, language, setLanguage } = useI18n();
  const [provider, setProvider] = useState<AIProvider>(aiSettings.provider);
  const [byollmSettings, setByollmSettings] = useState<BYOLLMSettings>(aiSettings.byollm || { providerName: 'OpenRouter', apiKey: '', baseURL: 'https://openrouter.ai/api/v1', modelName: 'google/gemini-2.5-flash' });
  const [openRouterModels, setOpenRouterModels] = useState<{ id: string; name: string }[]>([]);
  const [communityModels, setCommunityModels] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const is_open_router = byollmSettings.baseURL.includes('openrouter.ai');

  useEffect(() => {
    setProvider(aiSettings.provider);
    setByollmSettings(aiSettings.byollm || { providerName: 'OpenRouter', apiKey: '', baseURL: 'https://openrouter.ai/api/v1', modelName: 'google/gemini-2.5-flash' });
  }, [aiSettings]);

  useEffect(() => {
    const fetchOpenRouterModels = async () => {
        const url = is_open_router ? 'https://openrouter.ai/api/v1/models?supported_parameters=structured_outputs' : 'https://openrouter.ai/api/v1/models';
        if (!is_open_router) {
            setOpenRouterModels([]);
            return;
        }
        setIsLoadingModels(true);
        setOpenRouterModels([]);
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch models from OpenRouter.');
            const data = await response.json();
            const models = data.data
                .map((model: any) => ({ id: model.id, name: model.name }))
                .sort((a: {name: string}, b: {name: string}) => a.name.localeCompare(b.name));
            setOpenRouterModels(models);
        } catch (error) {
            console.error("Error fetching OpenRouter models:", error);
        } finally {
            setIsLoadingModels(false);
        }
    };
    fetchOpenRouterModels();
  }, [is_open_router]);

  useEffect(() => {
    const fetchCommunityModels = async () => {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/models?supported_parameters=structured_outputs');
        if (!response.ok) throw new Error('Failed to fetch models from OpenRouter.');
        const data = await response.json();
        const models = data.data
            .filter((model: any) => model.id.includes(':free'))
            .map((model: any) => ({ id: model.id, name: model.name }))
            .sort((a: {name: string}, b: {name: string}) => a.name.localeCompare(b.name));
        setCommunityModels(models);
      } catch (error) {
        console.error("Error fetching community models:", error);
      }
    };
    fetchCommunityModels();
  }, []);

  const handleByollmChange = (field: keyof BYOLLMSettings, value: string) => {
    setByollmSettings(prev => ({ ...prev, [field]: value }));
    setTestStatus('idle');
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const presetName = e.target.value;
      const preset = providerPresets.find(p => p.name === presetName);
      if (preset) {
          setByollmSettings(prev => ({
              ...prev,
              providerName: preset.providerName,
              baseURL: preset.baseURL,
              modelName: preset.model,
          }));
      }
      setTestStatus('idle');
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('');
    try {
        await testAIConnection(byollmSettings);
        setTestStatus('success');
        setTestMessage(t('settings.byollm.testSuccess'));
    } catch (error) {
        setTestStatus('error');
        setTestMessage(error instanceof Error ? error.message : t('settings.byollm.testErrorUnknown'));
    }
  };

  const [communityModel, setCommunityModel] = useState(aiSettings.communityModel || 'google/gemini-2.5-flash:free');

  const handleSaveAISettings = () => {
    onAISettingsChange({
      provider,
      byollm: byollmSettings,
      communityModel: communityModel,
    });
    alert(t('settings.byollm.saveSuccess'));
  };

  const ThemeButton = ({ current, target, onClick, icon, label }: { current: Theme, target: Theme, onClick: (t: Theme) => void, icon: React.ReactNode, label: string }) => {
    const isActive = current === target;
    const baseClasses = "group flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200 w-full min-h-[100px]";
    const activeClasses = "bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500 text-purple-700 dark:text-purple-300 shadow-md";
    const inactiveClasses = "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800";

    return (
      <button onClick={() => onClick(target)} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
        <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
          {icon}
        </span>
        <span className="font-semibold">{label}</span>
      </button>
    );
  };

  const BaseField = ({ id, label, children, link }: { id: string, label: string, children: React.ReactNode, link?: string }) => (
    <div className="space-y-2">
        <label htmlFor={id} className="block text-slate-700 dark:text-slate-200 text-sm font-semibold">
           <div className="flex items-center justify-between">
            <span>{label}</span>
            {link && <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-500 hover:text-purple-600 dark:hover:text-purple-400 hover:underline flex items-center gap-1">{t('settings.byollm.docsLink')} <ExternalLinkIcon className="w-3 h-3"/></a>}
           </div>
        </label>
        <div className="relative">
            {children}
        </div>
    </div>
  );

  const currentPreset = providerPresets.find(p => p.baseURL === byollmSettings.baseURL) || providerPresets[0];

  return (
    <div className="w-full max-w-4xl mx-auto text-slate-700 dark:text-slate-300 space-y-6 overflow-x-hidden animate-fade-in">
        <header className="w-full text-center mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 dark:from-purple-400 dark:via-pink-400 dark:to-purple-400">
                {t('settings.title')}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">{t('settings.subtitle')}</p>
        </header>

        <div className="card-elevated rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {t('settings.provider.title')}
                </h2>
            </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setProvider(AIProvider.Community)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    provider === AIProvider.Community
                      ? 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-900/10'
                  }`}
                >
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{t('settings.provider.community.title')}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t('settings.provider.community.description')}</p>
                </button>
                <button
                  onClick={() => setProvider(AIProvider.BYOLLM)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    provider === AIProvider.BYOLLM
                      ? 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-900/10'
                  }`}
                >
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{t('settings.provider.byollm.title')}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t('settings.provider.byollm.description')}</p>
                </button>
            </div>

            {provider === AIProvider.Community && (
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <BaseField id="communityModel" label={t('settings.provider.community.modelLabel')}>
                  <select id="communityModel" value={communityModel} onChange={e => setCommunityModel(e.target.value)} className="input-base w-full px-4 py-3 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white appearance-none">
                    {communityModels.length > 0 ? (
                      communityModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                    ) : (
                      <option>{t('settings.byollm.modelsLoading')}</option>
                    )}
                  </select>
                </BaseField>
              </div>
            )}

            {provider === AIProvider.BYOLLM && (
                <div className="space-y-5 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <BaseField id="providerPreset" label={t('settings.byollm.presetLabel')}>
                      <select id="providerPreset" onChange={handlePresetChange} value={currentPreset.name} className="input-base w-full px-4 py-3 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white appearance-none">
                          {providerPresets.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                      </select>
                    </BaseField>

                    <BaseField id="apiKey" label={t('settings.byollm.apiKeyLabel')}>
                        <KeyRoundIcon className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 ml-4 text-slate-400"/>
                        <input id="apiKey" type="password" value={byollmSettings.apiKey} onChange={e => handleByollmChange('apiKey', e.target.value)} placeholder="sk-..." className="input-base w-full pl-10 px-4 py-3 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white min-h-[48px]"/>
                    </BaseField>

                    <BaseField id="baseURL" label={t('settings.byollm.baseURLabel')} link={currentPreset.website}>
                        <ServerIcon className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 ml-4 text-slate-400"/>
                        <input id="baseURL" type="text" value={byollmSettings.baseURL} onChange={e => handleByollmChange('baseURL', e.target.value)} placeholder="https://provider.com/api/v1" className="input-base w-full pl-10 px-4 py-3 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white min-h-[48px]"/>
                    </BaseField>

                    <BaseField id="modelName" label={t('settings.byollm.modelNameLabel')}>
                        <Wand2Icon className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 ml-4 text-slate-400"/>
                        {is_open_router ? (
                            <select id="modelName" value={byollmSettings.modelName} onChange={e => handleByollmChange('modelName', e.target.value)} disabled={isLoadingModels} className="input-base w-full pl-10 px-4 py-3 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white appearance-none disabled:opacity-50 min-h-[48px]">
                                {isLoadingModels && <option>{t('settings.byollm.modelsLoading')}</option>}
                                {!isLoadingModels && openRouterModels.length === 0 && <option>{t('settings.byollm.modelsError')}</option>}
                                {openRouterModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        ) : (
                              <input id="modelName" type="text" value={byollmSettings.modelName} onChange={e => handleByollmChange('modelName', e.target.value)} placeholder="provider/model-name" className="input-base w-full pl-10 px-4 py-3 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white min-h-[48px]"/>
                        )}
                    </BaseField>

                     <div className="flex items-start gap-3 bg-slate-100 dark:bg-slate-700/50 p-4 rounded-xl text-sm">
                        <InfoIcon className="w-5 h-5 flex-shrink-0 mt-0.5 text-purple-500 dark:text-purple-400" />
                        <p className="text-slate-600 dark:text-slate-400">
                           {t('settings.byollm.keyDisclaimer')}
                        </p>
                    </div>

                    {testStatus !== 'idle' && (
                        <div className={`flex items-start gap-3 p-4 rounded-xl text-sm ${
                            testStatus === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' :
                            testStatus === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800' :
                            'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        }`}>
                            {testStatus === 'success' && <CheckCircle2Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                            {testStatus === 'error' && <XCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                            {testStatus === 'testing' && <Loader2Icon className="w-5 h-5 flex-shrink-0 mt-0.5 animate-spin" />}
                            <pre className="whitespace-pre-wrap font-sans">{testMessage}</pre>
                        </div>
                    )}
                </div>
            )}
            <div className="flex justify-end items-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                {provider === AIProvider.BYOLLM && (
                    <button
                        onClick={handleTestConnection}
                        disabled={testStatus === 'testing'}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-500 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
                    >
                       {testStatus === 'testing' ? <Loader2Icon className="w-5 h-5 animate-spin" /> : null}
                       {testStatus === 'testing' ? t('settings.byollm.testingButton') : t('settings.byollm.testButton')}
                    </button>
                )}
                <button
                    onClick={handleSaveAISettings}
                    className="btn-primary px-6 py-3 text-white font-bold rounded-xl min-h-[48px]"
                >
                    {t('settings.byollm.saveButton')}
                </button>
            </div>
        </div>

        <div className="card-elevated rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    AI Logs
                </h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
                {t('settings.aiLogs.description') || 'View and manage AI interaction logs for debugging and monitoring.'}
            </p>
            <button
                onClick={() => setView(View.AILog)}
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg min-h-[48px]"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {t('settings.aiLogs.viewButton') || 'View AI Logs'}
            </button>
        </div>

        <div className="card-elevated rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {t('settings.language.title')}
                </h2>
            </div>
            <LanguageSelector
                label={t('settings.language.label')}
                value={language}
                onChange={setLanguage}
            />
        </div>

        <div className="card-elevated rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {t('settings.appearance.title')}
                </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ThemeButton current={theme} target={Theme.Light} onClick={onThemeChange} icon={<SunIcon />} label={t('settings.appearance.light')} />
                <ThemeButton current={theme} target={Theme.Dark} onClick={onThemeChange} icon={<MoonIcon />} label={t('settings.appearance.dark')} />
                <ThemeButton current={theme} target={Theme.System} onClick={onThemeChange} icon={<MonitorIcon />} label={t('settings.appearance.system')} />
            </div>
        </div>


        <div className="card-elevated rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 animate-fade-in-up" style={{ animationDelay: '250ms' }}>
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 011-1h2a1 1 0 011 1v3M4 7h16" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {t('settings.data.title')}
                </h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
                {t('settings.data.description')}
            </p>
        <button
          type="button"
          onClick={onClearData}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 active:bg-red-200 dark:active:bg-red-900/40 font-semibold rounded-xl transition-all duration-200 min-h-[48px]"
          title={t('settings.data.buttonAria')}
        >
          <TrashIcon />
          {t('settings.data.button')}
        </button>
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <a
            href="#privacy"
            className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
