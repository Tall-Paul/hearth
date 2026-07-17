import { Clock } from '../components/Clock'
import { AppTile } from '../components/AppTile'
import { MediaCard } from '../components/MediaCard'
import type { AppShortcut, Episode, Library, Show, ScreenId, WatchEntry } from '../types'
import { recentFromLibrary } from '../types'

interface Props {
  apps: AppShortcut[]
  library: Library
  onLaunch: (app: AppShortcut) => void
  onPlay: (item: {
    path: string
    title: string
    showId?: string
    season?: number
    episode?: number
  }) => void
  onNavigate: (id: ScreenId) => void
  favouriteMediaIds: string[]
  watchHistory: WatchEntry[]
}

export function HomeScreen({
  apps,
  library,
  onLaunch,
  onPlay,
  favouriteMediaIds,
  watchHistory
}: Props) {
  const recent = recentFromLibrary(library, 12)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const favouriteApps = apps.filter((a) => a.favourite)
  const favouriteMovies = library.movies.filter((m) => favouriteMediaIds.includes(m.id))
  const continueShows = watchHistory
    .map((w) => {
      const show = library.shows.find((s) => s.id === w.showId)
      if (!show) return null
      const episodes = show.seasons
        .flatMap((s) => s.episodes)
        .sort((a, b) => a.season - b.season || a.episode - b.episode)
      const idx = episodes.findIndex((e) => e.season === w.season && e.episode === w.episode)
      const next = idx >= 0 ? episodes[idx + 1] : undefined
      return next ? { show, next, playedAt: w.playedAt } : null
    })
    .filter((x): x is { show: Show; next: Episode; playedAt: number } => x !== null)
    .sort((a, b) => b.playedAt - a.playedAt)

  const hasFavourites = favouriteApps.length + favouriteMovies.length + continueShows.length > 0

  return (
    <div>
      <div className="screen-head">
        <div>
          <h1>{greeting}</h1>
          <div className="sub">What would you like to watch?</div>
        </div>
        <Clock />
      </div>

      {hasFavourites && (
        <div className="row-block">
          <div className="row-title">Favourites</div>
          <div className="card-row">
            {favouriteApps.map((app) => (
              <AppTile key={app.id} app={app} onLaunch={onLaunch} />
            ))}
            {continueShows.map(({ show, next, playedAt }) => (
              <MediaCard
                key={`continue-${show.id}-${playedAt}`}
                posterUrl={show.posterUrl}
                icon="📺"
                badge="Continue"
                title={show.title}
                subtitle={`S${next.season}E${next.episode} · ${next.title}`}
                onEnter={() =>
                  onPlay({
                    path: next.path,
                    title: `${show.title} — S${next.season}E${next.episode}`,
                    showId: show.id,
                    season: next.season,
                    episode: next.episode
                  })
                }
              />
            ))}
            {favouriteMovies.map((m) => (
              <MediaCard
                key={m.id}
                posterUrl={m.posterUrl}
                icon="🎬"
                title={m.title}
                subtitle={m.year ? String(m.year) : undefined}
                onEnter={() => onPlay({ path: m.path, title: m.title })}
              />
            ))}
          </div>
        </div>
      )}

      <div className="row-block">
        <div className="row-title">Jump back in</div>
        <div className="card-row">
          {apps.slice(0, 6).map((app) => (
            <AppTile key={app.id} app={app} onLaunch={onLaunch} />
          ))}
        </div>
      </div>

      <div className="row-block">
        <div className="row-title">Recently added</div>
        {recent.length > 0 ? (
          <div className="card-row">
            {recent.map((item) => (
              <MediaCard
                key={item.id}
                posterUrl={item.posterUrl}
                icon={item.icon}
                title={item.title}
                subtitle={item.subtitle}
                onEnter={() => onPlay({ path: item.path, title: item.title })}
              />
            ))}
          </div>
        ) : (
          <div className="empty">
            <div className="big">🎞️</div>
            <div className="hint">
              No local media yet. Add your shared-drive folders in <b>Settings</b> to see films and
              shows here.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
