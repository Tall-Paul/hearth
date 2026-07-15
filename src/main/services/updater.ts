import { app } from 'electron'
import type { BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import { blog } from '../boot-log'
import type { UpdateStatus } from '../../shared/types'

const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000 // 4 hours

let win: BrowserWindow | null = null
let status: UpdateStatus = {
  currentVersion: app.getVersion(),
  checking: false,
  available: false,
  downloading: false,
  downloaded: false
}

function isDev(): boolean {
  return Boolean(process.env['ELECTRON_RENDERER_URL']) // no packaged app-update.yml in dev
}

function setStatus(patch: Partial<UpdateStatus>): void {
  status = { ...status, ...patch }
  if (win && !win.isDestroyed()) win.webContents.send('update:status', status)
}

export function getUpdateStatus(): UpdateStatus {
  return status
}

export function checkForUpdates(): void {
  if (isDev()) {
    setStatus({ error: 'Updates are only available in packaged builds' })
    return
  }
  setStatus({ checking: true, error: undefined })
  autoUpdater
    .checkForUpdates()
    .catch((err) => setStatus({ checking: false, error: err instanceof Error ? err.message : String(err) }))
}

export function installUpdate(): void {
  if (!status.downloaded) return
  autoUpdater.quitAndInstall()
}

/** Checks GitHub Releases for a newer tagged build and installs it silently in the background. */
export function initUpdater(window: BrowserWindow): void {
  win = window
  if (isDev()) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('error', (err) => {
    const msg = err instanceof Error ? err.message : String(err)
    blog('autoUpdater error', msg)
    setStatus({ checking: false, downloading: false, error: msg })
  })
  autoUpdater.on('checking-for-update', () => {
    blog('autoUpdater: checking for update')
    setStatus({ checking: true, error: undefined })
  })
  autoUpdater.on('update-available', (info) => {
    blog('autoUpdater: update available', info.version)
    setStatus({
      checking: false,
      available: true,
      downloading: true,
      latestVersion: info.version,
      lastChecked: Date.now()
    })
  })
  autoUpdater.on('update-not-available', () => {
    blog('autoUpdater: up to date')
    setStatus({ checking: false, available: false, lastChecked: Date.now() })
  })
  autoUpdater.on('update-downloaded', (info) => {
    blog('autoUpdater: downloaded, installs on next restart', info.version)
    setStatus({ downloading: false, downloaded: true, latestVersion: info.version })
  })

  checkForUpdates()
  setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL_MS)
}
