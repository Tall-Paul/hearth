import { AppTile } from '../components/AppTile'
import type { AppShortcut } from '../types'

interface Props {
  apps: AppShortcut[]
  onLaunch: (app: AppShortcut) => void
}

export function AppsScreen({ apps, onLaunch }: Props) {
  return (
    <div>
      <div className="screen-head">
        <div>
          <h1>Apps</h1>
          <div className="sub">Streaming services & games</div>
        </div>
      </div>
      <div className="card-row" style={{ flexWrap: 'wrap' }}>
        {apps.map((app) => (
          <AppTile key={app.id} app={app} onLaunch={onLaunch} />
        ))}
      </div>
    </div>
  )
}
