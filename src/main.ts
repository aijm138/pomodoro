import { createApp } from 'vue'
import App from './App.vue'
import './assets/fonts.css'
import './assets/main.css'
import { registerSW } from 'virtual:pwa-register'

// Register service worker for offline use after install.
// autoUpdate + periodic check keeps the installed app current when online.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    // Check for updates about once an hour while the tab is open
    const hour = 60 * 60 * 1000
    window.setInterval(() => {
      void registration.update()
    }, hour)
  },
  onOfflineReady() {
    // App shell + assets are cached; fully usable without network
    if (import.meta.env.DEV) {
      console.info('[PWA] Offline ready')
    }
  },
  onRegisterError(error) {
    console.warn('[PWA] Service worker registration failed:', error)
  },
})

createApp(App).mount('#app')
