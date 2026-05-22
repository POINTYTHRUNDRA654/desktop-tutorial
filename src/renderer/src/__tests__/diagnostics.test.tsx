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

    // after click, a loader with the spin animation should be rendered
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });
});
