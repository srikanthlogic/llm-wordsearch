
import React from 'react';
import { View } from '../types';
import { SettingsIcon, Wand2Icon, SwordsIcon, HelpCircleIcon, ChevronsLeftIcon } from './Icons';
import { useI18n } from '../hooks/useI18n';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

const NavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    isCollapsed: boolean;
}> = ({ icon, label, isActive, onClick, isCollapsed }) => {
  const baseClasses = `group flex items-center gap-3 py-3 rounded-xl cursor-pointer transition-all duration-200 w-full text-left min-h-[44px] ${isCollapsed ? 'px-3 justify-center' : 'px-4'}`;
  const activeClasses = 'bg-gradient-to-r from-purple-500/10 to-purple-600/10 text-purple-700 dark:text-purple-300 font-semibold shadow-sm';
  const inactiveClasses = 'text-slate-600 dark:text-slate-400 hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-50 dark:hover:from-slate-800/50 dark:hover:to-slate-700/50';

  return (
    <li>
      <button
        onClick={onClick}
        className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
        aria-label={label}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
          {icon}
        </span>
        {!isCollapsed && (
          <span className="whitespace-nowrap">{label}</span>
        )}
        {isActive && !isCollapsed && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse-subtle" />
        )}
      </button>
    </li>
  );
};


const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isCollapsed, onToggle }) => {
  const { t } = useI18n();

  return (
    <aside className={`glass border-r border-slate-200/50 dark:border-slate-700/50 p-3 sm:p-4 flex flex-col gap-6 flex-shrink-0 transition-all duration-300 ease-in-out overflow-x-hidden ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className={isCollapsed ? 'animate-fade-in' : 'animate-fade-in-up'}>
        <button
          onClick={() => onNavigate(View.Maker)}
          className="w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 group transition-all duration-200"
          aria-label={t('sidebar.homeAria')}
        >
          <h1 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-400 dark:to-pink-400 px-2 text-center truncate group-hover:brightness-110 transition-all">
            {isCollapsed ? t('sidebar.titleShort') : t('sidebar.titleLong')}
          </h1>
        </button>
      </div>

      <nav className="flex-1">
        <ul className="space-y-1.5">
          <NavItem
            icon={<Wand2Icon />}
            label={t('sidebar.maker')}
            isActive={currentView === View.Maker}
            onClick={() => onNavigate(View.Maker)}
            isCollapsed={isCollapsed}
          />
          <NavItem
            icon={<SwordsIcon />}
            label={t('sidebar.player')}
            isActive={currentView === View.Player}
            onClick={() => onNavigate(View.Player)}
            isCollapsed={isCollapsed}
          />
          <NavItem
            icon={<SettingsIcon />}
            label={t('sidebar.settings')}
            isActive={currentView === View.Settings}
            onClick={() => onNavigate(View.Settings)}
            isCollapsed={isCollapsed}
          />
        </ul>
      </nav>

      <div className="space-y-1.5">
        <ul className="space-y-1.5">
          <NavItem
            icon={<HelpCircleIcon />}
            label={t('sidebar.help')}
            isActive={currentView === View.Help}
            onClick={() => onNavigate(View.Help)}
            isCollapsed={isCollapsed}
          />
        </ul>
        <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-3">
          <button
            onClick={onToggle}
            className="group flex items-center gap-3 py-3 rounded-xl cursor-pointer transition-all duration-200 w-full text-left text-slate-500 dark:text-slate-400 hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-50 dark:hover:from-slate-800/50 dark:hover:to-slate-700/50 hover:text-slate-700 dark:hover:text-slate-300 min-h-[44px] px-4"
            aria-label={isCollapsed ? t('sidebar.expandAria') : t('sidebar.collapseAria')}
          >
            <span className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>
              <ChevronsLeftIcon />
            </span>
            {!isCollapsed && (
              <span className="whitespace-nowrap">
                {isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
              </span>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
