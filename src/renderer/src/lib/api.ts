// API stub — real IPC calls go through window.electron.api
export const api = {
  game: {
    getStatus: async () => ({}),
    sendConsoleCommand: async (_cmd: string) => ({ success: false, output: '' }),
    loadSaveGame: async (_path: string) => null,
    getPerformanceStream: async () => null,
  },
};
