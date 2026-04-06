import React, { useEffect, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock speakMossy to avoid using Speech APIs during tests
vi.mock('../mossyTts', () => ({
  speakMossy: vi.fn().mockResolvedValue(undefined),
}));

// Mock react-joyride to avoid Popper.js referencing `window` inside a
// setTimeout that fires after jsdom teardown, causing an unhandled error.
// The mock renders the first step's content when `run` is true so that
// assertions on step text still work.
vi.mock('react-joyride', () => ({
  __esModule: true,
  default: ({ steps, run }: { steps: Array<{ content: React.ReactNode }>; run: boolean }) => {
    if (!run || !steps?.length) return null;
    return <>{steps[0].content}</>;
  },
  STATUS: { FINISHED: 'finished', SKIPPED: 'skipped' },
  EVENTS: { STEP_BEFORE: 'step:before', STEP_AFTER: 'step:after', TARGET_NOT_FOUND: 'target:notFound' },
}));

import GuidedTour from '../GuidedTour';
import TourLauncher from '../TourLauncher';

describe('GuidedTour - Feature Spotlight', () => {
  beforeEach(() => {
    localStorage.clear();
    // Disable voice so speakMossy isn't triggered by default checks in some flows
    localStorage.setItem('mossy_voice_enabled', 'false');
  });

  it('shows the command-palette step when Feature Spotlight is started', async () => {
    // Lightweight host that mimics App's event wiring for the feature tour
    const Host: React.FC = () => {
      const [open, setOpen] = useState(false);

      useEffect(() => {
        const handler = () => setOpen(true);
        window.addEventListener('start-feature-tour', handler as EventListener);
        return () => window.removeEventListener('start-feature-tour', handler as EventListener);
      }, []);

      return (
        <MemoryRouter>
          {/* Target element that Joyride will attach to */}
          <button data-tour="command-palette-trigger">Command</button>
          <TourLauncher />
          <GuidedTour isOpen={open} onClose={() => setOpen(false)} tourType="feature-spotlight" />
        </MemoryRouter>
      );
    };

    render(<Host />);

    // Click the Feature Spotlight button in the TourLauncher
    const featureBtn = screen.getByRole('button', { name: /Feature Spotlight/i });
    await userEvent.click(featureBtn);

    // Joyride renders with a small delay; wait for the step content to appear
    await waitFor(() => {
      expect(screen.getByText(/New Feature: Enhanced Commands/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});