# Pomodoro Timer

A focused Pomodoro timer built with **Vue 3**, **TypeScript**, **Vite**, and **Tailwind CSS**.

## Features

- Work → short break → long break cycle with progress dots
- Large retro digital timer
- Start / Pause, Skip, and Reset cycle
- Optional ticking and going-off sounds (`public/*.mp3`)
- Customize durations and background color
- Settings persisted in `localStorage`
- Mobile-friendly layout

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

## Project structure

```
src/
  components/      # Timer UI, settings menu, modals
  composables/     # usePomodoro — timer engine & state
  constants/       # Defaults, presets, sound paths
  types/           # TypeScript types
  utils/           # Audio, storage, time helpers
public/            # Static assets (tick & alarm MP3s)
```
