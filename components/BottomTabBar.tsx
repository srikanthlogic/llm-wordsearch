import React from 'react';

import { useI18n } from '../hooks/useI18n';
import { View } from '../types';

import { SettingsIcon, Wand2Icon, SwordsIcon, HelpCircleIcon } from './Icons';

interface BottomTabBarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  orientation: 'horizontal' | 'vertical';
}

const TabItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  orientation: 'horizontal' | 'vertical';
}> = ({ icon, label, isActive, onClick, orientation }) => {
  const isHorizontal = orientation === 'horizontal';
  const baseClasses = `group flex ${isHorizontal ? 'flex-col items-center justify-center gap-1.5 py-2.5 px-3' : 'items-center gap-3 py-3 px-4'} rounded-xl cursor-pointer transition-all duration-200 w-full text-left min-h-[44px] relative`;
  const activeClasses = 'bg-accent/60 text-ink font-semibold';
  const inactiveClasses = 'text-ink-soft hover:bg-ink/5 hover:text-ink';

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
        {icon}
      </span>
      <span className={`${isHorizontal ? 'text-[11px] font-medium whitespace-nowrap font-display' : 'whitespace-nowrap font-display'}`}>{label}</span>
      {isActive && isHorizontal && (
        <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-accent" />
      )}
    </button>
  );
};

const BottomTabBar: React.FC<BottomTabBarProps> = ({ currentView, onNavigate, orientation }) => {
  const { t } = useI18n();
  const isHorizontal = orientation === 'horizontal';

  return (
    <nav className={`glass ${isHorizontal ? 'border-t border-ink/10' : 'border-r border-ink/10'} p-2 ${isHorizontal ? 'flex justify-around items-center overflow-x-hidden safe-area-inset-bottom' : 'flex flex-col gap-2 w-64 flex-shrink-0 overflow-x-hidden'}`}>
      <TabItem
        icon={<Wand2Icon />}
        label={t('sidebar.maker')}
        isActive={currentView === View.Maker}
        onClick={() => onNavigate(View.Maker)}
        orientation={orientation}
      />
      <TabItem
        icon={<SwordsIcon />}
        label={t('sidebar.player')}
        isActive={currentView === View.Player}
        onClick={() => onNavigate(View.Player)}
        orientation={orientation}
      />
      <TabItem
        icon={<SettingsIcon />}
        label={t('sidebar.settings')}
        isActive={currentView === View.Settings}
        onClick={() => onNavigate(View.Settings)}
        orientation={orientation}
      />
      <TabItem
        icon={<HelpCircleIcon />}
        label={t('sidebar.help')}
        isActive={currentView === View.Help}
        onClick={() => onNavigate(View.Help)}
        orientation={orientation}
      />
    </nav>
  );
};

export default BottomTabBar;
