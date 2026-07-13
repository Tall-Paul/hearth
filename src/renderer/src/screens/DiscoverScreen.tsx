import { useEffect, useRef, useState } from 'react'
import { Focusable } from '../components/Focusable'
import type { DiscoverResult } from '../types'

interface Props {
  /** Search term pushed from the phone remote; consumed on apply. */
  pendingSearch: string | null
  onConsumeSearch: () => void
  showToast: (msg: string, err?: boolean) => void
}

export function DiscoverScreen({ pendingSearch, onConsumeSearch, showToast }: Props) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<DiscoverResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const runSearch = async (q: string): Promise<void> => {
    const query = q.trim()
    if (!query) return
    setLoading(true)
    setSearched(true)
    const res = await window.api.discoverSearch(query)
    setLoading(false)
    if (res.ok && res.data) setResults(res.data)
    else showToast(res.error ?? 'Search failed', true)
  }

  // Apply a search term pushed from the phone remote.
  useEffect(() => {
    if (pendingSearch != null) {
      setTerm(pendingSearch)
      void runSearch(pendingSearch)
      onConsumeSearch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSearch])

  const add = async (r: DiscoverResult): Promise<void> => {
    const res = await window.api.discoverAdd(r.service, r.remoteId)
    if (res.ok) showToast(`Added "${r.title}" to ${r.service === 'sonarr' ? 'Sonarr' : 'Radarr'}`)
    else showToast(res.error ?? 'Could not add', true)
  }

  return (
    <div>
      <div className="screen-head">
        <div>
          <h1>Discover</h1>
          <div className="sub">Search Sonarr &amp; Radarr — press OK on a result to add it</div>
        </div>
      </div>

      <Focusable className="search-box" onEnter={() => inputRef.current?.focus()}>
        <span>🔍</span>
        <input
          ref={inputRef}
          value={term}
          placeholder="Search films & shows…"
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void runSearch(term)
          }}
        />
      </Focusable>

      {loading && <div className="empty"><div className="big">⏳</div><div>Searching…</div></div>}

      {!loading && searched && results.length === 0 && (
        <div className="empty">
          <div className="big">🤷</div>
          <div className="hint">No results. Check that Sonarr/Radarr are configured in Settings.</div>
        </div>
      )}

      {!loading && !searched && (
        <div className="empty">
          <div className="big">🎯</div>
          <div className="hint">
            Type a title (or use the phone remote’s search box) to find new movies and shows to add.
          </div>
        </div>
      )}

      <div className="card-row" style={{ flexWrap: 'wrap' }}>
        {results.map((r) => (
          <Focusable key={`${r.service}-${r.remoteId}`} className="card poster" onEnter={() => add(r)}>
            <div className="art">
              {r.posterUrl ? <img src={r.posterUrl} alt="" /> : <span>{r.service === 'sonarr' ? '📺' : '🎬'}</span>}
              <span className="badge">{r.alreadyAdded ? '✓ Added' : '+ Add'}</span>
            </div>
            <div className="meta">
              <div className="title">{r.title}</div>
              <div className="subtitle">
                {[r.year, r.service === 'sonarr' ? 'Series' : 'Movie'].filter(Boolean).join(' · ')}
              </div>
            </div>
          </Focusable>
        ))}
      </div>
    </div>
  )
}
