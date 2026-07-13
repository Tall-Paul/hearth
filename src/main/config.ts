import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { z } from 'zod'
import type { HearthConfig } from '../shared/types'

const arrSchema = z.object({
  baseUrl: z.string().default(''),
  apiKey: z.string().default('')
})

const mediaFolderSchema = z.object({
  path: z.string(),
  kind: z.enum(['movies', 'tv'])
})

const appShortcutSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  target: z.string(),
  kind: z.enum(['exe', 'uwp', 'webapp', 'url']),
  color: z.string().optional(),
  enabled: z.boolean().default(true)
})

const configSchema = z.object({
  mediaFolders: z.array(mediaFolderSchema).default([]),
  sonarr: arrSchema.default({ baseUrl: '', apiKey: '' }),
  radarr: arrSchema.default({ baseUrl: '', apiKey: '' }),
  apps: z.array(appShortcutSchema).default([]),
  mpvPath: z.string().default('mpv'),
  remotePort: z.number().int().default(842),
  kiosk: z.boolean().default(true)
})

const DEFAULT_APPS: HearthConfig['apps'] = [
  { id: 'netflix', name: 'Netflix', icon: '🎬', kind: 'uwp', target: '4DF9E0F8.Netflix_mcm4njqhnhss8!Netflix.App', color: '#e50914' },
  { id: 'prime', name: 'Prime Video', icon: '📺', kind: 'uwp', target: 'AmazonVideo.PrimeVideo_pwbj9vvecjh7j!PWA', color: '#00a8e1' },
  { id: 'geforce', name: 'GeForce Now', icon: '🎮', kind: 'webapp', target: 'https://play.geforcenow.com', color: '#76b900' },
  { id: 'minecraft-bedrock', name: 'Minecraft', icon: '⛏️', kind: 'uwp', target: 'Microsoft.MinecraftUWP_8wekyb3d8bbwe!Game', color: '#6cbb3c' },
  { id: 'youtube', name: 'YouTube', icon: '▶️', kind: 'webapp', target: 'https://www.youtube.com/tv', color: '#ff0000' },
  { id: 'disney', name: 'Disney+', icon: '🏰', kind: 'uwp', target: 'Disney.37853FC22B2CE_6rarf9sa4v8jt!App', color: '#113ccf' },
  { id: 'spotify', name: 'Spotify', icon: '🎵', kind: 'webapp', target: 'https://open.spotify.com', color: '#1db954' }
]

let cached: HearthConfig | null = null

function configPath(): string {
  return join(app.getPath('userData'), 'hearth-config.json')
}

export function loadConfig(): HearthConfig {
  if (cached) return cached
  const path = configPath()
  let raw: unknown = {}
  if (existsSync(path)) {
    try {
      raw = JSON.parse(readFileSync(path, 'utf-8'))
    } catch (err) {
      console.error('[config] failed to parse config, using defaults:', err)
    }
  }
  // Migrate pre-existing configs: mediaPaths (string[]) -> mediaFolders (tagged).
  // Guess 'movies' for legacy entries; the user can retag them as TV in Admin.
  if (raw && typeof raw === 'object' && !('mediaFolders' in raw) && Array.isArray((raw as Record<string, unknown>)['mediaPaths'])) {
    const legacy = (raw as Record<string, unknown>)['mediaPaths'] as unknown[]
    ;(raw as Record<string, unknown>)['mediaFolders'] = legacy
      .filter((p): p is string => typeof p === 'string')
      .map((path) => ({ path, kind: 'movies' as const }))
  }
  const parsed = configSchema.safeParse(raw)
  const config = parsed.success ? parsed.data : configSchema.parse({})
  // Seed default app shortcuts on first run so the Apps screen isn't empty.
  if (!existsSync(path) && config.apps.length === 0) {
    config.apps = z.array(appShortcutSchema).parse(DEFAULT_APPS)
  }
  cached = config
  return config
}

export function saveConfig(next: Partial<HearthConfig>): HearthConfig {
  const merged = { ...loadConfig(), ...next }
  const validated = configSchema.parse(merged)
  writeFileSync(configPath(), JSON.stringify(validated, null, 2), 'utf-8')
  cached = validated
  return validated
}

export function getConfigPath(): string {
  return configPath()
}
