# Pomodoro Timer

A focused Pomodoro timer built with **Vue 3**, **TypeScript**, **Vite**, and **Tailwind CSS**. Installable as an **offline PWA** on Android, iOS, and desktop.

## Features

- Work → short break → long break cycle with progress dots
- Large retro digital timer
- Start / Pause, Skip, and Reset cycle
- Optional ticking and going-off sounds (`public/*.mp3`)
- Customize durations and background color
- Settings persisted in `localStorage`
- Mobile-friendly layout
- **Offline PWA** — install once, use without internet (service worker + cached assets, self-hosted fonts)

## Setup

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Scripts

| Command           | Description                     |
| ----------------- | ------------------------------- |
| `npm run dev`     | Dev server with hot reload      |
| `npm run build`   | Type-check + production build   |
| `npm run preview` | Preview the production build    |

## Install as a PWA (offline)

1. Build and serve over **HTTPS** (or `localhost`):

   ```bash
   npm run build
   npm run preview
   ```

2. Open the app in a supported browser and install:

   | Platform | How to install |
   | -------- | -------------- |
   | **Android (Chrome)** | Menu → **Install app** / **Add to Home screen** |
   | **iOS (Safari)** | Share → **Add to Home Screen** |
   | **Desktop (Chrome / Edge)** | Address bar install icon, or Menu → **Install Pomodoro Timer** |
   | **Desktop (Firefox)** | Menu → **Install** when offered |

3. After install, open the app from the home screen / app launcher. It runs in standalone mode and works **without network** (timer, settings, sounds, fonts are all cached).

**Notes**

- First visit must be online once so the service worker can cache the app shell, JS/CSS, fonts, icons, and MP3s.
- Updates apply automatically when you are online again (`registerType: autoUpdate`).
- iOS uses “Add to Home Screen” (no Chrome-style install prompt). Serve over HTTPS in production.

## Project structure

```
src/
  components/      # Timer UI, settings menu, modals
  composables/     # usePomodoro — timer engine & state
  constants/       # Defaults, presets, sound paths
  types/           # TypeScript types
  utils/           # Audio, storage, time helpers
  assets/fonts/    # Self-hosted DM Sans + VT323 (offline)
public/
  icons/           # PWA / apple-touch icons
  *.mp3            # Tick & alarm sounds
```
