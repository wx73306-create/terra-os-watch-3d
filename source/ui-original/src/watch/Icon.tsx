import type { CSSProperties } from 'react'

const P: Record<string, string> = {
  spark: 'M12 2 14 10 22 12 14 14 12 22 10 14 2 12 10 10Z',
  back: 'm15 5-7 7 7 7',
  chev: 'm9 5 7 7-7 7',
  sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  flash: 'M8 2h8v4l-2 4v12h-4V10L8 6zM12 13v3',
  belloff: 'M8.7 3.6A6 6 0 0 1 18 8v4l2 4h-9M6 8v4l-2 4h4M3 3l18 18M10 20a2 2 0 0 0 4 0',
  mountain: 'm2 20 7-13 5 8 3-5 5 10H2',
  peak: 'm3 20 7-12 4 6 2-3 5 9zM10 8V3l4 2-4 2',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  snow: 'M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17',
  bike: 'M5.5 13a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7M18.5 13a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7M5.5 16.5 9 8h5l4.5 8.5M9 8l3.5 8.5M13 5h3',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8',
  compass: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m4 6-2.5 5.5L8 16l2.5-5.5z',
  cloud: 'M7 19h10a4.5 4.5 0 0 0 .6-8.96A6 6 0 0 0 6.2 10 4.5 4.5 0 0 0 7 19z',
  wind: 'M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7',
  sunset: 'M3 18h18M7 18a5 5 0 0 1 10 0M12 4v5M4.5 10.5 6 12M19.5 10.5 18 12',
  flag: 'M5 21V4h11l-2 4 2 4H5',
  uturn: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  play: 'M7 4.5v15l12-7.5z',
  pause: 'M8 5v14M16 5v14',
  stop: 'M6 6h12v12H6z',
  check: 'm5 12 4.5 4.5L19 7',
  plus: 'M12 5v14M5 12h14',
  crown: 'M12 4v16M8 6v12M16 6v12',
  hand: 'M9 11V5a1.5 1.5 0 0 1 3 0v5M12 10V4a1.5 1.5 0 0 1 3 0v6M15 10V6a1.5 1.5 0 0 1 3 0v7a7 7 0 0 1-7 7 6 6 0 0 1-5-3l-2.5-4.5a1.5 1.5 0 0 1 2.6-1.5L9 13',
  rotate: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
  button: 'M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
  keyboard: 'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M8 14h8',
  ruler: 'M3 17 17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2',
  swipe: 'M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4',
  tap2: 'M9 9a3 3 0 1 1 6 0M6 9a6 6 0 1 1 12 0M12 9v12',
  shoe: 'M2 15.5V12c2 0 4-.6 5.5-2.3L9 8l2.2 1.6L13 8.5c.8 2 2.4 3 4.6 3.4 2.6.5 4.4 1.4 4.4 3.6v1H2zM2 18h20v1.5H2z',
  flame: 'M12 22c-4 0-7-2.8-7-6.6 0-3.6 2.6-5.4 3.6-8.4.9 1.5 1.7 2.3 2.7 2.6C11.6 6.6 12.4 4 15 2c-.3 3 1 5 2.6 7 1.3 1.6 1.9 3.3 1.9 5.2C19.5 18.8 16.4 22 12 22z',
  download: 'M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2',
}

export function Icon({ n, s = 24, fill = false, className, style }: { n: string; s?: number; fill?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} width={s} height={s} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={fill ? 0 : 2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[n]} />
    </svg>
  )
}
