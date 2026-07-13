import { app } from 'electron'
import { appendFileSync } from 'fs'
import { join } from 'path'

let logPath = ''
function path(): string {
  if (!logPath) logPath = join(app.getPath('userData'), 'hearth.log')
  return logPath
}

/** Append a timestamped line to the app log (userData/hearth.log). */
export function blog(...parts: unknown[]): void {
  const line = `[${new Date().toISOString()}] ${parts.map((p) => (typeof p === 'string' ? p : JSON.stringify(p))).join(' ')}\n`
  try {
    appendFileSync(path(), line)
  } catch {
    /* ignore */
  }
  // eslint-disable-next-line no-console
  console.log(line.trim())
}

export function bootLogPath(): string {
  return path()
}
