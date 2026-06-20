import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync, unlinkSync, rmdirSync, writeFileSync } from 'fs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const target = process.env.VITE_APP_TARGET || 'main';
  const isCreator = target === 'creator';
  const isWeb = process.env.VITE_DEPLOY === 'web';

  const moveCreatorHtml = () => ({
    name: 'move-creator-html',
    writeBundle(options) {
      if (!isCreator) return;
      const src = `${options.dir}/creator/index.html`;
      const dest = `${options.dir}/index.html`;
      copyFileSync(src, dest);
      unlinkSync(src);
      try { rmdirSync(`${options.dir}/creator`); } catch {}
      writeFileSync(`${options.dir}/_redirects`, '/*  /index.html  200\n');
    }
  });

  return {
    base: isCreator ? '/' : isWeb ? '/' : './',
    plugins: [
      react(),
      tailwindcss(),
      moveCreatorHtml(),
    ],
    root: '.',
    envDir: '.',
    build: {
      outDir: isCreator ? 'dist-creator' : 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: isCreator
          ? { index: 'creator/index.html' }
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
