import { render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedbackProvider } from '../../components/Feedback';
import { InstanceConfigProvider } from '../../hooks/useInstanceConfig';
import TrophiesView from '../../views/TrophiesView';

vi.mock('../../hooks/useI18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useI18n')>();
  return {
    ...actual,
    useI18n: () => ({
      language: 'en',
      setLanguage: vi.fn(),
      t: (key: string, replacements?: Record<string, string | number>) =>
        replacements && 'domain' in replacements ? `${key}:${replacements.domain}` : key,
    }),
  };
});

vi.mock('../../services/badgeService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/badgeService')>();
  return {
    ...actual,
    loadBadgeState: () => ({
      earned: {
        'first-find': Date.now() - 1000,
        'domain-master-payments': Date.now(),
      },
      counters: { wordsFound: 12, lostLevels: 0, localesPlayed: ['en'], domainsMastered: ['payments'] },
      streak: { current: 1, best: 1 },
    }),
    serializeBadgeShare: actual.serializeBadgeShare,
  };
});

function renderTrophies() {
  const onBack = vi.fn();
  render(
    <InstanceConfigProvider>
      <FeedbackProvider>
        <TrophiesView onBack={onBack} />
      </FeedbackProvider>
    </InstanceConfigProvider>,
  );
  return { onBack };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TrophiesView (#110)', () => {
  it('lists earned badges with synthesized domain-master titles', () => {
    renderTrophies();
    expect(screen.getByText('badge.firstFind.title')).toBeInTheDocument();
    expect(screen.getByText('badge.domainMaster.title:payments')).toBeInTheDocument();
  });

  it('lists locked badges with their conditions', () => {
    renderTrophies();
    expect(screen.getByText('trophies.locked')).toBeInTheDocument();
    expect(screen.getByText('badge.wordHunter.title')).toBeInTheDocument();
    expect(screen.getByText('badge.wordHunter.description')).toBeInTheDocument();
  });

  it('shares a badge link via the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderTrophies();
    screen.getByText('trophies.share').click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const url = writeText.mock.calls[0][0] as string;
    expect(url).toContain('#badges=');
  });
});
