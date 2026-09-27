import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Sidebar from '../../components/Sidebar';
import { I18nProvider } from '../../hooks/useI18n';
import { InstanceConfigProvider } from '../../hooks/useInstanceConfig';
import { InstanceMode, View } from '../../types';

const i18nPayload = {
  'sidebar.titleShort': 'WordKey',
  'sidebar.titleLong': 'WordKey',
  'sidebar.maker': 'Maker',
  'sidebar.player': 'Player',
  'sidebar.settings': 'Settings',
  'sidebar.help': 'Help',
  'sidebar.expand': 'Expand',
  'sidebar.collapse': 'Collapse',
  'sidebar.homeAria': 'Home',
  'sidebar.expandAria': 'Expand sidebar',
  'sidebar.collapseAria': 'Collapse sidebar',
};

function renderSidebar(config: object) {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('wordkey.config.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(config) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(i18nPayload) });
  }) as any;
  return render(
    <InstanceConfigProvider>
      <I18nProvider>
        <Sidebar
          currentView={View.Player}
          onNavigate={() => {}}
          isCollapsed={false}
          onToggle={() => {}}
        />
      </I18nProvider>
    </InstanceConfigProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Sidebar instance identity', () => {
  it('shows config title and owner byline when configured', async () => {
    renderSidebar({
      mode: InstanceMode.Serve,
      title: 'WordKey — cashlessconsumer',
      owner: 'Srikanth',
    });
    expect(await screen.findByText('WordKey — cashlessconsumer')).toBeInTheDocument();
    expect(screen.getByText('Srikanth')).toBeInTheDocument();
  });

  it('keeps the v1 header and no byline when unconfigured', async () => {
    renderSidebar({ mode: InstanceMode.Author });
    expect(await screen.findByText('WordKey')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Srikanth')).not.toBeInTheDocument());
  });
});
