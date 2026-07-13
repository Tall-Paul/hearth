import type { PlaybackState } from '../types'
import { formatTime } from '../types'

interface Props {
  state: PlaybackState
  onCommand: (action: string, value?: number) => void
}

export function PlaybackBar({ state, onCommand }: Props) {
  if (!state.active) return null
  const pct = state.duration > 0 ? (state.position / state.duration) * 100 : 0

  return (
    <div className="playback-bar">
      <div className="pb-title">{state.title ?? 'Now Playing'}</div>
      <div className="pb-track">
        <div className="pb-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="pb-controls">
        <button className="btn" onClick={() => onCommand('seek', -30)}>« 30s</button>
        <button className="btn primary" onClick={() => onCommand('playpause')}>
          {state.paused ? '▶ Play' : '⏸ Pause'}
        </button>
        <button className="btn" onClick={() => onCommand('seek', 30)}>30s »</button>
        <button className="btn" onClick={() => onCommand('stop')}>⏹ Stop</button>
        <span className="pb-time">
          {formatTime(state.position)} / {formatTime(state.duration)}
        </span>
      </div>
    </div>
  )
}
