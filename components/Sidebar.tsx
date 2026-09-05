
import React from 'react';

import { useI18n } from '../hooks/useI18n';
import { View } from '../types';

import { SettingsIcon, Wand2Icon, SwordsIcon, HelpCircleIcon, ChevronsLeftIcon } from './Icons';

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
  // Active nav = a highlighter patch behind the label.
  const activeClasses = 'bg-accent/60 text-ink font-semibold';
  const inactiveClasses = 'text-ink-soft hover:bg-ink/5 hover:text-ink';

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
          <span className="whitespace-nowrap font-display">{label}</span>
        )}
        {isActive && !isCollapsed && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-ink/70" />
        )}
      </button>
    </li>
  );
};


const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isCollapsed, onToggle }) => {
  const { t } = useI18n();

  return (
    <aside className={`glass border-r border-ink/10 p-3 sm:p-4 flex flex-col gap-6 flex-shrink-0 transition-all duration-300 ease-in-out overflow-x-hidden ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className={isCollapsed ? 'animate-fade-in' : 'animate-fade-in-up'}>
        <button
          onClick={() => onNavigate(View.Maker)}
          className="w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-deep focus:ring-offset-2 group transition-all duration-200"
          aria-label={t('sidebar.homeAria')}
        >
          <h1 className="font-display text-xl sm:text-2xl font-bold text-ink px-2 text-center truncate transition-all group-hover:text-ink-soft">
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
        <div className="border-t border-ink/10 pt-3 mt-3">
          <button
            onClick={onToggle}
            className="group flex items-center gap-3 py-3 rounded-xl cursor-pointer transition-all duration-200 w-full text-left text-ink-soft hover:bg-ink/5 hover:text-ink min-h-[44px] px-4"
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
