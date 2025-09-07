import React from 'react';
import { View } from '../types';
import { SettingsIcon, Wand2Icon, SwordsIcon, HelpCircleIcon } from './Icons';
import { useI18n } from '../hooks/useI18n';

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
  const baseClasses = `flex ${isHorizontal ? 'flex-col items-center justify-center gap-1 py-2 px-3' : 'items-center gap-3 py-3 px-4'} rounded-lg cursor-pointer transition-colors w-full text-left min-h-[44px]`;
  const activeClasses = 'bg-purple-500/20 text-purple-600 dark:bg-purple-600/50 dark:text-white font-semibold';
  const inactiveClasses = 'text-slate-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-200';

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} active:bg-gray-200 ${isActive ? activeClasses : inactiveClasses}`}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      {icon}
      <span className={`${isHorizontal ? 'text-xs whitespace-nowrap' : 'whitespace-nowrap'}`}>{label}</span>
    </button>
  );
};

const BottomTabBar: React.FC<BottomTabBarProps> = ({ currentView, onNavigate, orientation }) => {
  const { t } = useI18n();
  const isHorizontal = orientation === 'horizontal';

  return (
    <nav className={`bg-slate-100 dark:bg-slate-800 p-2 ${isHorizontal ? 'flex justify-around items-center overflow-x-hidden' : 'flex flex-col gap-2 w-64 flex-shrink-0 overflow-x-hidden'}`}>
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