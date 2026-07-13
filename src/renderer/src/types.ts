export type ScreenId = 'home' | 'apps' | 'library' | 'discover' | 'settings'

export type {
  HearthConfig,
  AppShortcut,
  MediaFolder,
  Movie,
  Show,
  Season,
  Episode,
  Library,
  DiscoverResult,
  PlaybackState,
  RemoteCommand,
  ApiResult,
  ArrConfig,
  MpvStatus,
  InstallResult
} from '../../shared/types'

import type { Library } from '../../shared/types'

/** A single playable poster tile — used for Home's "Recently added" row. */
export interface RecentTile {
  id: string
  title: string
  subtitle: string
  posterUrl?: string
  icon: string
  path: string
  addedAt: number
}

export function recentFromLibrary(library: Library, limit = 12): RecentTile[] {
  const movieTiles: RecentTile[] = library.movies.map((m) => ({
    id: m.id,
    title: m.title,
    subtitle: [m.year, formatSize(m.sizeBytes)].filter(Boolean).join(' · '),
    posterUrl: m.posterUrl,
    icon: '🎬',
    path: m.path,
    addedAt: m.addedAt ?? 0
  }))
  const episodeTiles: RecentTile[] = library.shows.flatMap((s) =>
    s.seasons.flatMap((season) =>
      season.episodes.map((ep) => ({
        id: ep.id,
        title: s.title,
        subtitle: `S${season.season}E${ep.episode} · ${ep.title}`,
        posterUrl: s.posterUrl,
        icon: '📺',
        path: ep.path,
        addedAt: ep.addedAt ?? 0
      }))
    )
  )
  return [...movieTiles, ...episodeTiles].sort((a, b) => b.addedAt - a.addedAt).slice(0, limit)
}

export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const pad = (n: number): string => n.toString().padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

export function formatSize(bytes?: number): string {
  if (!bytes) return ''
  const gb = bytes / 1024 ** 3
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  return `${(bytes / 1024 ** 2).toFixed(0)} MB`
}
