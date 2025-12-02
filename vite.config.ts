import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Preeche process.env.API_KEY com a variável de ambiente do Vercel
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  };
});