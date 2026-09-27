import React, { createContext, useContext, useEffect, useState } from 'react';

import { DEFAULT_INSTANCE_CONFIG, fetchInstanceConfig } from '../services/configService';
import { WordKeyConfig } from '../types';

interface InstanceConfigContextType {
  config: WordKeyConfig;
  loading: boolean;
}

const InstanceConfigContext = createContext<InstanceConfigContextType | undefined>(undefined);

export const InstanceConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // config starts null so consumers see loading:true rather than a flash of
  // defaults that could momentarily show author-mode chrome on a serve host.
  const [config, setConfig] = useState<WordKeyConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchInstanceConfig().then(result => {
      if (!cancelled) setConfig(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value: InstanceConfigContextType = config
    ? { config, loading: false }
    : { config: DEFAULT_INSTANCE_CONFIG, loading: true };

  return <InstanceConfigContext.Provider value={value}>{children}</InstanceConfigContext.Provider>;
};

export function useInstanceConfig(): InstanceConfigContextType {
  const ctx = useContext(InstanceConfigContext);
  if (!ctx) throw new Error('useInstanceConfig must be used within InstanceConfigProvider');
  return ctx;
}
