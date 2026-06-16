import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import DiagnosticTools from '../DiagnosticTools';
import { Toaster } from 'react-hot-toast';
import { MemoryRouter } from 'react-router-dom';

// small helper to mount with router context since component uses links
const renderWithRouter = (ui: React.ReactElement) =>
  render(ui, { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> });


describe('Diagnostics UI', () => {
  test('clicking run button starts diagnostics and shows toast', async () => {
    renderWithRouter(
      <>
        <Toaster />
        <DiagnosticTools />
      </>
    );

    const runButton = screen.getByRole('button', { name: /Run All Checks/i });
    await userEvent.click(runButton);

    // toast text should appear (multiple instances may be generated)
    const toasts = await screen.findAllByText(/Running diagnostics/i);
    expect(toasts.length).toBeGreaterThan(0);

    // Most checks resolve synchronously in this test environment (no real
    // electron API / permissions API to await), so the transient per-item
    // "checking" spinner isn't a reliable signal here. Instead confirm the
    // run actually started: every check left its initial "idle" indicator.
    await waitFor(() => {
      expect(document.querySelectorAll('.bg-slate-600').length).toBe(0);
    });
  });
});
