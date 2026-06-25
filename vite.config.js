import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Загружаем env явно
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    base: './',
    plugins: [react()],
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom']
    },
    server: {
      watch: {
        ignored: [
          '**/backend/**',
          '**/.notes/**',
          '**/extension/**',
          '**/dist/**',
          '**/supabase/**'
        ]
      },
      proxy: {
        // Dev-прокси для Firebase Auth proxy (аналог Vercel Serverless Function)
        // При VITE_BACKEND=firebase запросы к /api/firebase-auth идут сюда
        '/api/firebase-auth': {
          target: 'https://identitytoolkit.googleapis.com',
          changeOrigin: true,
          rewrite: (path) => {
            // /api/firebase-auth?action=signInWithPassword
            // → /v1/accounts:signInWithPassword?key=...
            const url = new URL(path, 'http://localhost');
            const action = url.searchParams.get('action') || '';
            const apiKey = env.VITE_FIREBASE_API_KEY || '';
            return `/v1/accounts:${action}?key=${apiKey}`;
          }
        },
        '/api/firebase-token': {
          target: 'https://securetoken.googleapis.com',
          changeOrigin: true,
          rewrite: (_path) => {
            const apiKey = env.VITE_FIREBASE_API_KEY || '';
            return `/v1/token?key=${apiKey}`;
          }
        },
        '/api/neon-auth': {
          target: 'http://localhost:3001',
          changeOrigin: true
        },
        '/api/neon-query': {
          target: 'http://localhost:3001',
          changeOrigin: true
        },
        '/api/google-calendar-token': {
          target: 'http://localhost:3001',
          changeOrigin: true
        },
        '/api/ai-proxy': {
          target: 'http://localhost:3001',
          changeOrigin: true
        }
      }
    },
    build: {
      target: 'es2020',
      minify: 'terser',
      cssMinify: 'esbuild',
      // Удаление console.log/console.debug из продакшен-билда
      terserOptions: {
        compress: {
          drop_console: ['log', 'debug'],
          drop_debugger: true,
        }
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': ['react', 'react-dom', 'react-router-dom'],
            'supabase': ['@supabase/supabase-js'],
            'docx': ['docxtemplater', 'pizzip', 'file-saver'],
            'xlsx': ['xlsx']
          }
        }
      },
      chunkSizeWarningLimit: 500
    }
  }
})
