import { Clock } from '../components/Clock'
import { AppTile } from '../components/AppTile'
import { MediaCard } from '../components/MediaCard'
import type { AppShortcut, Library, ScreenId } from '../types'
import { recentFromLibrary } from '../types'

interface Props {
  apps: AppShortcut[]
  library: Library
  onLaunch: (app: AppShortcut) => void
  onPlay: (item: { path: string; title: string }) => void
  onNavigate: (id: ScreenId) => void
}

export function HomeScreen({ apps, library, onLaunch, onPlay }: Props) {
  const recent = recentFromLibrary(library, 12)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div>
      <div className="screen-head">
        <div>
          <h1>{greeting}</h1>
          <div className="sub">What would you like to watch?</div>
        </div>
        <Clock />
      </div>

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
