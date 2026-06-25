import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import mkcert from 'vite-plugin-mkcert'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY_TARGET

  return {
    base: '/',
    plugins: [
      vue(),
      vueDevTools(),
      process.env.HTTPS ? mkcert() : undefined,
    ],
    build: {
      target: 'esnext'
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    publicDir: './public',
    server: {
      host: true,
      proxy: apiTarget
        ? { '/api': { target: apiTarget, changeOrigin: true } }
        : undefined,
    },
  }
})
