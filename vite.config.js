import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'firebase-messaging-sw.js',
      swDest: 'dist/firebase-messaging-sw.js',
      injectRegister: 'auto',
      registerType: 'autoUpdate',
      injectManifest: {
        injectionPoint: undefined // 🎯 Custom Firebase SW असल्यास Manifest Injection Warning Bypass करण्यासाठी
      },
      devOptions: {
        enabled: true
      },
      includeAssets: [
        'favicon.ico', 
        'apple-touch-icon.png', 
        'pwa-192x192.png', 
        'pwa-512x512.png', 
        'mrdga-logo.png'
      ],
      manifest: {
        name: 'MRDGA Official Portal',
        short_name: 'MRDGA',
        description: 'Maharashtra Rajya Dahi Handi Govinda Association',
        theme_color: '#030D26',
        background_color: '#030D26',
        display: 'standalone',
        start_url: '/mrdga/#/',
        scope: '/mrdga/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  base: '/mrdga/',
})