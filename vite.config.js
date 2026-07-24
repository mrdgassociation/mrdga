import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest', // 🎯 आपली स्वतःची firebase-messaging-sw.js वापरण्यासाठी हे आवश्यक आहे
      srcDir: 'public',
      filename: 'firebase-messaging-sw.js',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: true // 🧪 Local Dev Mode वर PWA टेस्ट करण्यासाठी
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
  base: '/mrdga/', // GitHub Repository चे नाव
})