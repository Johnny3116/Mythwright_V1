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
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@scene3d': path.resolve(__dirname, 'src/scene3d'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    // Engine and network tests use Node built-ins (fs, path) — run in node env.
    // Component/view tests keep jsdom for DOM APIs.
    environmentMatchGlobs: [
      ['tests/engine/**', 'node'],
      ['tests/network/**', 'node'],
    ],
    env: {
      NODE_ENV: 'test',
    },
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
        // Use function form so Rollup can match against resolved absolute module IDs
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) return 'vendor';
          if (id.includes('node_modules/peerjs') || id.includes('node_modules/webrtc-adapter')) return 'peer';
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) return 'three';
          if (id.includes('/src/engine/')) return 'engine';
        },
      },
    },
    target: 'es2020',
    sourcemap: false,
    minify: 'terser',
  },
})
