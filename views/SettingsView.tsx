
import React, { useState, useEffect } from 'react';
import AILog from '../components/AILog';
import { TrashIcon, SunIcon, MoonIcon, MonitorIcon, InfoIcon, KeyRoundIcon, ServerIcon, Wand2Icon, Loader2Icon, CheckCircle2Icon, XCircleIcon, ExternalLinkIcon } from '../components/Icons';
import { Theme, AIProviderSettings, AIProvider, BYOLLMSettings } from '../types';
import { testAIConnection } from '../services/geminiService';
import { useI18n } from '../hooks/useI18n';
import LanguageSelector from '../components/LanguageSelector';

interface SettingsViewProps {
  aiLogs: string[];
  onClearData: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  aiSettings: AIProviderSettings;
  onAISettingsChange: (settings: AIProviderSettings) => void;
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

const SettingsView: React.FC<SettingsViewProps> = ({ aiLogs, onClearData, theme, onThemeChange, aiSettings, onAISettingsChange }) => {
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
    const baseClasses = "flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all w-full";
    const activeClasses = "bg-purple-500/20 border-purple-500 text-purple-600 dark:text-purple-300";
    const inactiveClasses = "bg-slate-200/50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-800 dark:hover:text-slate-200";
    
    return (
      <button onClick={() => onClick(target)} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
        {icon}
        <span className="font-semibold">{label}</span>
      </button>
    );
  };

  const BaseField = ({ id, label, children, link }: { id: string, label: string, children: React.ReactNode, link?: string }) => (
    <div>
        <label htmlFor={id} className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2">
           <div className="flex items-center justify-between">
            <span>{label}</span>
            {link && <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-500 hover:underline flex items-center gap-1">{t('settings.byollm.docsLink')} <ExternalLinkIcon className="w-3 h-3"/></a>}
           </div>
        </label>
        <div className="relative">
            {children}
        </div>
    </div>
  );

  const currentPreset = providerPresets.find(p => p.baseURL === byollmSettings.baseURL) || providerPresets[0];

  return (
    <div className="w-full max-w-4xl mx-auto text-slate-700 dark:text-slate-300 space-y-8">
        <header className="w-full text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600">
                {t('settings.title')}
            </h1>
            <p className="text-slate-600 dark:text-slate-400">{t('settings.subtitle')}</p>
        </header>

        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg shadow-2xl p-8 space-y-6">
            <h2 className="text-2xl font-bold text-purple-500 dark:text-purple-400 border-b border-slate-200 dark:border-slate-700 pb-2">
                {t('settings.provider.title')}
            </h2>
             <div className="flex gap-4">
                <label className={`flex-1 p-4 border-2 rounded-lg cursor-pointer transition-all ${provider === AIProvider.Community ? 'bg-purple-500/20 border-purple-500' : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'}`}>
                    <input type="radio" name="provider" value={AIProvider.Community} checked={provider === AIProvider.Community} onChange={(e) => setProvider(e.target.value as AIProvider)} className="sr-only" />
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{t('settings.provider.community.title')}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{t('settings.provider.community.description')}</p>
                </label>
                <label className={`flex-1 p-4 border-2 rounded-lg cursor-pointer transition-all ${provider === AIProvider.BYOLLM ? 'bg-purple-500/20 border-purple-500' : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'}`}>
                    <input type="radio" name="provider" value={AIProvider.BYOLLM} checked={provider === AIProvider.BYOLLM} onChange={(e) => setProvider(e.target.value as AIProvider)} className="sr-only" />
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{t('settings.provider.byollm.title')}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{t('settings.provider.byollm.description')}</p>
                </label>
            </div>

            {provider === AIProvider.Community && (
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <BaseField id="communityModel" label={t('settings.provider.community.modelLabel')}>
                  <select id="communityModel" value={communityModel} onChange={e => setCommunityModel(e.target.value)} className="w-full pl-3 pr-10 px-4 py-2 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
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
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <BaseField id="providerPreset" label={t('settings.byollm.presetLabel')}>
                      <select id="providerPreset" onChange={handlePresetChange} value={currentPreset.name} className="w-full pl-3 pr-10 px-4 py-2 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                          {providerPresets.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                      </select>
                    </BaseField>
                    
                    <BaseField id="apiKey" label={t('settings.byollm.apiKeyLabel')}>
                        <KeyRoundIcon className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 ml-3 text-slate-500 dark:text-slate-400"/>
                        <input id="apiKey" type="password" value={byollmSettings.apiKey} onChange={e => handleByollmChange('apiKey', e.target.value)} placeholder="sk-..." className="w-full pl-10 px-4 py-2 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"/>
                    </BaseField>

                    <BaseField id="baseURL" label={t('settings.byollm.baseURLabel')} link={currentPreset.website}>
                        <ServerIcon className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 ml-3 text-slate-500 dark:text-slate-400"/>
                        <input id="baseURL" type="text" value={byollmSettings.baseURL} onChange={e => handleByollmChange('baseURL', e.target.value)} placeholder="https://provider.com/api/v1" className="w-full pl-10 px-4 py-2 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"/>
                    </BaseField>

                    <BaseField id="modelName" label={t('settings.byollm.modelNameLabel')}>
                        <Wand2Icon className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 ml-3 text-slate-500 dark:text-slate-400"/>
                        {is_open_router ? (
                            <select id="modelName" value={byollmSettings.modelName} onChange={e => handleByollmChange('modelName', e.target.value)} disabled={isLoadingModels} className="w-full pl-10 px-4 py-2 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none">
                                {isLoadingModels && <option>{t('settings.byollm.modelsLoading')}</option>}
                                {!isLoadingModels && openRouterModels.length === 0 && <option>{t('settings.byollm.modelsError')}</option>}
                                {openRouterModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        ) : (
                             <input id="modelName" type="text" value={byollmSettings.modelName} onChange={e => handleByollmChange('modelName', e.target.value)} placeholder="provider/model-name" className="w-full pl-10 px-4 py-2 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"/>
                        )}
                    </BaseField>

                     <div className="flex items-start gap-2 bg-slate-200/50 dark:bg-slate-700/50 p-3 rounded-lg text-sm">
                        <InfoIcon className="w-5 h-5 flex-shrink-0 mt-0.5 text-slate-500 dark:text-slate-400" />
                        <p className="text-slate-600 dark:text-slate-400">
                           {t('settings.byollm.keyDisclaimer')}
                        </p>
                    </div>

                    {testStatus !== 'idle' && (
                        <div className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                            testStatus === 'success' ? 'bg-green-500/10 text-green-700 dark:text-green-300' :
                            testStatus === 'error' ? 'bg-red-500/10 text-red-700 dark:text-red-300' :
                            'bg-blue-500/10 text-blue-700 dark:text-blue-300'
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
                        className="flex items-center gap-2 bg-slate-500 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600"
                    >
                       {testStatus === 'testing' ? <Loader2Icon className="w-5 h-5 animate-spin" /> : null}
                       {testStatus === 'testing' ? t('settings.byollm.testingButton') : t('settings.byollm.testButton')}
                    </button>
                )}
                <button
                    onClick={handleSaveAISettings}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition-transform transform hover:scale-105"
                >
                    {t('settings.byollm.saveButton')}
                </button>
            </div>
        </div>
        
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg shadow-2xl p-8 space-y-6">
            <h2 className="text-2xl font-bold text-purple-500 dark:text-purple-400 border-b border-slate-200 dark:border-slate-700 pb-2">
                {t('settings.language.title')}
            </h2>
            <LanguageSelector
                label={t('settings.language.label')}
                value={language}
                onChange={setLanguage}
            />
        </div>

        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg shadow-2xl p-8 space-y-6">
            <h2 className="text-2xl font-bold text-purple-500 dark:text-purple-400 border-b border-slate-200 dark:border-slate-700 pb-2">
                {t('settings.appearance.title')}
            </h2>
            <div className="grid grid-cols-3 gap-4">
                <ThemeButton current={theme} target={Theme.Light} onClick={onThemeChange} icon={<SunIcon />} label={t('settings.appearance.light')} />
                <ThemeButton current={theme} target={Theme.Dark} onClick={onThemeChange} icon={<MoonIcon />} label={t('settings.appearance.dark')} />
                <ThemeButton current={theme} target={Theme.System} onClick={onThemeChange} icon={<MonitorIcon />} label={t('settings.appearance.system')} />
            </div>
        </div>

        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg shadow-2xl p-8 space-y-6">
            <h2 className="text-2xl font-bold text-purple-500 dark:text-purple-400 border-b border-slate-200 dark:border-slate-700 pb-2">
                {t('settings.log.title')}
            </h2>
            <div className="h-48 flex-grow">
                <AILog logs={aiLogs} />
            </div>
        </div>
        
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg shadow-2xl p-8 space-y-6">
            <h2 className="text-2xl font-bold text-purple-500 dark:text-purple-400 border-b border-slate-200 dark:border-slate-700 pb-2">
                {t('settings.data.title')}
            </h2>
            <div>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                    {t('settings.data.description')}
                </p>
                <button
                    type="button"
                    onClick={onClearData}
                    className="flex items-center gap-2 text-sm bg-red-500/20 text-red-600 dark:text-red-300 hover:bg-red-500/30 font-semibold rounded-md px-4 py-2 transition-colors"
                    title={t('settings.data.buttonAria')}
                >
                    <TrashIcon />
                    {t('settings.data.button')}
                </button>
            </div>
        </div>
    </div>
  );
};

export default SettingsView;