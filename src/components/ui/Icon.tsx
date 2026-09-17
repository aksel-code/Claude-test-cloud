/**
 * Icon set. Stroke-based on a 24x24 grid, drawn a touch loose so they sit
 * comfortably next to handwriting rather than looking like a dashboard.
 *
 * Icons are decorative by default (`aria-hidden`); pass a `title` only when the
 * icon is the sole content of a control and there's no adjacent label.
 */
import type { SVGProps } from 'react'

const PATHS = {
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M4.5 12.5l5 5L19.5 6.5',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  chevronDown: 'M5 9l7 7 7-7',
  chevronUp: 'M5 15l7-7 7 7',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  home: 'M3.5 10.5L12 3.5l8.5 7M5.5 9.5v10h13v-10',
  book: 'M4 4.5h6a2.5 2.5 0 0 1 2 2.5v13a2 2 0 0 0-2-1.5H4Zm16 0h-6a2.5 2.5 0 0 0-2 2.5v13a2 2 0 0 1 2-1.5h6Z',
  calendar: 'M4 6.5h16v14H4ZM4 11h16M8 3.5v4M16 3.5v4',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM16.2 16.2 21 21',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3 1a7.7 7.7 0 0 0-1.8-1L14.8 3h-4l-.5 2.6a7.7 7.7 0 0 0-1.8 1l-2.3-1-2 3.4L6.2 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7.7 7.7 0 0 0 1.8 1l.5 2.6h4l.5-2.6a7.7 7.7 0 0 0 1.8-1l2.3 1 2-3.4Z',
  trash: 'M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5',
  undo: 'M4 9h10a5.5 5.5 0 0 1 0 11H8M4 9l4-4M4 9l4 4',
  redo: 'M20 9H10a5.5 5.5 0 0 0 0 11h6M20 9l-4-4M20 9l-4 4',
  text: 'M5 6.5V4.5h14v2M12 4.5v15M9 19.5h6',
  image: 'M3.5 5.5h17v13h-17ZM3.5 15l4.5-4.5 4 4 3-3 5 5M15.5 9.5a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z',
  sticker: 'M4 4.5h10.5L20 10v9.5H4ZM14 4.5V10h6',
  tape: 'M2.5 9.5h19v6h-19ZM7 9.5l-2 6M12 9.5l-2 6M17 9.5l-2 6',
  pen: 'M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5Z M13.5 7 17 10.5',
  note: 'M4.5 4.5h15v10l-5 5h-10ZM19.5 14.5h-5v5',
  shapes: 'M8 3.5 13 12H3ZM17 12a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM13.5 3.5h7v7h-7Z',
  layers: 'M12 3 3 8l9 5 9-5ZM3 13l9 5 9-5M3 17.5l9 5 9-5',
  palette: 'M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-.9 2-1.8s-.8-1.6-.8-2.4c0-.9.7-1.6 1.6-1.6h1.7A4 4 0 0 0 20.5 11 7.6 7.6 0 0 0 12 3.5ZM7.5 11a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2ZM11 8a1.1 1.1 0 1 0 0-2.2A1.1 1.1 0 0 0 11 8ZM15 9.5a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2Z',
  lock: 'M6.5 10.5h11v9h-11ZM8.5 10.5V7a3.5 3.5 0 0 1 7 0v3.5M12 14v2.5',
  unlock: 'M6.5 10.5h11v9h-11ZM8.5 10.5V7a3.5 3.5 0 0 1 6.8-1.2M12 14v2.5',
  duplicate: 'M8.5 8.5h11v11h-11ZM15.5 8.5v-4h-11v11h4',
  bringForward: 'M12 3.5 21 8l-9 4.5L3 8ZM6 12.5 12 15.5l6-3M6 16.5l6 3 6-3',
  sendBack: 'M12 20.5 3 16l9-4.5L21 16ZM18 11.5 12 8.5l-6 3M18 7.5 12 4.5l-6 3',
  eraser: 'M9 20.5 3.8 15.3a2 2 0 0 1 0-2.8l8.5-8.5a2 2 0 0 1 2.8 0l5.2 5.2a2 2 0 0 1 0 2.8l-8.5 8.5ZM8 9l7 7M4 20.5h16',
  marker: 'M5 17.5 4 21l3.5-1L20 8.5a2.5 2.5 0 0 0-3.5-3.5ZM15 6.5l2.5 2.5M4 21h16',
  highlighter: 'M6 15.5 15.5 6a2 2 0 0 1 3 3L9 18.5H6ZM4 21.5h16M13 8.5l3 3',
  download: 'M12 3.5v12M7.5 11l4.5 4.5 4.5-4.5M4.5 19.5h15',
  share: 'M12 15.5V3.5M8 7l4-3.5L16 7M5 12.5v8h14v-8',
  sparkle: 'M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6ZM18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  grid: 'M4 4.5h6v6H4ZM14 4.5h6v6h-6ZM4 14.5h6v6H4ZM14 14.5h6v6h-6Z',
  tag: 'M3.5 11V4.5H10l10 10-6.5 6.5ZM7 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  camera: 'M3.5 7.5h4L9 5.5h6l1.5 2h4v12h-17ZM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  flame: 'M12 21c3.9 0 6.5-2.4 6.5-6 0-4.5-4.5-6-4-11-3 1.5-5 4.5-5 7.5 0 1-.7 1.5-1.3 1.1C7.4 12 7 11 7 10c-1.3 1.4-2 3.2-2 5 0 3.6 3.1 6 7 6Z',
  eye: 'M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  align: 'M4 6h16M4 12h10M4 18h14',
  alignCenter: 'M4 6h16M7 12h10M5 18h14',
  alignRight: 'M4 6h16M10 12h10M6 18h14',
  magnet: 'M6 3.5v9a6 6 0 0 0 12 0v-9h-4v9a2 2 0 0 1-4 0v-9ZM6 8h4M14 8h4',
  key: 'M14.5 3.5a5.5 5.5 0 1 0-4.1 9.2L4 19.1v2.4h3v-2h2v-2h2l1.4-1.4A5.5 5.5 0 0 0 14.5 3.5ZM16 8.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  fingerprint: 'M12 4a8 8 0 0 0-8 8M20 12a8 8 0 0 0-8-8M7.5 12a4.5 4.5 0 0 1 9 0v3M12 12v6M16.5 16.5v2M7.5 15v3',
  weather: 'M17 18.5H7.5a4 4 0 1 1 .8-7.9A5.5 5.5 0 0 1 19 12a3.3 3.3 0 0 1-2 6.5Z',
  clock: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 7v5.5l3.5 2',
  crop: 'M6 2.5v15h15M2.5 6h15v15',
  rotate: 'M20 12a8 8 0 1 1-2.6-5.9M20 3.5V9h-5.5',
} as const

export type IconName = keyof typeof PATHS

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
  /** Supply when the icon carries meaning on its own. */
  title?: string
}

export function Icon({ name, size = 22, title, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path d={PATHS[name]} />
    </svg>
  )
}
