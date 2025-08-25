
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
  const baseClasses = `flex items-center gap-3 py-3 rounded-lg cursor-pointer transition-colors w-full text-left ${isCollapsed ? 'px-3 justify-center' : 'px-4'}`;
  const activeClasses = 'bg-purple-500/20 text-purple-600 dark:bg-purple-600/50 dark:text-white font-semibold';
  const inactiveClasses = 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-200';

  return (
    <li>
      <button
        onClick={onClick}
        className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
        aria-label={label}
        aria-current={isActive ? 'page' : undefined}
      >
        {icon}
        {!isCollapsed && <span className="whitespace-nowrap">{label}</span>}
      </button>
    </li>
  );
};


const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isCollapsed, onToggle }) => {
  const { t } = useI18n();

  return (
    <aside className={`bg-slate-100 dark:bg-slate-800 p-4 flex flex-col gap-8 flex-shrink-0 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div>
        <button
          onClick={() => onNavigate(View.Maker)}
          className="w-full rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-800 focus:ring-purple-500"
          aria-label={t('sidebar.homeAria')}
        >
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600 px-2 text-center truncate">
            {isCollapsed ? t('sidebar.titleShort') : t('sidebar.titleLong')}
          </h1>
        </button>
      </div>
      <nav>
        <ul className="space-y-2">
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
      <div className="mt-auto">
        <ul className="space-y-2">
           <NavItem
              icon={<HelpCircleIcon />}
              label={t('sidebar.help')}
              isActive={currentView === View.Help}
              onClick={() => onNavigate(View.Help)}
              isCollapsed={isCollapsed}
            />
        </ul>
         <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
            <button
                onClick={onToggle}
                className={`flex items-center gap-3 py-3 rounded-lg cursor-pointer transition-colors w-full text-left text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-200 ${isCollapsed ? 'px-3 justify-center' : 'px-4'}`}
                aria-label={isCollapsed ? t('sidebar.expandAria') : t('sidebar.collapseAria')}
            >
                <ChevronsLeftIcon className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
                {!isCollapsed && <span className="whitespace-nowrap">{isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}</span>}
            </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
