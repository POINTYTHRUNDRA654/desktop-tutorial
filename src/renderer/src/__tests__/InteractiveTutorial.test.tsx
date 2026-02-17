import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock speakMossy to avoid using Speech APIs during tests
vi.mock('../mossyTts', () => ({
  speakMossy: vi.fn().mockResolvedValue(undefined),
}));

import InteractiveTutorial, { buildTutorialText } from '../InteractiveTutorial';
import { tutorialContexts } from '../tutorialContext';

describe('InteractiveTutorial layout & navigation', () => {
  beforeEach(() => {
    // Ensure a consistent localStorage state
    localStorage.clear();
    // Disable voice so speakMossy isn't triggered by default checks in some flows
    localStorage.setItem('mossy_voice_enabled', 'false');
  });

  it('renders a constrained scroll container (min-h-0) and Next Step footer is reachable', async () => {
    render(
      <MemoryRouter initialEntries={["/tutorial"]}>
        <InteractiveTutorial onComplete={() => {}} onSkip={() => {}} />
      </MemoryRouter>
    );

    // Root container should be present
    const root = document.querySelector('[data-tutorial-active="true"]');
    expect(root).toBeTruthy();

    // The element that enables inner scrolling must include the `min-h-0` class
    const scrollParent = root?.querySelector('.min-h-0');
    expect(scrollParent).toBeTruthy();

    // There should be an overflow-y-auto region (the content area)
    const contentScroll = root?.querySelector('.overflow-y-auto');
    expect(contentScroll).toBeTruthy();

    // The Next Step button (footer) should be in the document and clickable
    const nextBtn = screen.getByRole('button', { name: /Next Step|Finish Tutorial|Next/i });
    expect(nextBtn).toBeInTheDocument();

    // The image container must be constrained so very large screenshots can't push the footer off-screen
    const heroImg = document.querySelector('img[alt$="screenshot"]') as HTMLImageElement | null;
    expect(heroImg).toBeTruthy();

    // Walk up the DOM from the image to ensure a parent has a max-height constraint
    let wrapper: Element | null = heroImg?.parentElement ?? null;
    while (wrapper && !/max-h-/.test(wrapper.className)) {
      wrapper = wrapper.parentElement;
    }

    expect(wrapper).toBeTruthy();
    expect(heroImg?.className).toContain('max-h-full');

    // Click the Next Step button and confirm the tutorial advances to step 2
    await userEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText(/Step\s+2\s+of/i)).toBeInTheDocument();
    });
  });

  it('hides API key setup instructions when keys are preconfigured in the build (unit)', async () => {
    // Unit-test the text builder directly to avoid navigating to that step
    const settingsContext = tutorialContexts['settings'];

    const withoutPackaged = buildTutorialText(settingsContext, 0, false);
    expect(/Enter your OpenAI API key/i.test(withoutPackaged)).toBeTruthy();

    const withPackaged = buildTutorialText(settingsContext, 0, true);
    // No API-key guidance or provider mentions should appear in packaged builds
    expect(/Enter your OpenAI API key/i.test(withPackaged)).toBeFalsy();
    expect(/(API key|OpenAI|openai|Groq|elevenlabs)/i.test(withPackaged)).toBeFalsy();
  });

  it('orders tutorial contexts to follow VISUAL_GUIDE.md when page numbers exist', () => {
    const ordered = getOrderedTutorialContexts(tutorialContexts);
    const nums = ordered.map(c => (c as any).visualGuidePage).filter(n => typeof n === 'number') as number[];
    // ensure the numeric sequence (when present) is non-decreasing
    for (let i = 1; i < nums.length; i++) {
      expect(nums[i]).toBeGreaterThanOrEqual(nums[i - 1]);
    }
  });
});