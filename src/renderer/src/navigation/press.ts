// Bridges gamepad / phone-remote input into the same keydown events that the
// spatial-navigation library already handles for a physical keyboard/remote.

type NavKey = 'up' | 'down' | 'left' | 'right' | 'enter'

const CODES: Record<NavKey, number> = {
  left: 37,
  up: 38,
  right: 39,
  down: 40,
  enter: 13
}

const KEYS: Record<NavKey, string> = {
  left: 'ArrowLeft',
  up: 'ArrowUp',
  right: 'ArrowRight',
  down: 'ArrowDown',
  enter: 'Enter'
}

export function pressKey(name: NavKey): void {
  const keyCode = CODES[name]
  const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true })
  // keyCode/which are read-only on the constructor, so define them explicitly —
  // the spatial-navigation lib reads event.keyCode.
  Object.defineProperty(ev, 'keyCode', { get: () => keyCode })
  Object.defineProperty(ev, 'which', { get: () => keyCode })
  Object.defineProperty(ev, 'key', { get: () => KEYS[name] })
  window.dispatchEvent(ev)
}
