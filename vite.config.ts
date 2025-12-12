import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react-quill'],
  },
  build: {
    outDir: 'frontend',
    emptyOutDir: true,
    // Enable source maps for debugging (optional, remove in production)
    sourcemap: false,
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Improved code splitting strategy
        manualChunks: (id) => {
          // Vendor chunks - split by package type
          if (id.includes('node_modules')) {
            // React core libraries
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }

            // Icons library (can be large)
            if (id.includes('lucide-react')) {
              return 'icons';
            }

            // Rich text editor (heavy dependency)
            if (id.includes('react-quill') || id.includes('quill')) {
              return 'editor';
            }

            // AI SDKs (only loaded when needed)
            if (id.includes('@anthropic-ai/sdk')) {
              return 'ai-anthropic';
            }

            if (id.includes('openai')) {
              return 'ai-openai';
            }

            // Supabase SDK
            if (id.includes('@supabase')) {
              return 'supabase';
            }

            // Other vendor code
            return 'vendor';
          }

          // Split large app sections
          if (id.includes('/components/dashboard/')) {
            return 'dashboard';
          }

          if (id.includes('/components/admin/')) {
            return 'admin';
          }

          if (id.includes('/components/onboarding/')) {
            return 'onboarding';
          }

          if (id.includes('/components/pages/')) {
            return 'pages';
          }
        },
        // Optimize asset file names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.');
          const ext = info?.[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `assets/images/[name]-[hash][extname]`;
          } else if (/woff|woff2/.test(ext || '')) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    // Enable minification
    minify: 'esbuild',
    // Target modern browsers for smaller bundles
    target: 'es2015',
  },
});
