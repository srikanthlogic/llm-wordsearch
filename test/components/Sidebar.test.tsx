import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import Sidebar from '../../components/Sidebar';
import { View } from '../../types';

vi.mock('../../hooks/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'sidebar.homeAria': 'Home',
        'sidebar.titleShort': 'WS',
        'sidebar.titleLong': 'WordSearch',
        'sidebar.maker': 'Maker',
        'sidebar.player': 'Player',
        'sidebar.settings': 'Settings',
        'sidebar.help': 'Help',
        'sidebar.expandAria': 'Expand',
        'sidebar.collapseAria': 'Collapse',
        'sidebar.expand': 'Expand',
        'sidebar.collapse': 'Collapse',
      };
      return map[key] || key;
    },
  }),
}));

describe('Sidebar', () => {
  const defaultProps = {
    currentView: View.Maker,
    onNavigate: vi.fn(),
    isCollapsed: false,
    onToggle: vi.fn(),
  };

  it('should render the app title', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('WordSearch')).toBeInTheDocument();
  });

  it('should render all nav items', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByLabelText('Maker')).toBeInTheDocument();
    expect(screen.getByLabelText('Player')).toBeInTheDocument();
    expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    expect(screen.getByLabelText('Help')).toBeInTheDocument();
  });

  it('should call onNavigate when nav item is clicked', () => {
    const onNavigate = vi.fn();
    render(<Sidebar {...defaultProps} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByLabelText('Player'));
    expect(onNavigate).toHaveBeenCalledWith(View.Player);
  });

  it('should call onNavigate when title is clicked', () => {
    const onNavigate = vi.fn();
    render(<Sidebar {...defaultProps} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByLabelText('Home'));
    expect(onNavigate).toHaveBeenCalledWith(View.Maker);
  });

  it('should highlight the active view', () => {
    render(<Sidebar {...defaultProps} currentView={View.Maker} />);
    const makerBtn = screen.getByLabelText('Maker');
    expect(makerBtn).toHaveAttribute('aria-current', 'page');
  });

  it('should not highlight inactive views', () => {
    render(<Sidebar {...defaultProps} currentView={View.Maker} />);
    const playerBtn = screen.getByLabelText('Player');
    expect(playerBtn).not.toHaveAttribute('aria-current', 'page');
  });

  it('should show short title when collapsed', () => {
    render(<Sidebar {...defaultProps} isCollapsed={true} />);
    expect(screen.getByText('WS')).toBeInTheDocument();
    expect(screen.queryByText('WordSearch')).not.toBeInTheDocument();
  });

  it('should show long title when expanded', () => {
    render(<Sidebar {...defaultProps} isCollapsed={false} />);
    expect(screen.getByText('WordSearch')).toBeInTheDocument();
  });

  it('should call onToggle when collapse button is clicked', () => {
    const onToggle = vi.fn();
    render(<Sidebar {...defaultProps} onToggle={onToggle} />);
    fireEvent.click(screen.getByLabelText('Collapse'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('should show collapse aria when expanded', () => {
    render(<Sidebar {...defaultProps} isCollapsed={false} />);
    expect(screen.getByLabelText('Collapse')).toBeInTheDocument();
  });

  it('should show expand aria when collapsed', () => {
    render(<Sidebar {...defaultProps} isCollapsed={true} />);
    expect(screen.getByLabelText('Expand')).toBeInTheDocument();
  });

  it('should hide labels when collapsed', () => {
    render(<Sidebar {...defaultProps} isCollapsed={true} />);
    expect(screen.queryByText('Maker')).not.toBeInTheDocument();
  });

  it('should show labels when expanded', () => {
    render(<Sidebar {...defaultProps} isCollapsed={false} />);
    expect(screen.getByText('Maker')).toBeInTheDocument();
  });
});
