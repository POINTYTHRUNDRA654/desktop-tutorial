import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rendererRoot = path.resolve(__dirname, 'src/renderer/src');
const helperRoots = [
  path.resolve(rendererRoot, 'utils'),
  path.resolve(rendererRoot, 'services'),
  path.resolve(rendererRoot, 'LocalAIEngine.ts'),
  path.resolve(rendererRoot, 'MossyTools.ts'),
];

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, './');
  const env = loadEnv(mode, envDir, '');
  const port = Number(env.VITE_DEV_SERVER_PORT || env.DEV_SERVER_PORT || 5174);

  return {
    root: 'src/renderer',
    base: './',
    envDir,
    build: {
      outDir: '../../dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalized = id.replace(/\\/g, '/');

            if (normalized.includes('/node_modules/')) {
              if (normalized.includes('/node_modules/react')) return 'react-vendor';
              if (normalized.includes('/node_modules/lucide-react')) return 'icons';
              if (normalized.includes('/node_modules/openai') || normalized.includes('/node_modules/groq-sdk')) {
                return 'ai-clients';
              }
            }

            const inHelpers = helperRoots.some((root) => normalized.startsWith(root.replace(/\\/g, '/')));
            if (inHelpers) return 'renderer-helpers';

            return undefined;
          },
        },
      },
    },
    server: {
      host: '127.0.0.1',
      port,
      strictPort: true,
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, './src/shared'),
      },
    },
  };
});
