import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  },
  server: {
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173
    },
    watch: {
      ignored: [
        '**/backend/**',
        '**/.notes/**',
        '**/extension/**',
        '**/dist/**',
        '**/supabase/**'
      ]
    }
  },
  build: {
    target: 'esnext',
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
})
