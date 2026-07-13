import { useEffect, useState } from 'react'

export function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 20)
    return () => clearInterval(id)
  }, [])
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return <div className="clock">{time}</div>
}
