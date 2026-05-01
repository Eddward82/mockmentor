import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: 'localhost'
    },
    plugins: [react(), tailwindcss()],
    define: {
      // Cloud Functions base URL — used by services/aiApi.ts in dev/emulator mode.
      // In production, aiApi.ts falls back to the hardcoded project URL.
      'import.meta.env.VITE_FUNCTIONS_BASE_URL': JSON.stringify(env.VITE_FUNCTIONS_BASE_URL || ''),
      'import.meta.env.VITE_RECAPTCHA_SITE_KEY': JSON.stringify(env.VITE_RECAPTCHA_SITE_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.')
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            charts: ['recharts']
          }
        }
      }
    }
  };
});
