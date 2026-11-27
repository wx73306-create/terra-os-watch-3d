import { wallpapers } from './data'

// Two source photos are stored rotated 90°, so they are corrected with CSS
export function Scene({ i, className = '' }: { i: number; className?: string }) {
  const f = wallpapers[i]
  return (
    <div className={`scene ${className}`}>
      <div className={f.rot ? 'rot' : 'flat'} style={{ backgroundImage: `url(${f.src})` }} />
    </div>
  )
}
