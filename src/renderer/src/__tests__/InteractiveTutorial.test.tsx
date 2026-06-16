import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Mock speakMossy to avoid using Speech APIs during tests
vi.mock('../mossyTts', () => ({
  speakMossy: vi.fn().mockResolvedValue(undefined),
}));

import InteractiveTutorial, { buildTutorialText, getOrderedTutorialContexts } from '../InteractiveTutorial';
import { tutorialContexts } from '../tutorialContext';

describe('InteractiveTutorial layout & navigation', () => {
  beforeEach(() => {
    // Ensure a consistent localStorage state
    localStorage.clear();
    // Disable voice so speakMossy isn't triggered by default checks in some flows
    localStorage.setItem('mossy_voice_enabled', 'false');
    // Ensure top-level Pip‑Boy flag isn't left set by other tests
    document.body.classList.remove('pip-boy-mode');
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

  it('uses a smaller visual guide height for the AI (chat) page', async () => {
    // 'first-success' is intentionally NOT a standalone ordered tutorial step
    // anymore - it lives inside Journey Hub (page 4) instead, so it's excluded
    // from getOrderedTutorialContexts() by design (no visualGuidePage set).
    const ordered = getOrderedTutorialContexts(tutorialContexts);
    const chatIndex = ordered.findIndex((c) => c.pageId === 'ai-chat');
    expect(chatIndex).toBeGreaterThanOrEqual(0);
    expect(ordered.findIndex((c) => c.pageId === 'first-success')).toBe(-1);

    const chatStep = 1 + chatIndex; // +1 for the initial welcome step

    // Render the tutorial directly at the AI Chat step by restoring saved progress
    localStorage.setItem('mossy_tutorial_step', chatStep.toString());
    const { unmount } = render(
      <MemoryRouter initialEntries={["/tutorial"]}>
        <InteractiveTutorial onComplete={() => {}} onSkip={() => {}} />
      </MemoryRouter>
    );

    // Confirm we're on the expected page and the visual guide uses the reduced max-height
    await waitFor(() => expect(document.body.textContent).toContain('AI Chat'));

    const heroImg = document.querySelector('img[alt$="screenshot"]') as HTMLImageElement | null;
    expect(heroImg).toBeTruthy();
    let wrapper: Element | null = heroImg?.parentElement ?? null;
    while (wrapper && !/max-h-/.test(wrapper.className)) wrapper = wrapper.parentElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper?.className).toContain('max-h-[30vh]');

    // Now assert the even-more-compact sizing when Pip‑Boy frame is active
    unmount();
    document.body.classList.add('pip-boy-mode');
    localStorage.setItem('mossy_pip_mode', 'true');

    // Sanity checks for test environment (must be true for the component to detect Pip‑Boy)
    expect(document.body.classList.contains('pip-boy-mode')).toBe(true);
    expect(localStorage.getItem('mossy_pip_mode')).toBe('true');

    // Chat step inside Pip‑Boy
    localStorage.setItem('mossy_tutorial_step', chatStep.toString());
    const { unmount: unmount2 } = render(
      <MemoryRouter initialEntries={["/tutorial"]}>
        <InteractiveTutorial onComplete={() => {}} onSkip={() => {}} testPipMode={true} />
      </MemoryRouter>
    );
    await waitFor(() => expect(document.body.textContent).toContain('AI Chat'));

    // ensure global flags remain set after render
    expect(document.body.classList.contains('pip-boy-mode')).toBe(true);
    expect(localStorage.getItem('mossy_pip_mode')).toBe('true');

    const pipHeroImg = document.querySelector('img[alt$="screenshot"]') as HTMLImageElement | null;
    expect(pipHeroImg).toBeTruthy();
    let pipWrapper: Element | null = pipHeroImg?.parentElement ?? null;
    while (pipWrapper && !/max-h-/.test(pipWrapper.className)) pipWrapper = pipWrapper.parentElement;
    expect(pipWrapper).toBeTruthy();
    // component should detect pip mode (these four should be consistent)
    expect(pipWrapper?.getAttribute('data-prop-test-pip')).toBe('true');
    expect(pipWrapper?.getAttribute('data-pip-mode')).toBe('true');
    expect(pipWrapper?.getAttribute('data-body-pip')).toBe('true');
    expect(pipWrapper?.getAttribute('data-local-pip')).toBe('true');
    expect(pipWrapper?.className).toContain('max-h-[26vh]');
    unmount2();

    // Cleanup
    document.body.classList.remove('pip-boy-mode');
    localStorage.removeItem('mossy_pip_mode');
  });

  it('hides API key setup instructions when keys are preconfigured in the build (unit)', async () => {
    // Unit-test the text builder directly to avoid navigating to that step
    const settingsContext = tutorialContexts['settings'];

    const withoutPackaged = buildTutorialText(settingsContext, 0, false);
    // Settings features mention "Groq primary model" which is an API-key-gated provider
    expect(/Groq/i.test(withoutPackaged)).toBeTruthy();

    const withPackaged = buildTutorialText(settingsContext, 0, true);
    // No API-key guidance or provider mentions should appear in packaged builds
    expect(/Enter your OpenAI API key/i.test(withPackaged)).toBeFalsy();
    expect(/(API key|OpenAI|openai|Groq)/i.test(withPackaged)).toBeFalsy();
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
