import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import type { MpvStatus, InstallResult } from '../../shared/types'

// Locations where mpv commonly lands (winget shim, Program Files, scoop, mpv.net).
function commonPaths(): string[] {
  const local = process.env['LOCALAPPDATA'] ?? ''
  const user = process.env['USERPROFILE'] ?? ''
  return [
    join(local, 'Microsoft', 'WinGet', 'Links', 'mpv.exe'),
    'C:/Program Files/MPV Player/mpv.exe',
    'C:/Program Files/mpv/mpv.exe',
    'C:/Program Files/mpv.net/mpvnet.exe',
    join(local, 'Programs', 'mpv.net', 'mpvnet.exe'),
    join(user, 'scoop', 'shims', 'mpv.exe')
  ]
}

function tryVersion(cmd: string): Promise<string | null> {
  return new Promise((resolve) => {
    let out = ''
    let settled = false
    const finish = (v: string | null): void => {
      if (!settled) {
        settled = true
        resolve(v)
      }
    }
    try {
      const p = spawn(cmd, ['--version'], { windowsHide: true })
      p.stdout?.on('data', (d) => (out += d.toString()))
      p.on('error', () => finish(null))
      p.on('exit', () => {
        const m = out.match(/mpv[\s-]+v?[\d.]+/i)
        finish(m ? m[0].trim() : out ? out.split('\n')[0].trim() : null)
      })
      setTimeout(() => {
        try {
          p.kill()
        } catch {
          /* ignore */
        }
        finish(null)
      }, 4000)
    } catch {
      finish(null)
    }
  })
}

/** Detect mpv via the configured path, PATH, or common install locations. */
export async function checkMpv(configuredPath: string): Promise<MpvStatus> {
  const candidates = [configuredPath, 'mpv', ...commonPaths()].filter(Boolean)
  const seen = new Set<string>()
  for (const c of candidates) {
    if (seen.has(c)) continue
    seen.add(c)
    // For absolute paths, skip early if the file is missing.
    const isPath = c.includes('/') || c.includes('\\')
    if (isPath && !existsSync(c)) continue
    const version = await tryVersion(c)
    if (version) return { installed: true, version, path: c }
  }
  return { installed: false }
}

/** Install mpv via winget (shinchiro.mpv). May show a UAC prompt. */
export function installMpv(): Promise<InstallResult> {
  return new Promise((resolve) => {
    let out = ''
    let settled = false
    const finish = (r: InstallResult): void => {
      if (!settled) {
        settled = true
        resolve(r)
      }
    }
    try {
      const p = spawn(
        'winget',
        [
          'install',
          '--id',
          'shinchiro.mpv',
          '-e',
          '--accept-package-agreements',
          '--accept-source-agreements',
          '--disable-interactivity'
        ],
        { windowsHide: false }
      )
      p.stdout?.on('data', (d) => (out += d.toString()))
      p.stderr?.on('data', (d) => (out += d.toString()))
      p.on('error', (err) => finish({ ok: false, message: `Could not run winget: ${err.message}` }))
      p.on('exit', (code) =>
        finish({ ok: code === 0, message: out.trim().slice(-600) || `winget exited with code ${code}` })
      )
      setTimeout(() => {
        try {
          p.kill()
        } catch {
          /* ignore */
        }
        finish({ ok: false, message: 'winget install timed out after 3 minutes' })
      }, 180000)
    } catch (err) {
      finish({ ok: false, message: String(err) })
    }
  })
}
