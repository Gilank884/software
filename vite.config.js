import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const target = process.env.VITE_APP_TARGET || 'main';
  const isCreator = target === 'creator';

  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
    ],
    root: '.',
    envDir: '.',
    build: {
      outDir: 'dist',
      emptyOutDir: !isCreator,
      rollupOptions: {
        input: isCreator 
          ? { 'creator/index': 'creator/index.html' } 
          : { index: 'index.html' }
      }
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
