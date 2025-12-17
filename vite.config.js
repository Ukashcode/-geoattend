import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'GeoAttend System', // <--- Changed slightly to force update
        short_name: 'GeoAttend',
        description: 'Geo-Fenced Attendance System',
        theme_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png', // <--- MUST HAVE THE SLASH /
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png', // <--- MUST HAVE THE SLASH /
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})