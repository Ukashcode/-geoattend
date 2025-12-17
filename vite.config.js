import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'GeoAttend',
        short_name: 'GeoAttend',
        description: 'Geo-Fenced Attendance System',
        theme_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png', // <--- SLASH GOES HERE IN THE CODE
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png', // <--- SLASH GOES HERE IN THE CODE
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})