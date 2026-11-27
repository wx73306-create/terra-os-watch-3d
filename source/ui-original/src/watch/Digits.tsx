import { useId, type CSSProperties } from 'react'

// Tall, bold monoline centerlines (cell 110×160, ~3:4 display proportion). Ordered segments weave cleanly over earlier strokes.
const LINE: Record<string, string[]> = {
  '0': ['M55 0A53 50 0 0 1 108 50V110A53 50 0 0 1 2 110V50A53 50 0 0 1 55 0Z'],
  '1': ['M16 34 40 10A26 26 0 0 1 84 28V160'],
  '2': ['M4 42A51 42 0 0 1 106 42C106 86 6 112 4 160H110'],
  '3': ['M6 0H104L54 62A50 49 0 1 1 8 132'],
  '4': ['M78 160V20A18 18 0 0 0 44.8 10.3L21.7 46.6', 'M30.1 33.4 2.8 76.3A18 18 0 0 0 18 104H110'],
  '5': ['M104 0H12V68Q34 58 56 58A50 51 0 1 1 10 134'],
  '6': ['M84 0 8 88', 'M4 110A51 50 0 1 0 106 110A51 50 0 1 0 4 110'],
  '7': ['M0 0H108L36 160'],
  '8': ['M14 36A41 36 0 1 0 96 36A41 36 0 1 0 14 36', 'M6 114A49 46 0 1 0 104 114A49 46 0 1 0 6 114'],
  '9': ['M100 72 24 160', 'M4 50A51 50 0 1 0 106 50A51 50 0 1 0 4 50'],
}

export function LineDigit({ c, h }: { c: string; h: number }) {
  const id = 'ld' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const segs = LINE[c] ?? []
  return (
    <svg className="ldig" width={(h * 142) / 192} height={h} viewBox="-16 -16 142 192" aria-hidden="true">
      <mask id={id} maskUnits="userSpaceOnUse" x="-16" y="-16" width="142" height="192">
        {segs.map((d, si) =>
          ([['#fff', 28], ['#000', 16.8], ['#fff', 5.6]] as const).map(([col, w]) => (
            <path key={`${si}-${w}`} d={d} pathLength={1} fill="none" stroke={col} strokeWidth={w} strokeLinejoin="round" className="ld-draw" />
          )),
        )}
      </mask>
      <rect x="-16" y="-16" width="142" height="192" fill="currentColor" mask={`url(#${id})`} />
    </svg>
  )
}

// Block digits (cell 118×340): seven tall chunky segments, top half light / bottom half dark
const SEG: Record<string, [number, number, number, number]> = {
  a: [0, 0, 118, 38], b: [80, 0, 38, 186], c: [80, 192, 38, 148], d: [0, 302, 118, 38],
  e: [0, 192, 38, 148], f: [0, 0, 38, 186], g: [0, 152, 118, 68],
}
const MAP: Record<string, string> = { '0': 'abcdef', '2': 'abged', '3': 'abgcd', '4': 'fbgc', '5': 'afgcd', '6': 'afgecd', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg' }
const GAP = 18

export function BlockClock({ t, h }: { t: string; h: number }) {
  const gid = 'bg' + useId().replace(/[^a-zA-Z0-9]/g, '')
  let x = 0
  const parts = Array.from(t).map((ch, i) => {
    const w = ch === ':' ? 36 : ch === '1' ? 70 : 118
    const at = x
    x += w + GAP
    let rects: [number, number, number, number][]
    if (ch === ':') rects = [[0, 84, 36, 72], [0, 198, 36, 72]]
    else if (ch === '1') rects = [[32, 0, 38, 186], [32, 192, 38, 148], [0, 26, 42, 38]]
    else rects = Array.from(MAP[ch] ?? '').map(k => SEG[k])
    return (
      <g key={`${i}:${ch}`} className={ch === ':' ? 'bk-colon' : 'bk-dig'} transform={`translate(${at} 0)`}>
        <g className="bk-in">
          {rects.map(([rx, ry, rw, rh], j) => <rect key={j} x={rx} y={ry} width={rw} height={rh} rx={12} fill={ch === ':' ? '#0e141b' : `url(#${gid})`} />)}
        </g>
      </g>
    )
  })
  const W = x - GAP
  return (
    <svg className="bclock" height={h} width={(h * W) / 340} viewBox={`0 0 ${W} 340`} aria-label={t} role="img">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="340" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".555" stopColor="#e8eef5" /><stop offset=".555" stopColor="#0e141b" /><stop offset="1" stopColor="#1a222c" />
        </linearGradient>
      </defs>
      {parts}
    </svg>
  )
}

export const WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
export const pad2 = (n: number) => String(n).padStart(2, '0')
export const sec = (s: number) => ({ '--s': s / 59 }) as CSSProperties
