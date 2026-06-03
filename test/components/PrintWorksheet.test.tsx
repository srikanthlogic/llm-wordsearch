import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import PrintWorksheet from '../../components/PrintWorksheet';
import { I18nProvider } from '../../hooks/useI18n';

vi.mock('html2canvas', () => ({
  default: vi.fn(() => Promise.resolve({ toDataURL: () => 'data:image/png;base64,abc' })),
}));
vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    internal: { pageSize: { getWidth: () => 8.5, getHeight: () => 11 } },
    addPage: vi.fn(),
    addImage: vi.fn(),
    save: vi.fn(),
  })),
}));

const translations: Record<string, Record<string, string>> = {
  en: {
    'worksheet.preview': 'Preview',
    'worksheet.back': 'Back',
    'worksheet.downloadPDF': 'Download PDF',
    'worksheet.generatingPDF': 'Generating PDF...',
    'worksheet.generating': 'Generating...',
    'worksheet.error.pdf': 'Error generating PDF',
    'worksheet.level': 'Level',
    'worksheet.find': 'Find',
    'worksheet.answerKey': 'Answer Key',
  },
};

const originalFetch = global.fetch;
beforeEach(() => {
  global.fetch = vi.fn((url: any) => {
    const match = String(url).match(/\/locales\/([^.]+)\.json/);
    const lang = match ? match[1] : 'en';
    return Promise.resolve({
      ok: true,
      json: async () => translations[lang] || translations.en,
    } as Response);
  }) as any;
  const portal = document.createElement('div');
  portal.id = 'portal-root';
  document.body.appendChild(portal);
});

afterEach(() => {
  global.fetch = originalFetch;
  const portal = document.getElementById('portal-root');
  if (portal) document.body.removeChild(portal);
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider>{children}</I18nProvider>
);

const mockGame = {
  id: 'g1',
  theme: 'Animals',
  language: 'en',
  levels: [
    {
      level: 1,
      gridSize: 6,
      words: [
        { word: 'CAT', hint: 'meow' },
        { word: 'DOG', hint: 'woof' },
      ],
    },
  ],
};

describe('PrintWorksheet', () => {
  it('should call onBack when back button is clicked', async () => {
    const onBack = vi.fn();
    render(<PrintWorksheet game={mockGame} onBack={onBack} />, { wrapper });
    await waitFor(() => {
      expect(screen.getAllByText('Animals').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByText('Back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('should call PDF save with theme name as filename', async () => {
    const JsPDF = (await import('jspdf')).default as any;
    const saveMock = vi.fn();
    JsPDF.mockImplementation(() => ({
      internal: { pageSize: { getWidth: () => 8.5, getHeight: () => 11 } },
      addPage: vi.fn(),
      addImage: vi.fn(),
      save: saveMock,
    }));
    render(<PrintWorksheet game={mockGame} onBack={vi.fn()} />, { wrapper });
    await waitFor(() => screen.getByText('Download PDF'));
    fireEvent.click(screen.getByText('Download PDF'));
    await waitFor(() => {
      expect(saveMock).toHaveBeenCalledWith('Animals_worksheet.pdf');
    });
  });

  it('should render printable pages (worksheet + answer key per level)', async () => {
    const multiLevelGame = {
      ...mockGame,
      levels: [
        mockGame.levels[0],
        { level: 2, gridSize: 6, words: [{ word: 'BIRD', hint: 'fly' }] },
      ],
    };
    render(<PrintWorksheet game={multiLevelGame} onBack={vi.fn()} />, { wrapper });
    await waitFor(() => {
      const pages = document.querySelectorAll('.printable-page');
      expect(pages.length).toBe(4); // 2 levels x 2 pages each
    });
  });

  it('should render answer key page for each level', async () => {
    render(<PrintWorksheet game={mockGame} onBack={vi.fn()} />, { wrapper });
    await waitFor(() => {
      expect(screen.getAllByText('Answer Key').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should show error alert when PDF generation fails', async () => {
    const JsPDF = (await import('jspdf')).default as any;
    JsPDF.mockImplementation(() => {
      throw new Error('PDF failure');
    });
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<PrintWorksheet game={mockGame} onBack={vi.fn()} />, { wrapper });
    await waitFor(() => screen.getByText('Download PDF'));
    fireEvent.click(screen.getByText('Download PDF'));
    await waitFor(() => {
      expect(alertMock).toHaveBeenCalled();
    });
    alertMock.mockRestore();
  });
});
