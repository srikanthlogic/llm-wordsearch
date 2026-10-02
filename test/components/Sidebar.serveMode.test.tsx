import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import Sidebar from '../../components/Sidebar';
import { View } from '../../types';

vi.mock('../../hooks/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../hooks/useInstanceConfig', () => ({
  useInstanceConfig: () => ({
    config: {
      mode: 'serve',
      title: '',
      owner: '',
      blurb: '',
      locale: 'en',
      links: [],
      levels: { perDomain: 3, wordsPerLevel: 8 },
      progression: { sequentialLevels: true },
    },
    loading: false,
  }),
}));

describe('Sidebar serve mode (showMaker)', () => {
  const baseProps = {
    currentView: View.Player,
    onNavigate: vi.fn(),
    isCollapsed: false,
    onToggle: vi.fn(),
  };

  it('hides the Maker nav item when showMaker is false', () => {
    render(<Sidebar {...baseProps} showMaker={false} />);
    expect(screen.queryByText('sidebar.maker')).not.toBeInTheDocument();
    expect(screen.getByText('sidebar.player')).toBeInTheDocument();
    expect(screen.getByText('sidebar.settings')).toBeInTheDocument();
    expect(screen.getByText('sidebar.help')).toBeInTheDocument();
  });

  it('shows the Maker nav item by default (v1 behavior)', () => {
    render(<Sidebar {...baseProps} />);
    expect(screen.getByText('sidebar.maker')).toBeInTheDocument();
  });
});
