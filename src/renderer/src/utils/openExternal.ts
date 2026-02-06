export const openExternal = async (url: string): Promise<void> => {
  const anyWindow = window as any;
  const api = anyWindow?.electronAPI ?? anyWindow?.electron?.api ?? anyWindow?.electron;

  if (typeof api?.openExternal === 'function') {
    await api.openExternal(url);
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
};
