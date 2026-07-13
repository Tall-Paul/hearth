# Hearth

A 10-foot TV / big-screen media & launcher interface for Windows. Built to run on a
PC wired to a 50" screen: browse and play local films/TV from a shared drive, launch
streaming apps (Netflix, Prime, GeForce Now, …), and search Sonarr/Radarr to add new
media — all navigable by remote, gamepad, keyboard, mouse, or your phone.

> Working name — rename freely (`package.json` `name`, the 🔥 logo/title).

## Stack

- **Electron** (main + preload) — window/kiosk, app launching, filesystem scan, Sonarr/Radarr proxy, mpv control, phone-remote server
- **React + TypeScript + Vite** (renderer) — the 10-foot UI
- **[electron-vite](https://electron-vite.org/)** — build/dev tooling
- **[norigin-spatial-navigation](https://github.com/NoriginMedia/Norigin-Spatial-Navigation)** — D-pad/arrow focus movement
- **mpv** — local playback (controlled over its JSON IPC named pipe)
- **express + ws** — the companion phone remote

## Prerequisites

- **Node.js** (installed on the host — an Electron GUI dev loop can't run in a container)
- **[mpv](https://mpv.io/installation/)** for local playback. Put `mpv.exe` on `PATH`, or set its
  full path in **Settings → Playback**. (Streaming apps and Sonarr/Radarr search work without mpv.)

## Getting started

```bash
npm install
npm run dev      # launches Electron with HMR
```

Build / package:

```bash
npm run build    # bundles main, preload, renderer into ./out
npm run dist      # build + electron-builder installer (configure targets first)
```

### Dev on a desktop (not the TV)

- `set HEARTH_WINDOWED=1` (PowerShell: `$env:HEARTH_WINDOWED=1`) launches a normal window instead of fullscreen kiosk.
- `HEARTH_CAPTURE=path\to.png` snapshots the rendered UI to a PNG and exits — handy for CI/screenshots.

> **Gotcha:** if your shell has `ELECTRON_RUN_AS_NODE=1` set, Electron runs as plain Node and
> the app crashes with `Cannot read properties of undefined (reading 'whenReady')`. Clear it before launching.

## Configuration

Everything is editable in-app under **Admin** (gear icon), stored at
`%APPDATA%\hearth\hearth-config.json` (also logs to `%APPDATA%\hearth\hearth.log`).

- **Local playback (mpv)** — the Admin page detects whether mpv is installed and shows its
  version/path. If missing, **Install mpv** runs `winget install shinchiro.mpv` for you (a UAC
  prompt may appear), **Re-check** re-detects, and **Get mpv manually** opens mpv.io. A detected
  path is saved automatically so playback just works.
- **Media folders** — one per line, e.g. `Z:\Movies`, `Z:\TV`. The scanner walks these,
  parses movie/episode titles, and populates the Library + "Recently added".
- **Sonarr / Radarr** — base URL + API key (find the key in each app's *Settings → General*).
  Use **Test** to verify. Discover search hits both; pressing OK on a result adds it
  (uses the first root folder + quality profile on that service).
- **Tiles** — checkboxes to enable/disable each app tile (Netflix, Prime, GeForce Now, Minecraft…)
  on Home and the Apps screen.
- **Playback & remote** — mpv path override, phone-remote port, fullscreen on/off.

## Controls

| Input | Navigate | Select | Back | Home | Play/Pause | Seek |
|-------|----------|--------|------|------|-----------|------|
| Keyboard / IR remote | Arrows | Enter | Esc / Backspace | — | — | — |
| Gamepad | D-pad / L-stick | A | B | Y | X | LB / RB |
| Phone | on-screen D-pad | OK | Back | Home | ⏯ | «/» |
| Mouse | hover | click | — | — | on-screen | on-screen |

**Phone remote:** open the URL shown in **Settings** (e.g. `http://<pc-ip>:842`) on any
phone on the same network. It gives you a D-pad, playback controls, and a **text search box**
that jumps the TV to Discover — the easy way to type a title from the couch.

## Project layout

```
src/
  shared/types.ts        # types shared across processes
  main/
    index.ts             # app lifecycle, kiosk window, capture/boot logging
    ipc.ts               # all IPC handlers
    config.ts            # zod-validated config store + default apps
    services/
      arr.ts             # Sonarr/Radarr v3 client (search + add)
      library.ts         # shared-drive scanner + title parsing
      mpv.ts             # mpv launch + JSON-IPC control
      apps.ts            # launch exe / UWP / URL
      system.ts          # mpv detection + winget install
      remote-server.ts   # express + ws phone remote
      remote-page.ts     # the phone remote's HTML
  preload/index.ts       # contextBridge → window.api
  renderer/src/
    App.tsx              # routing, playback, remote/gamepad dispatch
    navigation/          # spatial-nav press bridge + gamepad hook
    components/          # Sidebar, Focusable, MediaCard, AppTile, PlaybackBar, Clock
    screens/             # Home, Apps, Library, Discover, Settings
```

## Roadmap / ideas

- Embed the mpv surface directly in the window via `--wid` (currently a controlled child window)
- Poster art for local media (TMDB) and richer Library grouping (per-show pages)
- "Continue watching" with resume positions
- Per-app kiosk browser (Edge `--kiosk`) instead of default browser for streaming
- Optional pairing/PIN on the phone remote
