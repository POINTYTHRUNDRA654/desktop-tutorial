import * as matchers from '@testing-library/jest-dom/matchers';

if (typeof expect !== 'undefined' && typeof expect.extend === 'function') {
  expect.extend(matchers);
}

// Many tests run in jsdom, but some (BridgeServer) use the `node` environment
// where `window` is not defined.  Guard all window-based mocks so the file
// can be imported regardless of environment.
if (typeof window !== 'undefined') {
  // Mock localStorage for jsdom environment
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value.toString(); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
      get length() { return Object.keys(store).length; },
      key: (index: number) => Object.keys(store)[index] || null,
    };
  })();

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  Object.defineProperty(window, 'sessionStorage', {
    value: localStorageMock,
    writable: true,
  });

  // Mock window.electronAPI for testing
  Object.defineProperty(window, 'electronAPI', {
    value: {
      mining: {
        startEngine: vi.fn(),
        stopEngine: vi.fn(),
        getEngineStatus: vi.fn(),
        getEngineResults: vi.fn(),
        configureEngine: vi.fn(),
        startAllEngines: vi.fn(),
        stopAllEngines: vi.fn(),
        refreshAllEngines: vi.fn()
      },
      // CellEditor API mocks
      loadCell: vi.fn(),
      saveCell: vi.fn(),
      createCell: vi.fn(),
      placeObject: vi.fn(),
      moveObject: vi.fn(),
      deleteObject: vi.fn(),
      duplicateObject: vi.fn(),
      generateNavmesh: vi.fn(),
      editNavmesh: vi.fn(),
      finalizeNavmesh: vi.fn(),
      placeLight: vi.fn(),
      bakeAO: vi.fn(),
      generateCollision: vi.fn(),
      generateOcclusionPlanes: vi.fn(),
      createCombinedMesh: vi.fn(),

      // AudioEditor API mocks
      audioEditor: {
        convertToXWM: vi.fn(),
        convertToFUZ: vi.fn(),
        batchConvertAudio: vi.fn(),
        generateLipSync: vi.fn(),
        phonemeAnalysis: vi.fn(),
        createMusicTrack: vi.fn(),
        setMusicConditions: vi.fn(),
        createMusicPlaylist: vi.fn(),
        createSoundDescriptor: vi.fn(),
        set3DAttenuation: vi.fn(),
        playAudio: vi.fn(),
        stopAudio: vi.fn(),
        createAmbientSound: vi.fn(),
        normalizeVolume: vi.fn(),
        removeNoise: vi.fn(),
        applyEffect: vi.fn(),
      },
    },
    writable: true
  });

  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));