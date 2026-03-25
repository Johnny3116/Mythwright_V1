import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@engine': path.resolve(__dirname, 'src/engine'),
      '@network': path.resolve(__dirname, 'src/network'),
      '@drivers': path.resolve(__dirname, 'src/drivers'),
      '@views': path.resolve(__dirname, 'src/views'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@context': path.resolve(__dirname, 'src/context'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@compiler': path.resolve(__dirname, 'src/compiler'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/engine/**'],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          peer: ['peerjs'],
          engine: [
            'src/engine/GameEngine.js',
            'src/engine/CombatResolver.js',
            'src/engine/DiceSystem.js',
            'src/engine/BehaviorTree.js',
          ],
        },
      },
    },
    target: 'es2020',
    sourcemap: false,
    minify: 'terser',
  },
})
