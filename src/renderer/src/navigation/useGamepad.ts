import { useEffect, useRef } from 'react'

export interface GamepadHandlers {
  onNav: (dir: 'up' | 'down' | 'left' | 'right') => void
  onEnter: () => void
  onBack: () => void
  onHome: () => void
  onPlayPause: () => void
  onSeek: (delta: number) => void
}

const AXIS_THRESHOLD = 0.55
const REPEAT_MS = 180

/**
 * Polls connected gamepads and maps standard controls to navigation:
 * D-pad / left stick → nav, A → enter, B → back, Y → home, X → play/pause,
 * LB/RB → seek. Works alongside keyboard and the phone remote.
 */
export function useGamepad(handlers: GamepadHandlers): void {
  const ref = useRef(handlers)
  ref.current = handlers

  useEffect(() => {
    let raf = 0
    const lastNav = { time: 0, dir: '' as string }
    const pressed = new Set<number>()

    const edge = (index: number, down: boolean, fire: () => void): void => {
      if (down && !pressed.has(index)) {
        pressed.add(index)
        fire()
      } else if (!down && pressed.has(index)) {
        pressed.delete(index)
      }
    }

    const poll = (): void => {
      const pads = navigator.getGamepads?.() ?? []
      const gp = Array.from(pads).find((p) => p)
      if (gp) {
        const h = ref.current
        const now = performance.now()

        // Directional: dpad buttons (12-15) or left stick axes (0,1)
        let dir = ''
        if (gp.buttons[12]?.pressed || gp.axes[1] < -AXIS_THRESHOLD) dir = 'up'
        else if (gp.buttons[13]?.pressed || gp.axes[1] > AXIS_THRESHOLD) dir = 'down'
        else if (gp.buttons[14]?.pressed || gp.axes[0] < -AXIS_THRESHOLD) dir = 'left'
        else if (gp.buttons[15]?.pressed || gp.axes[0] > AXIS_THRESHOLD) dir = 'right'

        if (dir) {
          const changed = dir !== lastNav.dir
          if (changed || now - lastNav.time > REPEAT_MS) {
            h.onNav(dir as 'up' | 'down' | 'left' | 'right')
            lastNav.time = now
            lastNav.dir = dir
          }
        } else {
          lastNav.dir = ''
        }

        edge(0, gp.buttons[0]?.pressed ?? false, h.onEnter) // A
        edge(1, gp.buttons[1]?.pressed ?? false, h.onBack) // B
        edge(2, gp.buttons[2]?.pressed ?? false, h.onPlayPause) // X
        edge(3, gp.buttons[3]?.pressed ?? false, h.onHome) // Y
        edge(4, gp.buttons[4]?.pressed ?? false, () => h.onSeek(-30)) // LB
        edge(5, gp.buttons[5]?.pressed ?? false, () => h.onSeek(30)) // RB
      }
      raf = requestAnimationFrame(poll)
    }

    raf = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(raf)
  }, [])
}
