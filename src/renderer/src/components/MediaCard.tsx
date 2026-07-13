import { Focusable } from './Focusable'

interface Props {
  title: string
  subtitle?: string
  posterUrl?: string
  icon: string
  badge?: string
  /** Portrait poster shape (movies/shows) vs landscape (episode rows). Defaults to true. */
  poster?: boolean
  onEnter: () => void
}

export function MediaCard({ title, subtitle, posterUrl, icon, badge = '▶ Play', poster = true, onEnter }: Props) {
  return (
    <Focusable className={`card${poster ? ' poster' : ''}`} onEnter={onEnter}>
      <div className="art">
        {posterUrl ? <img src={posterUrl} alt="" /> : <span>{icon}</span>}
        <span className="badge">{badge}</span>
      </div>
      <div className="meta">
        <div className="title">{title}</div>
        <div className="subtitle">{subtitle}</div>
      </div>
    </Focusable>
  )
}
