import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const target = process.env.VITE_APP_TARGET || 'main';
  const isCreator = target === 'creator';

  return {
    base: isCreator ? '/creator/' : './',
    plugins: [
      react(),
      tailwindcss(),
    ],
    build: {
      outDir: isCreator ? 'dist/creator' : 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: isCreator
          ? { index: './creator/index.html' }
          : { index: './index.html' }
      },
    },
    server: {
      port: 3000,
      host: true,
    },
    optimizeDeps: {
      include: ['tslib', '@supabase/supabase-js']
    }
  }
})
