import type { ArrConfig, DiscoverResult } from '../../shared/types'
import { normalizeFolderName } from './library'

interface ArrImage {
  coverType: string
  remoteUrl?: string
  url?: string
}

async function arrFetch<T>(cfg: ArrConfig, path: string, init?: RequestInit): Promise<T> {
  if (!cfg.baseUrl || !cfg.apiKey) {
    throw new Error('Service not configured (missing base URL or API key)')
  }
  const base = cfg.baseUrl.replace(/\/+$/, '')
  const url = `${base}/api/v3${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      'X-Api-Key': cfg.apiKey,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText}${body ? ` – ${body.slice(0, 200)}` : ''}`)
  }
  return (await res.json()) as T
}

function pickPoster(images: ArrImage[] | undefined): string | undefined {
  const poster = images?.find((i) => i.coverType === 'poster')
  return poster?.remoteUrl ?? poster?.url
}

/** Basic connectivity/auth check used by the Settings screen. */
export async function arrPing(cfg: ArrConfig): Promise<{ version: string }> {
  const status = await arrFetch<{ version: string }>(cfg, '/system/status')
  return { version: status.version }
}

interface SonarrSeries {
  title: string
  year?: number
  overview?: string
  images?: ArrImage[]
  tvdbId: number
  id?: number
}

export async function sonarrSearch(cfg: ArrConfig, term: string): Promise<DiscoverResult[]> {
  const results = await arrFetch<SonarrSeries[]>(
    cfg,
    `/series/lookup?term=${encodeURIComponent(term)}`
  )
  return results.map((s) => ({
    service: 'sonarr' as const,
    title: s.title,
    year: s.year,
    overview: s.overview,
    posterUrl: pickPoster(s.images),
    remoteId: s.tvdbId,
    alreadyAdded: typeof s.id === 'number' && s.id > 0
  }))
}

interface RadarrMovie {
  title: string
  year?: number
  overview?: string
  images?: ArrImage[]
  tmdbId: number
  id?: number
}

export async function radarrSearch(cfg: ArrConfig, term: string): Promise<DiscoverResult[]> {
  const results = await arrFetch<RadarrMovie[]>(
    cfg,
    `/movie/lookup?term=${encodeURIComponent(term)}`
  )
  return results.map((m) => ({
    service: 'radarr' as const,
    title: m.title,
    year: m.year,
    overview: m.overview,
    posterUrl: pickPoster(m.images),
    remoteId: m.tmdbId,
    alreadyAdded: typeof m.id === 'number' && m.id > 0
  }))
}

/**
 * Match local library folders to poster art already indexed by Sonarr/Radarr.
 * Sonarr/Radarr manage the same shared-drive folders, so their own folder
 * basenames (e.g. "The Wire" or "Inception (2010)") reliably match Hearth's
 * scanned folder names even when the two apps see different mount paths.
 */
export async function buildPosterMap(cfg: ArrConfig, kind: 'sonarr' | 'radarr'): Promise<Map<string, string>> {
  const path = kind === 'sonarr' ? '/series' : '/movie'
  const entries = await arrFetch<Array<{ path?: string; images?: ArrImage[] }>>(cfg, path)
  const map = new Map<string, string>()
  for (const entry of entries) {
    if (!entry.path) continue
    const poster = pickPoster(entry.images)
    if (poster) map.set(normalizeFolderName(entry.path), poster)
  }
  return map
}

async function firstRootAndProfile(cfg: ArrConfig): Promise<{ root: string; profileId: number }> {
  const [roots, profiles] = await Promise.all([
    arrFetch<Array<{ path: string }>>(cfg, '/rootfolder'),
    arrFetch<Array<{ id: number }>>(cfg, '/qualityprofile')
  ])
  if (!roots.length) throw new Error('No root folder configured on the service')
  if (!profiles.length) throw new Error('No quality profile configured on the service')
  return { root: roots[0].path, profileId: profiles[0].id }
}

export async function sonarrAdd(cfg: ArrConfig, tvdbId: number): Promise<void> {
  const [lookup] = await arrFetch<SonarrSeries[]>(cfg, `/series/lookup?term=tvdb:${tvdbId}`)
  if (!lookup) throw new Error('Series not found')
  const { root, profileId } = await firstRootAndProfile(cfg)
  await arrFetch(cfg, '/series', {
    method: 'POST',
    body: JSON.stringify({
      ...lookup,
      qualityProfileId: profileId,
      rootFolderPath: root,
      monitored: true,
      seasonFolder: true,
      addOptions: { searchForMissingEpisodes: true }
    })
  })
}

export async function radarrAdd(cfg: ArrConfig, tmdbId: number): Promise<void> {
  const [lookup] = await arrFetch<RadarrMovie[]>(cfg, `/movie/lookup?term=tmdb:${tmdbId}`)
  if (!lookup) throw new Error('Movie not found')
  const { root, profileId } = await firstRootAndProfile(cfg)
  await arrFetch(cfg, '/movie', {
    method: 'POST',
    body: JSON.stringify({
      ...lookup,
      qualityProfileId: profileId,
      rootFolderPath: root,
      monitored: true,
      addOptions: { searchForMovie: true }
    })
  })
}
