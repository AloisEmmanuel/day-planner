import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

// APK link is derived from the repo name (GitHub Actions or Vercel Git env); empty when unknown.
const repo = process.env.GITHUB_REPOSITORY ||
  (process.env.VERCEL_GIT_REPO_OWNER ? `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}` : '')
const APK_URL = repo ? `https://github.com/${repo}/releases/download/android-latest/day-planner.apk` : ''

// Tailwind is configured inline to keep the file count low.
export default defineConfig({
  base: './',
  define: { __APK_URL__: JSON.stringify(APK_URL) },
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          content: ['./index.html', './src/**/*.{js,jsx}'],
          darkMode: 'class',
          theme: {
            extend: {
              colors: { ink: '#0b1020', panel: '#141b2e', line: '#26304a' },
              fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] }
            }
          }
        }),
        autoprefixer()
      ]
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Day Planner',
        short_name: 'Planner',
        description: 'Free, local-only daily schedule.',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0b1020',
        background_color: '#0b1020',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png}'], navigateFallback: 'index.html' }
    })
  ]
})
