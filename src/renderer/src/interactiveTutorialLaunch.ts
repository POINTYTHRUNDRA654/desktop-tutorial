export interface InteractiveTutorialLauncherOptions {
  getIsFirstRunActive: () => boolean;
  getCurrentHash: () => string;
  showOverlay: () => void;
  persistReturnHash: (hash: string) => void;
  navigateToTutorial: () => void;
}

export const resolveInteractiveTutorialReturnHash = (currentHash: string): string => {
  if (!currentHash) return '#/';
  return currentHash.startsWith('#/tutorial') ? '#/' : currentHash;
};

export const createInteractiveTutorialLauncher = ({
  getIsFirstRunActive,
  getCurrentHash,
  showOverlay,
  persistReturnHash,
  navigateToTutorial,
}: InteractiveTutorialLauncherOptions) => {
  return () => {
    if (getIsFirstRunActive()) {
      showOverlay();
      return;
    }

    const returnHash = resolveInteractiveTutorialReturnHash(getCurrentHash());
    persistReturnHash(returnHash);
    navigateToTutorial();
  };
};
