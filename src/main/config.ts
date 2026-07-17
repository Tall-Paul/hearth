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
  kind: z.enum(['exe', 'uwp', 'webapp', 'url', 'embed']),
  color: z.string().optional(),
  enabled: z.boolean().default(true),
  favourite: z.boolean().optional()
})

const watchEntrySchema = z.object({
  path: z.string(),
  title: z.string(),
  playedAt: z.number(),
  showId: z.string(),
  season: z.number(),
  episode: z.number()
})

const configSchema = z.object({
  mediaFolders: z.array(mediaFolderSchema).default([]),
  sonarr: arrSchema.default({ baseUrl: '', apiKey: '' }),
  radarr: arrSchema.default({ baseUrl: '', apiKey: '' }),
  apps: z.array(appShortcutSchema).default([]),
  mpvPath: z.string().default('mpv'),
  remotePort: z.number().int().default(842),
  kiosk: z.boolean().default(true),
  favouriteMediaIds: z.array(z.string()).default([]),
  watchHistory: z.array(watchEntrySchema).default([])
})

const DEFAULT_APPS: HearthConfig['apps'] = [
  // These load inside Hearth's own window instead of launching the native Store app —
  // see src/main/services/embed.ts — for a genuinely title-bar-free player.
  { id: 'netflix', name: 'Netflix', icon: '🎬', kind: 'embed', target: 'https://www.netflix.com', color: '#e50914' },
  { id: 'prime', name: 'Prime Video', icon: '📺', kind: 'embed', target: 'https://www.primevideo.com', color: '#00a8e1' },
  { id: 'geforce', name: 'GeForce Now', icon: '🎮', kind: 'webapp', target: 'https://play.geforcenow.com', color: '#76b900' },
  { id: 'minecraft-bedrock', name: 'Minecraft', icon: '⛏️', kind: 'uwp', target: 'Microsoft.MinecraftUWP_8wekyb3d8bbwe!Game', color: '#6cbb3c' },
  { id: 'youtube', name: 'YouTube', icon: '▶️', kind: 'webapp', target: 'https://www.youtube.com/tv', color: '#ff0000' },
  { id: 'disney', name: 'Disney+', icon: '🏰', kind: 'embed', target: 'https://www.disneyplus.com', color: '#113ccf' },
  { id: 'spotify', name: 'Spotify', icon: '🎵', kind: 'webapp', target: 'https://open.spotify.com', color: '#1db954' },
  // BBC iPlayer and All4 are UK-region-locked Store listings we couldn't verify an
  // AppUserModelID for from this machine, so these use the chromeless-web fallback instead.
  { id: 'bbc-iplayer', name: 'BBC iPlayer', icon: '📡', kind: 'webapp', target: 'https://www.bbc.co.uk/iplayer', color: '#f54997' },
  { id: 'channel4', name: 'Channel 4', icon: '4️⃣', kind: 'webapp', target: 'https://www.channel4.com/streaming/watch', color: '#e6224b' },
  { id: 'nowtv', name: 'NOW TV', icon: '☁️', kind: 'exe', target: '%APPDATA%\\NOW TV\\NOW TV Player\\NOW TV Player.exe', color: '#3ec1f2' }
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
  // Keep known default tiles in sync with their current definition — kind/target/icon
  // can change between versions (e.g. Netflix moving from launching the native Store
  // app to an embedded in-window DRM player), and without this an existing config's
  // stale 'uwp' entry would silently shadow the new behavior forever. Only `enabled`
  // is ever user-editable via the UI, so that's the only field preserved from the
  // existing entry; everything else is resynced. New tiles get appended too.
  const defaultsById = new Map(DEFAULT_APPS.map((a) => [a.id, a]))
  const existingIds = new Set(config.apps.map((a) => a.id))
  config.apps = z.array(appShortcutSchema).parse([
    ...config.apps.map((a) => {
      const def = defaultsById.get(a.id)
      return def ? { ...def, enabled: a.enabled, favourite: a.favourite } : a
    }),
    ...DEFAULT_APPS.filter((a) => !existingIds.has(a.id))
  ])
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
