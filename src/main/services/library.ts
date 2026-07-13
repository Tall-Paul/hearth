import { readdir, stat } from 'fs/promises'
import type { Dirent } from 'fs'
import { join, extname, basename } from 'path'
import { createHash } from 'crypto'
import type { MediaFolder, Movie, Show, Season, Episode, Library } from '../../shared/types'

const VIDEO_EXTS = new Set([
  '.mkv', '.mp4', '.avi', '.mov', '.m4v', '.wmv', '.flv', '.webm', '.ts', '.m2ts', '.mpg', '.mpeg'
])
const MIN_SIZE = 20 * 1024 * 1024 // skip samples/trailers

const EPISODE_RE = /[Ss](\d{1,2})[\s._-]*[Ee](\d{1,3})|(\b\d{1,2})x(\d{2,3})\b/
const SEASON_DIR_RE = /season\s*(\d{1,2})|series\s*(\d{1,2})|^s(\d{1,2})$/i
const YEAR_RE = /\((19|20)\d{2}\)|\b(19|20)\d{2}\b/
const MAX_FILE_SEARCH_DEPTH = 2

function idFor(path: string): string {
  return createHash('sha1').update(path).digest('hex').slice(0, 16)
}

function isVideo(name: string): boolean {
  return VIDEO_EXTS.has(extname(name).toLowerCase())
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/\.(mkv|mp4|avi|mov|m4v|wmv|flv|webm|ts|m2ts|mpg|mpeg)$/i, '')
    .replace(/[._]/g, ' ')
    .replace(/\b(1080p|2160p|720p|480p|x264|x265|hevc|h264|h265|web-?dl|bluray|bdrip|dvdrip|hdtv|aac|dts|ddp?5\.?1|remux|proper|repack)\b/gi, '')
    .replace(/[[(].*?[\])]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function yearOf(name: string): number | undefined {
  const m = name.match(YEAR_RE)
  return m ? Number(m[0].replace(/[()]/g, '')) : undefined
}

async function readDirSafe(dir: string): Promise<Dirent[]> {
  try {
    return (await readdir(dir, { withFileTypes: true })) as Dirent[]
  } catch {
    return [] // unreadable dir (permissions, offline share) — skip quietly
  }
}

/** Recursively find the largest video file under a folder (handles Movie/Movie.mkv and extras). */
async function findLargestVideo(
  dir: string,
  depth: number
): Promise<{ path: string; size: number; mtimeMs: number } | null> {
  if (depth > MAX_FILE_SEARCH_DEPTH) return null
  let best: { path: string; size: number; mtimeMs: number } | null = null
  for (const entry of await readDirSafe(dir)) {
    if (entry.name.startsWith('.')) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      const found = await findLargestVideo(full, depth + 1)
      if (found && (!best || found.size > best.size)) best = found
    } else if (entry.isFile() && isVideo(entry.name)) {
      try {
        const s = await stat(full)
        if (s.size < MIN_SIZE) continue
        if (!best || s.size > best.size) best = { path: full, size: s.size, mtimeMs: s.mtimeMs }
      } catch {
        // ignore
      }
    }
  }
  return best
}

/** Movies root: one subfolder per movie (Radarr-style), or loose files at the root. */
async function scanMovies(root: string): Promise<Movie[]> {
  const movies: Movie[] = []
  for (const entry of await readDirSafe(root)) {
    if (entry.name.startsWith('.') || entry.name === '$RECYCLE.BIN') continue
    const full = join(root, entry.name)
    if (entry.isDirectory()) {
      const file = await findLargestVideo(full, 0)
      if (!file) continue
      movies.push({
        id: idFor(file.path),
        title: cleanTitle(entry.name),
        year: yearOf(entry.name),
        path: file.path,
        folderPath: full,
        sizeBytes: file.size,
        addedAt: file.mtimeMs
      })
    } else if (entry.isFile() && isVideo(entry.name)) {
      try {
        const s = await stat(full)
        if (s.size < MIN_SIZE) continue
        movies.push({
          id: idFor(full),
          title: cleanTitle(entry.name),
          year: yearOf(entry.name),
          path: full,
          folderPath: root,
          sizeBytes: s.size,
          addedAt: s.mtimeMs
        })
      } catch {
        // ignore
      }
    }
  }
  return movies
}

function seasonNumberFrom(name: string, fallbackIndex: number): number {
  const m = name.match(SEASON_DIR_RE)
  if (!m) return fallbackIndex
  const n = Number(m[1] ?? m[2] ?? m[3])
  return Number.isFinite(n) ? n : fallbackIndex
}

async function episodesInDir(dir: string, season: number): Promise<Episode[]> {
  const episodes: Episode[] = []
  const files = (await readDirSafe(dir))
    .filter((e) => e.isFile() && isVideo(e.name))
    .sort((a, b) => a.name.localeCompare(b.name))
  let fallbackEp = 1
  for (const entry of files) {
    const full = join(dir, entry.name)
    try {
      const s = await stat(full)
      if (s.size < MIN_SIZE) continue
      const m = entry.name.match(EPISODE_RE)
      const episodeNum = m ? Number(m[2] ?? m[4]) : fallbackEp
      const seasonNum = m && (m[1] ?? m[3]) ? Number(m[1] ?? m[3]) : season
      fallbackEp++
      episodes.push({
        id: idFor(full),
        title: cleanTitle(entry.name),
        season: seasonNum,
        episode: episodeNum,
        path: full,
        sizeBytes: s.size,
        addedAt: s.mtimeMs
      })
    } catch {
      // ignore
    }
  }
  return episodes
}

/** TV root: Show/Season NN/episode.mkv (Sonarr-style). */
async function scanShows(root: string): Promise<Show[]> {
  const shows: Show[] = []
  for (const showEntry of await readDirSafe(root)) {
    if (!showEntry.isDirectory() || showEntry.name.startsWith('.')) continue
    const showFull = join(root, showEntry.name)
    const children = await readDirSafe(showFull)
    const seasonsMap = new Map<number, Episode[]>()

    const subDirs = children.filter((c) => c.isDirectory() && !c.name.startsWith('.'))
    let fallbackSeasonIdx = 1
    for (const seasonEntry of subDirs) {
      const seasonNum = seasonNumberFrom(seasonEntry.name, fallbackSeasonIdx)
      fallbackSeasonIdx++
      const eps = await episodesInDir(join(showFull, seasonEntry.name), seasonNum)
      if (eps.length === 0) continue
      seasonsMap.set(seasonNum, [...(seasonsMap.get(seasonNum) ?? []), ...eps])
    }

    // Episodes sitting directly under the show folder, no season subfolder.
    const looseFiles = children.filter((c) => c.isFile() && isVideo(c.name))
    if (looseFiles.length > 0) {
      const eps = await episodesInDir(showFull, 1)
      for (const ep of eps) {
        seasonsMap.set(ep.season, [...(seasonsMap.get(ep.season) ?? []), ep])
      }
    }

    if (seasonsMap.size === 0) continue

    const seasons: Season[] = [...seasonsMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([season, episodes]) => ({
        season,
        episodes: episodes.sort((a, b) => a.episode - b.episode)
      }))

    const addedAt = Math.max(...seasons.flatMap((s) => s.episodes.map((e) => e.addedAt ?? 0)))

    shows.push({
      id: idFor(showFull),
      title: cleanTitle(showEntry.name),
      folderPath: showFull,
      seasons,
      addedAt
    })
  }
  return shows
}

/** Scan all configured, kind-tagged media folders into a separated Films/TV library. */
export async function scanLibrary(folders: MediaFolder[]): Promise<Library> {
  const movies: Movie[] = []
  const shows: Show[] = []
  for (const folder of folders) {
    if (folder.kind === 'movies') {
      movies.push(...(await scanMovies(folder.path)))
    } else {
      shows.push(...(await scanShows(folder.path)))
    }
  }
  movies.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
  shows.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
  return { movies, shows }
}

/** Normalize a folder's basename for matching against Sonarr/Radarr's own library paths. */
export function normalizeFolderName(path: string): string {
  return basename(path)
    .toLowerCase()
    .replace(/[{}[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
