import { BlockClock, LineDigit, WEEK, pad2, sec } from './Digits'
import { Icon } from './Icon'

// Two always-on standby covers, drawn at the 480×352 screen size
export function Standby({ kind, now }: { kind: number; now: Date }) {
  const hm = pad2(now.getHours()) + pad2(now.getMinutes())
  const s = now.getSeconds()
  const md = `${pad2(now.getMonth() + 1)}.${pad2(now.getDate())}`
  const wd = WEEK[now.getDay()]

  if (kind === 1) {
    return (
      <div className="sb sb-b">
        <svg className="sb-waves" viewBox="0 0 480 352" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 210C90 150 170 250 280 190S430 90 480 120V352H0Z" fill="#ffffff1f" />
          <path d="M0 260C120 220 210 300 320 250S440 190 480 210V352H0Z" fill="#ffffff26" />
          <path d="M250 0C300 70 360 90 480 60V0Z" fill="#0a5fb31f" />
        </svg>
        <BlockClock t={`${hm.slice(0, 2)}:${hm.slice(2)}`} h={244} />
        <span className="sb-b-date">{wd} {md}</span>
      </div>
    )
  }
  return (
    <div className="sb sb-a">
      <svg className="sb-surf" viewBox="0 0 480 352" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="sbs1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5a5a5c" /><stop offset=".5" stopColor="#2a2a2c" /><stop offset="1" stopColor="#141415" /></linearGradient>
          <linearGradient id="sbs2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c9c9cb" /><stop offset=".45" stopColor="#6d6d70" /><stop offset="1" stopColor="#1c1c1e" /></linearGradient>
        </defs>
        <path d="M372 0H480V352H250C320 300 312 220 330 150 344 92 330 40 372 0Z" fill="url(#sbs1)" />
        <path d="M480 132C410 140 392 230 344 292 324 318 300 340 268 352H480Z" fill="url(#sbs2)" />
      </svg>
      <div className="sb-digits">{Array.from(hm).map((c, i) => <LineDigit key={`${i}:${c}`} c={c} h={132} />)}</div>
      <svg className="sb-orbit" viewBox="0 0 290 56" aria-hidden="true">
        <line x1="0" y1="28" x2="290" y2="28" />
        <circle cx="74" cy="28" r="26" className="o-ring" />
        <circle cx="66" cy="28" r="3.5" className="o-dot" />
        <g className="o-sat" style={{ transform: `rotate(${s * 6}deg)` }}>
          <circle cx="100" cy="28" r="7" className="o-sat-r" /><circle cx="100" cy="28" r="2.8" className="o-dot" />
        </g>
      </svg>
      <div className="sb-line"><i style={sec(s)} /></div>
      <div className="sb-date">
        <span>{wd}</span><b>{md}</b>
        <i className="sb-bar"><i style={{ width: '58%' }} /><em /><em /></i>
      </div>
      <div className="sb-comps">
        <div><Icon n="shoe" s={22} fill /><b>4088</b></div>
        <div><Icon n="flame" s={22} fill /><b>182</b></div>
        <div><i className="bat"><i style={{ width: '84%' }} /></i><b>84%</b></div>
      </div>
    </div>
  )
}
