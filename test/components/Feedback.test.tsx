import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { FeedbackProvider, useFeedback } from '../../components/Feedback';

const ToastHarness: React.FC<{ message?: string; variant?: 'success' | 'error' | 'info' }> = ({ message = 'Saved!', variant }) => {
  const { toast } = useFeedback();
  return (
    <button onClick={() => toast(message, variant)}>fire-toast</button>
  );
};

const ConfirmHarness: React.FC<{ onResult: (v: boolean) => void; danger?: boolean }> = ({ onResult, danger }) => {
  const { confirm } = useFeedback();
  return (
    <button
      onClick={async () => {
        const result = await confirm({
          title: 'Delete this game?',
          message: 'This action cannot be undone.',
          confirmLabel: 'Delete',
          cancelLabel: 'Keep it',
          danger,
        });
        onResult(result);
      }}
    >
      ask-confirm
    </button>
  );
};

describe('Feedback', () => {
  it('throws when useFeedback is used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ToastHarness />)).toThrow('useFeedback must be used within a FeedbackProvider');
    spy.mockRestore();
  });

  it('renders a toast with the given message and dismisses it', async () => {
    const user = userEvent.setup();
    render(<FeedbackProvider><ToastHarness message='Copied link' /></FeedbackProvider>);

    await user.click(screen.getByText('fire-toast'));
    expect(screen.getByRole('status')).toHaveTextContent('Copied link');

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('auto-dismisses toasts after the timeout', async () => {
    vi.useFakeTimers();
    try {
      const { fireEvent } = await import('@testing-library/react');
      render(<FeedbackProvider><ToastHarness /></FeedbackProvider>);
      act(() => {
        fireEvent.click(screen.getByText('fire-toast'));
      });
      expect(screen.getByRole('status')).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(4500);
      });
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('confirm resolves true when confirm button clicked', async () => {
    const onResult = vi.fn();
    const user = userEvent.setup();
    render(<FeedbackProvider><ConfirmHarness onResult={onResult} danger /></FeedbackProvider>);

    await user.click(screen.getByText('ask-confirm'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Delete this game?');

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('confirm resolves false on cancel and Escape', async () => {
    const onResult = vi.fn();
    const user = userEvent.setup();
    render(<FeedbackProvider><ConfirmHarness onResult={onResult} /></FeedbackProvider>);

    await user.click(screen.getByText('ask-confirm'));
    await user.click(screen.getByRole('button', { name: 'Keep it' }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));

    await user.click(screen.getByText('ask-confirm'));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(onResult).toHaveBeenCalledTimes(2));
    expect(onResult).toHaveBeenLastCalledWith(false);
  });
});
