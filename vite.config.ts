import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'
import { APPLICATION_IDENTITY } from './src/config/applicationIdentity'

export default defineConfig({
  base: process.env.VITE_PUBLIC_URL ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: APPLICATION_IDENTITY.name,
        short_name: APPLICATION_IDENTITY.shortName,
        description: APPLICATION_IDENTITY.description,
        start_url: APPLICATION_IDENTITY.adminPath,
        scope: '/',
        display: 'standalone',
        theme_color: APPLICATION_IDENTITY.themeColor,
        background_color: APPLICATION_IDENTITY.backgroundColor,
        icons: [
          { src: '/icons/cloudecom-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/cloudecom-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/cloudecom-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { navigateFallback: '/index.html', runtimeCaching: [] },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '8443'),
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '8443'),
  },
})
