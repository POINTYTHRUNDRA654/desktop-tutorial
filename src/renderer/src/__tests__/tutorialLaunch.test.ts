import { describe, expect, it, vi } from 'vitest';

import {
  createInteractiveTutorialLauncher,
  resolveInteractiveTutorialReturnHash,
} from '../tutorialLaunch';

describe('tutorialLaunch', () => {
  it('opens the overlay when first-run becomes active after the launcher is created', () => {
    let isFirstRunActive = false;
    const showOverlay = vi.fn();
    const persistReturnHash = vi.fn();
    const navigateToTutorial = vi.fn();

    const launchTutorial = createInteractiveTutorialLauncher({
      getIsFirstRunActive: () => isFirstRunActive,
      getCurrentHash: () => '#/guided-tours',
      showOverlay,
      persistReturnHash,
      navigateToTutorial,
    });

    launchTutorial();
    expect(showOverlay).not.toHaveBeenCalled();
    expect(persistReturnHash).toHaveBeenCalledWith('#/guided-tours');
    expect(navigateToTutorial).toHaveBeenCalledTimes(1);

    isFirstRunActive = true;
    launchTutorial();

    expect(showOverlay).toHaveBeenCalledTimes(1);
    expect(persistReturnHash).toHaveBeenCalledTimes(1);
    expect(navigateToTutorial).toHaveBeenCalledTimes(1);
  });

  it('normalizes tutorial routes back to the home hash', () => {
    expect(resolveInteractiveTutorialReturnHash('')).toBe('#/');
    expect(resolveInteractiveTutorialReturnHash('#/tutorial')).toBe('#/');
    expect(resolveInteractiveTutorialReturnHash('#/tutorial/step-3')).toBe('#/');
    expect(resolveInteractiveTutorialReturnHash('#/chat')).toBe('#/chat');
  });
});
