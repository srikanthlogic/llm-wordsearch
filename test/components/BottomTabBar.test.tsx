import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import BottomTabBar from '../../components/BottomTabBar';
import { View } from '../../types';

vi.mock('../../hooks/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'sidebar.maker': 'Maker',
        'sidebar.player': 'Player',
        'sidebar.settings': 'Settings',
        'sidebar.help': 'Help',
      };
      return map[key] || key;
    },
  }),
}));

describe('BottomTabBar', () => {
  const defaultProps = {
    currentView: View.Maker,
    onNavigate: vi.fn(),
    orientation: 'horizontal' as const,
  };

  it('should render all tabs', () => {
    render(<BottomTabBar {...defaultProps} />);
    expect(screen.getByLabelText('Maker')).toBeInTheDocument();
    expect(screen.getByLabelText('Player')).toBeInTheDocument();
    expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    expect(screen.getByLabelText('Help')).toBeInTheDocument();
  });

  it('should call onNavigate when tab is clicked', () => {
    const onNavigate = vi.fn();
    render(<BottomTabBar {...defaultProps} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByLabelText('Player'));
    expect(onNavigate).toHaveBeenCalledWith(View.Player);
  });

  it('should highlight the active tab', () => {
    render(<BottomTabBar {...defaultProps} currentView={View.Maker} />);
    const makerBtn = screen.getByLabelText('Maker');
    expect(makerBtn).toHaveAttribute('aria-current', 'page');
  });

  it('should not highlight inactive tabs', () => {
    render(<BottomTabBar {...defaultProps} currentView={View.Maker} />);
    const playerBtn = screen.getByLabelText('Player');
    expect(playerBtn).not.toHaveAttribute('aria-current', 'page');
  });

  it('should render in horizontal orientation', () => {
    render(<BottomTabBar {...defaultProps} orientation="horizontal" />);
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('border-t');
  });

  it('should render in vertical orientation', () => {
    render(<BottomTabBar {...defaultProps} orientation="vertical" />);
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('border-r');
  });
});
