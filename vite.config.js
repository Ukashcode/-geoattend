import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // We removed the extra assets list to prevent 404 errors if you don't have them
      manifest: {
        name: 'GeoAttend',
        short_name: 'GeoAttend',
        description: 'Geo-Fenced Attendance System',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', // This makes it look like a real app
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png', // Note the slash at the start
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png', // Note the slash at the start
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})