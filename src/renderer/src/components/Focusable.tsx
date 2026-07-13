import { CSSProperties, ReactNode, useEffect } from 'react'
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation'

interface Props {
  onEnter?: () => void
  onFocused?: () => void
  className?: string
  style?: CSSProperties
  focusKey?: string
  /** Restrict focus to children (used to trap a row/screen). */
  isFocusBoundary?: boolean
  children: ReactNode | ((focused: boolean) => ReactNode)
}

/**
 * Generic focusable element. Adds a `focused` class for styling, invokes
 * `onEnter` on OK/Enter, and keeps the focused element scrolled into view.
 */
export function Focusable({
  onEnter,
  onFocused,
  className = '',
  style,
  focusKey,
  isFocusBoundary,
  children
}: Props) {
  const { ref, focused, focusSelf } = useFocusable({
    focusKey,
    isFocusBoundary,
    onEnterPress: () => onEnter?.(),
    onFocus: () => onFocused?.()
  })

  useEffect(() => {
    if (focused && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
    }
  }, [focused, ref])

  return (
    <div
      ref={ref}
      className={`focusable ${className} ${focused ? 'focused' : ''}`}
      style={style}
      onMouseEnter={() => focusSelf()}
      onClick={() => onEnter?.()}
    >
      {typeof children === 'function' ? children(focused) : children}
    </div>
  )
}
