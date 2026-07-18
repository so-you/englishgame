import { useEffect, useRef, type ReactNode } from 'react'

interface FocusManagerProps {
  readonly focusKey: string
  readonly children: ReactNode
}

/** Moves keyboard and screen-reader focus to the new page's primary heading. */
export function FocusManager({ focusKey, children }: FocusManagerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const heading = containerRef.current?.querySelector<HTMLElement>('h1')
    if (!heading) return
    heading.tabIndex = -1
    heading.focus()
  }, [focusKey])

  return <div ref={containerRef} className="focus-manager">{children}</div>
}
