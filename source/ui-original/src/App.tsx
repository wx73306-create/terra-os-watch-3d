import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { Icon } from './watch/Icon'
import { Scene } from './watch/Scene'
import { LineDigit, WEEK, sec } from './watch/Digits'
import { Standby } from './watch/Standby'
import { apps, forecast, guideFor, hrHistory, sports, wallpapers, waypoints, zoneNames, zoneOf, zones, type ScreenId } from './watch/data'

type Display = 'std' | 'sun' | 'night'
type Anim = 'push' | 'pop' | 'up' | 'down'
type Workout = { status: 'idle' | 'running' | 'paused'; sport: number; t: number; dist: number; climb: number; hr: number; hrSum: number; hrN: number; laps: { dist: number; t: number }[] }
type Summary = { sport: number; t: number; dist: number; avgHr: number; climb: number; laps: number }
type Card = { label: string; value: string; unit?: string; color: string; icon: string; p?: number }

const newWorkout = (sport = 0): Workout => ({ status: 'idle', sport, t: 0, dist: 0, climb: 0, hr: 86, hrSum: 0, hrN: 0, laps: [] })
const pad = (n: number) => String(n).padStart(2, '0')
const fmt = (s: number) => `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`
const mmss = (s: number) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const clockAt1441 = () => {
  const d = new Date()
  d.setHours(14, 41)
  return d
}
const km = (d: number) => (d >= 100 ? d.toFixed(1) : d.toFixed(2))
const pace = (sec: number, dist: number) => {
  if (dist < 0.01) return `--'--"`
  const p = Math.min(5999, Math.round(sec / dist))
  return `${Math.floor(p / 60)}'${pad(p % 60)}"`
}
const CROWN_STEP = 14
const WHEEL_STEP = 60

// iOS-style numeric content transition: only the characters that change re-mount and roll in
function Num({ v }: { v: string }) {
  return (
    <span className="num" aria-label={v}>
      {Array.from(v).map((c, i) => <span key={`${i}:${c}`} className="nd" aria-hidden="true">{c}</span>)}
    </span>
  )
}

function StackCards({ cards, front, onClick, label }: { cards: Card[]; front: number; onClick: () => void; label: string }) {
  const n = cards.length
  return (
    <button className="stack" onClick={onClick} aria-label={label}>
      {cards.map((c, i) => {
        const d = (i - front + n) % n
        return (
          <div key={c.label} className={`card lg d${d}`} style={{ transform: `translateY(${-d * 14}px) scale(${1 - d * 0.08})`, zIndex: 9 - d, '--cc': c.color } as CSSProperties}>
            <span className="card-label"><Icon n={c.icon} s={20} />{c.label}</span>
            {c.p !== undefined && (
              <svg className="gauge" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" className="g-track" />
                <circle cx="12" cy="12" r="9" className="g-prog" style={{ strokeDasharray: `${Math.max(0.02, Math.min(1, c.p)) * 56.55} 56.55` }} />
              </svg>
            )}
            <b className="card-value"><Num v={c.value} /><small>{c.unit}</small></b>
          </div>
        )
      })}
    </button>
  )
}

const Notch = ({ state }: { state: string }) => <div className={`notch ${state}`}><span /></div>

export default function App() {
  const [now, setNow] = useState(clockAt1441)
  const [stack, setStack] = useState<ScreenId[]>(['face'])
  const [anim, setAnim] = useState<Anim>('push')
  const [wall, setWall] = useState(0)
  const [editF, setEditF] = useState(0)
  const [faceStack, setFaceStack] = useState(0)
  const [appsF, setAppsF] = useState(0)
  const [sportsF, setSportsF] = useState(0)
  const [view, setView] = useState(0)
  const [wStack, setWStack] = useState(0)
  const [navStack, setNavStack] = useState(0)
  const [wp, setWp] = useState(0)
  const [tracBack, setTracBack] = useState(false)
  const [heading, setHeading] = useState(42)
  const [hourF, setHourF] = useState(0)
  const [flashLvl, setFlashLvl] = useState(4)
  const [display, setDisplay] = useState<Display>('std')
  const [dnd, setDnd] = useState(false)
  const [lastSport, setLastSport] = useState(0)
  const [wk, setWk] = useState<Workout>(() => newWorkout())
  const [summary, setSummary] = useState<Summary | null>(null)
  const [cd, setCd] = useState<number | null>(null)
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null)
  const [input, setInput] = useState<{ text: string; id: number } | null>(null)
  const [crownRot, setCrownRot] = useState(0)
  const [pressed, setPressed] = useState<'crown' | 'action' | null>(null)
  const [real, setReal] = useState(false)
  const [scale, setScale] = useState(1)
  const [crownInd, setCrownInd] = useState(false)
  const [aod, setAod] = useState(false)
  const [cover, setCover] = useState(0)
  const [dt, setDt] = useState(0)

  const screen = stack[stack.length - 1]
  const glassRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const crownDrag = useRef<{ y: number; acc: number; moved: boolean } | null>(null)
  const wheelAcc = useRef(0)
  const hold = useRef<{ timer: number; fired: boolean }>({ timer: 0, fired: false })
  const drag = useRef<{ x: number; y: number; axis: '' | 'x' | 'y'; dx: number; dy: number } | null>(null)
  const suppressClick = useRef(false)
  const indTimer = useRef(0)
  const tiltRaf = useRef(0)
  const reduced = useRef(typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  // ---------- timers ----------
  useEffect(() => {
    const id = setInterval(() => setNow(clockAt1441()), 1000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    const el = glassRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / 480))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    if (wk.status !== 'running') return
    const id = setInterval(() => {
      setWk(w => {
        const s = sports[w.sport]
        const hr = Math.round(Math.min(178, Math.max(80, w.hr + (s.hr - w.hr) * 0.07 + (Math.random() * 6 - 3))))
        return { ...w, t: w.t + 1, dist: w.dist + s.spd * (0.85 + Math.random() * 0.3), climb: w.climb + (Math.random() < 0.3 ? 1 : 0), hr, hrSum: w.hrSum + hr, hrN: w.hrN + 1 }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [wk.status])
  useEffect(() => {
    if (screen !== 'nav') return
    const id = setInterval(() => setHeading(h => (h + Math.round(Math.random() * 10 - 5) + 360) % 360), 1500)
    return () => clearInterval(id)
  }, [screen])
  useEffect(() => {
    if (cd === null) return
    if (cd === 0) {
      setCd(null)
      setWk(w => ({ ...w, status: 'running' }))
      setView(0)
      setAnim('push')
      setStack(['face', 'workout'])
      buzz(true)
      return
    }
    const id = setTimeout(() => { setCd(c => (c === null ? null : c - 1)); buzz() }, 900)
    return () => clearTimeout(id)
  }, [cd])
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 1900)
    return () => clearTimeout(id)
  }, [toast])
  useEffect(() => {
    wrapRef.current?.focus({ preventScroll: true })
  }, [])

  // ---------- feedback ----------
  function buzz(strong = false) {
    if (reduced.current) return
    const a = strong ? 2.5 : 1.2
    // animate `translate` so it composes with the tilt transform
    wrapRef.current?.animate([{ translate: '0 0' }, { translate: `${a}px 0` }, { translate: `-${a}px 0` }, { translate: '0 0' }], { duration: strong ? 180 : 110 })
  }
  function bounce(d: number) {
    if (reduced.current) return
    stageRef.current?.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${d > 0 ? -10 : 10}px)` }, { transform: 'translateY(0)' }], { duration: 260, easing: 'cubic-bezier(.3,1.6,.5,1)' })
  }
  const say = (text: string) => setToast({ text, id: Date.now() })
  const feel = (text: string) => setInput({ text, id: Date.now() })
  // lowered wrist: the first interaction only wakes the screen
  const wake = () => {
    if (!aod) return false
    setAod(false)
    feel('抬腕唤醒')
    return true
  }

  // ---------- navigation ----------
  const go = (s: ScreenId) => { setAnim('push'); setStack(st => [...st, s]) }
  const home = () => { setAnim('pop'); setStack(['face']) }
  const back = () => {
    if (screen === 'countdown') setCd(null)
    setAnim('pop')
    setStack(st => (st.length > 1 ? st.slice(0, -1) : st))
  }

  // ---------- workout ----------
  function startCountdown(i: number) {
    if (wk.status !== 'idle') { say('已有运动正在进行'); setAnim('push'); setStack(['face', 'workout']); return }
    setLastSport(i)
    setWk(newWorkout(i))
    setCd(3)
    setAnim('push')
    setStack(st => [...st, 'countdown'])
  }
  const pause = () => { setWk(w => ({ ...w, status: 'paused' })); buzz(true) }
  const resume = () => { setWk(w => ({ ...w, status: 'running' })); buzz(true) }
  function end() {
    setSummary({ sport: wk.sport, t: wk.t, dist: wk.dist, avgHr: wk.hrN ? Math.round(wk.hrSum / wk.hrN) : wk.hr, climb: wk.climb, laps: wk.laps.length })
    setWk(newWorkout(wk.sport))
    setAnim('push')
    setStack(['face', 'summary'])
    say('已保存到运动记录')
    buzz(true)
  }
  function lap() {
    if (wk.status !== 'running') return
    const prev = wk.laps[wk.laps.length - 1] ?? { dist: 0, t: 0 }
    const l = { dist: wk.dist, t: wk.t }
    setWk(w => ({ ...w, laps: [...w.laps, l] }))
    const ld = l.dist - prev.dist
    say(`第 ${wk.laps.length + 1} 段 · ${ld >= 0.01 ? `${ld.toFixed(2)} km · ${pace(l.t - prev.t, ld)}` : `用时 ${mmss(l.t - prev.t)}`}`)
    buzz(true)
  }

  // ---------- hardware ----------
  function step(v: number, d: number, max: number, set: (n: number) => void) {
    const n = v + d
    if (n < 0 || n > max) return bounce(d)
    set(n)
  }
  function rotate(d: number) {
    if (wake()) return
    setCrownRot(r => r + d)
    setCrownInd(true)
    clearTimeout(indTimer.current)
    indTimer.current = window.setTimeout(() => setCrownInd(false), 900)
    feel(d > 0 ? '表冠 · 向下旋转' : '表冠 · 向上旋转')
    switch (screen) {
      case 'face': setFaceStack(i => (i + d + 3) % 3); break
      case 'edit': step(editF, d, wallpapers.length - 1, setEditF); break
      case 'apps': step(appsF, d, apps.length - 1, setAppsF); break
      case 'sports': step(sportsF, d, sports.length - 1, setSportsF); break
      case 'workout':
        if (wk.status === 'paused') return bounce(d)
        step(view, d, 2, n => { setAnim(d > 0 ? 'up' : 'down'); setView(n) })
        break
      case 'nav': step(wp, d, waypoints.length - 1, n => { setWp(n); setTracBack(n === waypoints.length - 1 && tracBack) }); break
      case 'weather': step(hourF, d, forecast.length - 1, setHourF); break
      case 'flash': step(flashLvl, d, 5, n => setFlashLvl(Math.max(1, n))); break
      default: bounce(d)
    }
  }
  function pressCrown() {
    if (wake()) return
    feel('按下表冠')
    switch (screen) {
      case 'face': go('apps'); break
      case 'edit': confirmEdit(); break
      case 'countdown': back(); break
      case 'flash': back(); break
      default: home()
    }
  }
  function primary() {
    switch (screen) {
      case 'countdown': setCd(0); break
      case 'sports': startCountdown(sportsF); break
      case 'workout': if (wk.status === 'running') pause(); else if (wk.status === 'paused') resume(); break
      case 'summary': home(); break
      case 'edit': confirmEdit(); break
      case 'flash': back(); break
      default:
        if (wk.status !== 'idle') { setAnim('push'); setStack(['face', 'workout']) }
        else startCountdown(lastSport)
    }
  }
  function pressAction() {
    if (wake()) return
    feel('按下操作键')
    buzz()
    primary()
  }
  function toggleTrac() {
    const t = !tracBack
    setTracBack(t)
    if (t) { setWp(waypoints.length - 1); say('开始返航 · 沿原路线回到起点') }
  }
  // watchOS Double Tap: runs the primary action of the current screen
  function doubleTap() {
    if (wake()) return
    feel('双指互点 · 执行主操作')
    buzz()
    setDt(Date.now())
    switch (screen) {
      case 'apps': go(apps[appsF].id); break
      case 'nav': toggleTrac(); break
      case 'weather': setHourF(h => (h + 1) % forecast.length); break
      case 'control': case 'hr': back(); break
      default: primary()
    }
  }
  function confirmEdit() {
    setWall(editF)
    home()
    say(`壁纸已更换为「${wallpapers[editF].name}」`)
  }

  // Native non-passive wheel listener so scrolling over the watch turns the crown instead of the page
  const rotateRef = useRef(rotate)
  rotateRef.current = rotate
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const on = (e: globalThis.WheelEvent) => {
      e.preventDefault()
      wheelAcc.current += e.deltaY
      while (Math.abs(wheelAcc.current) >= WHEEL_STEP) {
        const s = Math.sign(wheelAcc.current)
        wheelAcc.current -= s * WHEEL_STEP
        rotateRef.current(s)
      }
    }
    el.addEventListener('wheel', on, { passive: false })
    return () => el.removeEventListener('wheel', on)
  }, [])

  const crownDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    crownDrag.current = { y: e.clientY, acc: 0, moved: false }
    setPressed('crown')
  }
  const crownMove = (e: PointerEvent<HTMLButtonElement>) => {
    const c = crownDrag.current
    if (!c) return
    c.acc += e.clientY - c.y
    c.y = e.clientY
    while (Math.abs(c.acc) >= CROWN_STEP) {
      const s = Math.sign(c.acc)
      c.acc -= s * CROWN_STEP
      c.moved = true
      rotate(s)
    }
  }
  const crownUp = () => {
    const c = crownDrag.current
    crownDrag.current = null
    setPressed(null)
    if (c && !c.moved) pressCrown()
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const self = e.target === e.currentTarget
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); rotate(1) }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); rotate(-1) }
    else if (e.key === 'Enter' && self) { e.preventDefault(); pressCrown() }
    else if (e.key === ' ' && self) { e.preventDefault(); pressAction() }
    else if (e.key === 'Escape') back()
    else if (e.key.toLowerCase() === 'l') lap()
    else if (e.key.toLowerCase() === 'd') doubleTap()
  }
  const holdStart = (e: PointerEvent<HTMLElement>) => {
    const el = e.currentTarget
    hold.current.fired = false
    el.classList.add('holding')
    hold.current.timer = window.setTimeout(() => { hold.current.fired = true; buzz(true); setEditF(wall); go('edit') }, 600)
  }
  const holdEnd = () => {
    clearTimeout(hold.current.timer)
    stageRef.current?.querySelector('.holding')?.classList.remove('holding')
  }

  // ---------- touch gestures (drag-follow, no React re-render while moving) ----------
  const lateral = screen === 'edit' || screen === 'weather'
  const canBack = !lateral && stack.length > 1
  const gDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || aod) return
    drag.current = { x: e.clientX, y: e.clientY, axis: '', dx: 0, dy: 0 }
  }
  const gMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const dx = (e.clientX - d.x) / scale
    const dy = (e.clientY - d.y) / scale
    if (!d.axis) {
      if (Math.hypot(dx, dy) < 12) return
      d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      holdEnd()
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    d.dx = dx
    d.dy = dy
    const el = stageRef.current?.firstElementChild as HTMLElement | null
    if (!el) return
    const lim = screen === 'face' ? 10 : 44
    const rub = (v: number, k: number) => Math.sign(v) * Math.min(Math.abs(v) * k, lim)
    el.classList.add('dragging')
    if (d.axis === 'x' && canBack && dx > 0) {
      el.style.transform = `translateX(${dx * 0.85}px) scale(${1 - Math.min(dx, 240) / 2400})`
      el.style.opacity = String(1 - Math.min(dx, 260) / 520)
    } else {
      el.style.transform = d.axis === 'x' ? `translateX(${rub(dx, 0.3)}px)` : `translateY(${rub(dy, 0.35)}px)`
    }
  }
  const gUp = () => {
    const d = drag.current
    drag.current = null
    if (!d || !d.axis) return
    suppressClick.current = true
    setTimeout(() => { suppressClick.current = false })
    const el = stageRef.current?.firstElementChild as HTMLElement | null
    if (el) { el.classList.remove('dragging'); el.style.transform = ''; el.style.opacity = '' }
    if (d.axis === 'x') {
      if (lateral && Math.abs(d.dx) > 50) { rotate(d.dx < 0 ? 1 : -1); feel(d.dx < 0 ? '左滑 · 下一项' : '右滑 · 上一项') }
      else if (canBack && d.dx > 80) { back(); feel('右滑 · 返回') }
    } else if (Math.abs(d.dy) > 36) {
      rotate(d.dy < 0 ? 1 : -1)
      feel(d.dy < 0 ? '上滑 · 下一页' : '下滑 · 上一页')
    }
  }

  // ---------- device tilt + wallpaper parallax (CSS vars only) ----------
  const TILT = ['--rx', '--ry', '--px', '--py', '--gx', '--gy']
  const tilt = (e: PointerEvent<HTMLElement>) => {
    if (reduced.current || e.pointerType !== 'mouse' || crownDrag.current) return
    const w = wrapRef.current
    if (!w) return
    const r = w.getBoundingClientRect()
    const nx = Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / (r.width * 0.7)))
    const ny = Math.max(-1, Math.min(1, (e.clientY - r.top - r.height / 2) / (r.height * 0.9)))
    cancelAnimationFrame(tiltRaf.current)
    tiltRaf.current = requestAnimationFrame(() => {
      const v = [`${-ny * 5}deg`, `${nx * 7}deg`, `${-nx * 6}px`, `${-ny * 6}px`, `${nx * 12}%`, `${ny * 10}%`]
      TILT.forEach((p, i) => w.style.setProperty(p, v[i]))
    })
  }
  const untilt = () => {
    cancelAnimationFrame(tiltRaf.current)
    TILT.forEach(p => wrapRef.current?.style.removeProperty(p))
  }
  // Liquid Glass specular highlight follows the finger
  const glint = (e: PointerEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.lg')
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
  }

  // ---------- derived ----------
  const active = wk.status !== 'idle'
  const notch = wk.status === 'running' ? 'live' : wk.status === 'paused' ? 'paused' : ''
  const sp = sports[wk.sport]
  const z = zoneOf(wk.hr)
  const restBpm = 72 + Math.round(Math.sin(Date.now() / 5000) * 3)
  const bpm = wk.status === 'running' ? wk.hr : restBpm
  const date = `周${'日一二三四五六'[now.getDay()]} · ${now.getDate()}日`
  const mins = now.getHours() * 60 + now.getMinutes()
  const sunUp = mins >= 6 * 60 + 58 && mins < 18 * 60 + 42
  const sunEvent = sunUp ? { label: '日落', time: '18:42', left: 18 * 60 + 42 - mins } : { label: '日出', time: '06:58', left: (6 * 60 + 58 - mins + 1440) % 1440 }
  const target = waypoints[wp]
  const eta = new Date(now.getTime() + (target.d / 4.2) * 3600000)
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const guide = guideFor(screen, wk.status)
  const dtAction = screen === 'apps' ? '打开所选应用' : screen === 'nav' ? '开始 / 停止返航' : screen === 'weather' ? '查看下一时段' : screen === 'control' || screen === 'hr' ? '返回' : guide.action
  const dots: Partial<Record<ScreenId, [number, number]>> = { face: [3, faceStack], apps: [apps.length, appsF], sports: [sports.length, sportsF], workout: [3, view], nav: [3, wp], weather: [forecast.length, hourF], edit: [wallpapers.length, editF], flash: [5, flashLvl - 1] }
  const [dotN, dotI] = dots[screen] ?? [1, 0]
  const tpl = screen === 'face' || screen === 'nav' || (screen === 'workout' && view === 0)
  const animKey = screen + (screen === 'workout' ? view : '')

  const faceCards: (Card & { app: ScreenId })[] = [
    { label: '海拔', value: '4808', unit: 'm', color: '#64d2ff', icon: 'mountain', app: 'nav', p: 4808 / 5120 },
    { label: '心率', value: String(bpm), unit: 'bpm', color: '#ff375f', icon: 'heart', app: 'hr', p: bpm / 190 },
    { label: '气温', value: String(forecast[0].t), unit: '°C', color: '#f5c86a', icon: 'sun', app: 'weather' },
  ]
  const listOffset = (f: number, n: number) => Math.max(0, Math.min(f - 1, n - 3)) * 96

  // ---------- screens ----------
  function renderScreen() {
    switch (screen) {
      case 'face':
        return (
          <>
            <section className="hero" onPointerDown={holdStart} onPointerUp={holdEnd} onPointerLeave={holdEnd}>
              <Scene i={wall} className="art" />
              <div className="scrim" />
              <div className="h-clock" aria-label={hhmm(now)}>
                <div className="h-digits">{Array.from(hhmm(now).replace(':', '')).map((c, i) => <LineDigit key={`${i}:${c}`} c={c} h={108} />)}</div>
                <div className="h-sec"><i style={sec(now.getSeconds())} /></div>
                <div className="h-date">
                  <span>{WEEK[now.getDay()]}</span>
                  <b>{pad(now.getMonth() + 1)}.{pad(now.getDate())}</b>
                  <i className="h-bar"><i style={{ width: `${(mins / 1440) * 100}%` }} /></i>
                </div>
              </div>
              <button className={`cta lg ${active ? 'live' : ''}`} onClick={() => { if (hold.current.fired) return; if (active) { setAnim('push'); setStack(['face', 'workout']) } else go('sports') }}>
                <span>{active ? <i className="live-dot" /> : <Icon n="plus" s={24} />}</span>{active ? '返回' : '运动'}
              </button>
            </section>
            <button className="cut lg" onClick={() => go('weather')}>
              <span className="lbl"><Icon n="sunset" s={20} />{sunEvent.label}</span><b className="val"><Num v={sunEvent.time} /></b>
            </button>
            <div className="pill lg">
              {active ? <><i className={`rec ${wk.status}`} /><Num v={mmss(wk.t)} /></> : <>{dnd && <Icon n="moon" s={20} />}<i className="bat"><i style={{ width: '84%' }} /></i>84%</>}
            </div>
            <StackCards cards={faceCards} front={faceStack} label={`打开${faceCards[faceStack].label}`} onClick={() => go(faceCards[faceStack].app)} />
            <button className="fan lg" onClick={() => { setEditF(wall); go('edit') }} aria-label="更换壁纸">
              <span className="lbl">壁纸</span>
              {wallpapers.map((w, i) => {
                const pos = (i - wall + wallpapers.length) % wallpapers.length
                return <div key={w.src} className="thumb" style={{ transform: `rotate(${-pos * 13}deg)`, zIndex: 9 - pos, opacity: 1 - pos * 0.15 }}><Scene i={i} /></div>
              })}
            </button>
          </>
        )
      case 'edit':
        return (
          <section className="col">
            <div className="head"><b>选择壁纸</b><span>{editF + 1} / {wallpapers.length}</span></div>
            <button className="e-preview" onClick={confirmEdit}>
              <Scene i={editF} key={editF} className="art" />
              <div className="scrim" />
              <b>{hhmm(now)}</b>
              <span className="e-name">{wallpapers[editF].name}</span>
              <span className="e-done lg"><Icon n="check" s={20} />轻触确认</span>
            </button>
            <div className="e-thumbs">
              {wallpapers.map((w, i) => <button key={w.src} className={i === editF ? 'on' : ''} onClick={() => setEditF(i)} aria-label={w.name}><Scene i={i} /></button>)}
            </div>
          </section>
        )
      case 'apps':
        return (
          <section className="col">
            <div className="head"><b>应用</b><span>{hhmm(now)}</span></div>
            <div className="list"><div className="list-inner" style={{ transform: `translateY(${-listOffset(appsF, apps.length)}px)` }}>
              {apps.map((a, i) => {
                const sub = a.id === 'sports' ? (active ? `进行中 · ${fmt(wk.t)}` : `上次 ${sports[lastSport].n}`) : a.id === 'nav' ? `${waypoints[0].n} · ${waypoints[0].d} km` : a.id === 'hr' ? `${bpm} bpm` : `${forecast[0].t}° · 15 时有雪`
                return (
                  <button key={a.id} className={`row lg ${i === appsF ? 'focus' : ''}`} onClick={() => { setAppsF(i); go(a.id) }}>
                    <span className="ricon" style={{ '--ic': a.color, '--ink': a.ink } as CSSProperties}><Icon n={a.icon} s={28} /></span>
                    <span className="rtext"><b>{a.n}</b><small>{sub}</small></span>
                    <Icon n="chev" s={24} className="rchev" />
                  </button>
                )
              })}
            </div></div>
          </section>
        )
      case 'sports':
        return (
          <section className="col">
            <div className="head"><b>开始运动</b><span>{hhmm(now)}</span></div>
            <div className="list"><div className="list-inner" style={{ transform: `translateY(${-listOffset(sportsF, sports.length)}px)` }}>
              {sports.map((s, i) => (
                <button key={s.n} className={`row lg ${i === sportsF ? 'focus' : ''}`} onClick={() => { setSportsF(i); startCountdown(i) }}>
                  <span className="ricon gold"><Icon n={s.icon} s={28} /></span>
                  <span className="rtext"><b>{s.n}</b><small>{s.last}</small></span>
                  <span className="rgo"><Icon n="play" s={20} fill /></span>
                </button>
              ))}
            </div></div>
          </section>
        )
      case 'countdown':
        return (
          <button className="countdown" onClick={() => setCd(0)} aria-label="跳过倒计时">
            <svg viewBox="0 0 100 100" className="cd-ring"><circle cx="50" cy="50" r="44" className="track" /><circle cx="50" cy="50" r="44" className="prog" key={cd} /></svg>
            <b key={'n' + cd}>{cd || ''}</b>
            <span>{sp.n} · 轻触跳过</span>
          </button>
        )
      case 'workout':
        if (view === 0) {
          const prev = wk.laps[wk.laps.length - 1] ?? { dist: 0, t: 0 }
          return (
            <>
              <section className="hero solid">
                <div className="glow" style={{ '--zc': zones[z] } as CSSProperties} />
                <div className="w-main">
                  <span className="lbl">{sp.n} · 距离 km</span>
                  <b className="big"><Num v={km(wk.dist)} /></b>
                  <span className="lbl">用时</span>
                  <b className="mid"><Num v={fmt(wk.t)} /></b>
                </div>
                <button className="cta lg" onClick={pause}><span><Icon n="pause" s={22} /></span>暂停</button>
              </section>
              <Notch state={notch} />
              <div className="cut lg"><span className="lbl"><Icon n="mountain" s={20} />爬升</span><b className="val"><Num v={`+${wk.climb}`} /><small>m</small></b></div>
              <div className="pill lg zone" style={{ color: zones[z] }}><i className="zdot" />Z{z + 1} {zoneNames[z]}</div>
              <StackCards
                cards={[
                  { label: '心率', value: String(wk.hr), unit: 'bpm', color: zones[z], icon: 'heart', p: wk.hr / 190 },
                  { label: '配速', value: pace(wk.t, wk.dist), color: '#f5c86a', icon: 'bolt' },
                  { label: '本段', value: (wk.dist - prev.dist).toFixed(2), unit: 'km', color: '#64d2ff', icon: 'flag', p: wk.dist - prev.dist },
                ]}
                front={wStack} label="切换数据卡片" onClick={() => setWStack(i => (i + 1) % 3)} />
              <button className="fan lg laps" onClick={lap} aria-label="记录分段">
                <span className="lbl">分段</span>
                {wk.laps.length === 0
                  ? <div className="lap empty"><Icon n="plus" s={24} /></div>
                  : [0, 1, 2].filter(i => wk.laps.length - i > 0).map(i => {
                      const n = wk.laps.length - i
                      return <div key={n + '-' + i} className={`lap ${i === 0 ? 'new' : ''}`} style={{ transform: `rotate(${-i * 12}deg)`, zIndex: 9 - i, opacity: 1 - i * 0.3 }}>{n}</div>
                    })}
              </button>
            </>
          )
        }
        if (view === 1) {
          return (
            <section className="panel lg">
              <div className="p-top"><span className="lbl"><Icon n="heart" s={22} className="beat" style={{ animationDuration: `${60 / wk.hr}s`, color: zones[z] }} />心率</span><span className="lbl">{fmt(wk.t)}</span></div>
              <div className="huge"><b><Num v={String(wk.hr)} /></b><span>bpm</span></div>
              <span className="zone-name" style={{ color: zones[z] }}>Z{z + 1} · {zoneNames[z]}区间</span>
              <div className="zbar">{zones.map((c, i) => <div key={c} className={i === z ? 'on' : ''} style={{ background: c }}><span>Z{i + 1}</span></div>)}</div>
            </section>
          )
        }
        return (
          <section className="panel lg">
            <div className="p-top"><span className="lbl"><Icon n="mountain" s={22} />海拔</span><span className="lbl">{fmt(wk.t)}</span></div>
            <b className="alt"><Num v={String(4808 + wk.climb)} /><small>m</small></b>
            <span className="lbl white">累计爬升 +{wk.climb} m · 距山顶 {Math.max(0, 312 - wk.climb)} m</span>
            <svg className="elev" viewBox="0 0 100 40" preserveAspectRatio="none">
              <path d="M0 38 10 32 20 34 32 22 44 25 56 12 66 15 78 6 90 9 100 2V40H0Z" className="area" />
              <path d="M0 38 10 32 20 34 32 22 44 25 56 12 66 15" className="done" />
              <circle cx="66" cy="15" r="2.4" />
            </svg>
          </section>
        )
      case 'summary': {
        const s = summary ?? { sport: 0, t: 0, dist: 0, avgHr: 0, climb: 0, laps: 0 }
        return (
          <section className="col">
            <div className="s-head"><span className="ok"><Icon n="check" s={26} /></span><div><b>{sports[s.sport].n} 已完成</b><span>{date} · {s.laps} 个分段</span></div></div>
            <div className="s-grid">
              {[['距离', km(s.dist), 'km'], ['用时', fmt(s.t), ''], ['平均心率', String(s.avgHr), 'bpm'], ['爬升', `+${s.climb}`, 'm']].map(([l, v, u]) => (
                <div key={l} className="lg"><span>{l}</span><b><Num v={v} /><small>{u}</small></b></div>
              ))}
            </div>
            <button className="primary" onClick={home}>完成</button>
          </section>
        )
      }
      case 'nav':
        return (
          <>
            <section className="hero solid nav">
              <div className="dial" style={{ transform: `rotate(${-heading}deg)` }}>
                {['N', 'E', 'S', 'W'].map((d, i) => <span key={d} className={d === 'N' ? 'north' : ''} style={{ transform: `rotate(${i * 90}deg) translateY(-70px) rotate(${-i * 90 + heading}deg)` }}>{d}</span>)}
                {Array.from({ length: 24 }).map((_, i) => <i key={i} style={{ transform: `rotate(${i * 15}deg) translateY(-86px)` }} />)}
              </div>
              <div className="pointer" style={{ transform: `rotate(${target.b - heading}deg)` }}><span /></div>
              <div className="n-head"><span className="lbl">航向</span><b className="big2"><Num v={`${heading}°`} /></b><span className="dir">{dirs[Math.round(heading / 45) % 8]}</span></div>
              <button className={`cta lg ${tracBack ? 'live' : ''}`} onClick={toggleTrac}>
                <span><Icon n="uturn" s={22} /></span>{tracBack ? '返航中' : '返航'}
              </button>
            </section>
            <Notch state={notch} />
            <div className="cut lg"><span className="lbl"><Icon n="flag" s={20} />{target.n}</span><b className="val"><Num v={String(target.d)} /><small>km</small></b></div>
            <div className="pill lg"><i className="gps" />± 3 m</div>
            <StackCards
              cards={[
                { label: '到达', value: hhmm(eta), color: '#e3c08a', icon: 'flag', p: 1 - target.d / 7.5 },
                { label: '海拔', value: '4808', unit: 'm', color: '#64d2ff', icon: 'mountain', p: 4808 / 5120 },
              ]}
              front={navStack} label="切换数据卡片" onClick={() => setNavStack(i => (i + 1) % 2)} />
            <div className="fan lg profile">
              <span className="lbl">{target.climb >= 0 ? '爬升' : '下降'}</span>
              <b className="val">{Math.abs(target.climb)}<small>m</small></b>
              <svg viewBox="0 0 100 40" preserveAspectRatio="none"><path d="M0 38 12 30 22 33 35 18 46 22 58 8 68 12 80 4 100 14V40H0Z" className="area" /><path d="M0 38 12 30 22 33 35 18 46 22" className="done" /><circle cx="46" cy="22" r="4" /></svg>
            </div>
          </>
        )
      case 'hr': {
        const max = Math.max(...hrHistory, bpm)
        return (
          <section className="panel lg">
            <div className="p-top"><span className="lbl"><Icon n="heart" s={22} className="beat" style={{ animationDuration: `${60 / bpm}s`, color: '#ff375f' }} />心率</span><span className="lbl">{hhmm(now)}</span></div>
            <div className="huge"><b><Num v={String(bpm)} /></b><span>bpm</span></div>
            <span className="lbl white">{wk.status === 'running' ? `运动中 · Z${z + 1} ${zoneNames[z]}` : '静息心率 52 · 状态良好'}</span>
            <div className="bars">{[...hrHistory, bpm].map((v, i, a) => <i key={i} className={i === a.length - 1 ? 'now' : ''} style={{ height: `${(v / max) * 100}%` }} />)}</div>
            <div className="bars-x"><span>今日 6 时</span><span>现在</span></div>
          </section>
        )
      }
      case 'weather': {
        const h = forecast[hourF]
        return (
          <section className="panel lg">
            <div className="p-top"><span className="lbl"><Icon n="mountain" s={22} />海拔 4808 m</span><span className="lbl">{hhmm(now)}</span></div>
            <div className="wx"><b><Num v={`${h.t}°`} /></b><div><span className="white">{hourF === 0 ? '现在' : `${(now.getHours() + hourF) % 24} 时`}</span><span>{h.d}</span><span><Icon n="wind" s={20} /> {h.w} km/h</span></div></div>
            <div className="alert"><Icon n="snow" s={22} />{(now.getHours() + 4) % 24} 时起有降雪，建议提前下撤</div>
            <div className="hours">
              {forecast.map((f, i) => (
                <button key={i} className={`lg ${i === hourF ? 'on' : ''}`} onClick={() => setHourF(i)}>
                  <span>{i === 0 ? '现在' : `${(now.getHours() + i) % 24}时`}</span><Icon n={f.i} s={26} /><b>{f.t}°</b>
                </button>
              ))}
            </div>
          </section>
        )
      }
      case 'control': {
        const tiles = [
          { k: 'sun', n: '强光', on: display === 'sun', fn: () => { const on = display !== 'sun'; setDisplay(on ? 'sun' : 'std'); say(on ? '强光模式已开启' : '强光模式已关闭') } },
          { k: 'moon', n: '夜间', on: display === 'night', fn: () => { const on = display !== 'night'; setDisplay(on ? 'night' : 'std'); say(on ? '夜间红光模式已开启' : '夜间模式已关闭') } },
          { k: 'flash', n: '手电筒', on: false, fn: () => go('flash') },
          { k: 'belloff', n: '勿扰', on: dnd, fn: () => { setDnd(!dnd); say(!dnd ? '勿扰模式已开启' : '勿扰模式已关闭') } },
        ]
        return (
          <section className="col">
            <div className="head"><b>控制中心</b><span>{hhmm(now)}</span></div>
            <div className="tiles">
              {tiles.map(t => (
                <button key={t.k} className={`lg ${t.on ? 'on' : ''}`} onClick={() => { t.fn(); buzz() }}>
                  <Icon n={t.k} s={30} /><b>{t.n}</b><small>{t.k === 'flash' ? '轻触打开' : t.on ? '已开启' : '已关闭'}</small>
                </button>
              ))}
            </div>
          </section>
        )
      }
      default:
        return null
    }
  }

  return (
    <div className="page">
      <Scene i={wall} className="backdrop" key={'bg' + wall} />

      <header className="top">
        <div className="brand">TERRA<span>OS</span></div>
        <div className="top-copy">
          <h1>为户外而生的腕上系统</h1>
          <p>转动表冠浏览，按下表冠返回，操作键一键开始。不看说明书，也能上手。</p>
        </div>
      </header>

      <main className="main">
        <section className="device-col" onPointerMove={tilt} onPointerLeave={untilt}>
          <div
            ref={wrapRef}
            className={`watch-wrap ${real ? 'real' : ''}`}
            tabIndex={0}
            onKeyDown={onKey}
            onMouseDown={e => { e.preventDefault(); wrapRef.current?.focus({ preventScroll: true }) }}
            aria-label="TERRA 手表交互演示：方向键旋转表冠，回车按下表冠，空格按操作键"
          >
            <div className="strap top" />
            <div className="strap bottom" />
            <button
              className={`crown ${pressed === 'crown' ? 'down' : ''}`}
              style={{ backgroundPositionY: `${crownRot * 5}px` }}
              onPointerDown={crownDown} onPointerMove={crownMove} onPointerUp={crownUp} onPointerCancel={crownUp}
              aria-label="表冠：上下拖动旋转，单击按下" title="表冠：上下拖动 / 滚轮旋转，单击按下"
            />
            <button
              className={`action ${pressed === 'action' ? 'down' : ''}`}
              onPointerDown={() => setPressed('action')} onPointerUp={() => setPressed(null)} onPointerLeave={() => setPressed(null)}
              onClick={pressAction} aria-label="操作键" title="操作键：开始 / 暂停"
            />
            <div className="watch">
              <div className={`led ${screen === 'flash' ? 'on' : ''}`} style={{ opacity: screen === 'flash' ? 0.5 + flashLvl * 0.1 : undefined }} />
              <div className="bezel">
                <div className="glass" ref={glassRef}>
                  <div className={`canvas d-${display} ${aod ? 'aod' : ''}`} style={{ transform: `scale(${scale})` }}>
                    <Scene i={wall} className="screen-bg" key={'sb' + wall} />
                    <div className={`ui ${screen === 'face' ? 'on-face' : ''}`} onPointerMove={glint} onPointerDown={glint}>
                      <aside className="rail">
                        <button className="rail-top lg" onClick={() => (screen === 'face' ? go('apps') : back())} aria-label={screen === 'face' ? '应用列表' : '返回'}>
                          <Icon n={screen === 'face' ? 'spark' : 'back'} s={screen === 'face' ? 26 : 28} fill={screen === 'face'} />
                        </button>
                        <div className="rail-dots" aria-hidden="true">
                          {Array.from({ length: dotN }).map((_, i) => <i key={i} className={i === dotI ? 'on' : ''} />)}
                        </div>
                        <button className={`rail-bottom lg ${screen === 'control' ? 'on' : ''}`} onClick={() => (screen === 'control' ? back() : go('control'))} aria-label="控制中心">
                          <Icon n="sliders" s={26} />
                        </button>
                      </aside>
                      <div
                        className="stage-wrap" ref={stageRef}
                        onPointerDown={gDown} onPointerMove={gMove} onPointerUp={gUp} onPointerCancel={gUp}
                        onClickCapture={e => { if (suppressClick.current) { e.stopPropagation(); e.preventDefault() } }}
                      >
                        <div key={animKey} className={`stage-area ${tpl ? 'tpl' : ''} ${screen === 'face' ? 'is-face' : ''} a-${anim}`}>{renderScreen()}</div>
                        {screen === 'workout' && wk.status === 'paused' && (
                          <div className="paused">
                            <span className="p-tag"><Icon n="pause" s={22} />已暂停</span>
                            <b className="p-time"><Num v={fmt(wk.t)} /></b>
                            <span className="lbl white">{sp.n} · {km(wk.dist)} km · +{wk.climb} m</span>
                            <div className="p-btns">
                              <button className="go lg" onClick={resume}><Icon n="play" s={28} fill />继续</button>
                              <button className="stop lg" onClick={end}><Icon n="stop" s={26} fill />结束</button>
                            </div>
                          </div>
                        )}
                      </div>
                      {toast && <div className="toast lg" key={toast.id}>{toast.text}</div>}
                      <div className={`crown-ind ${crownInd ? 'on' : ''}`} aria-hidden="true">
                        <i style={{ '--p': dotN > 1 ? dotI / (dotN - 1) : 0 } as CSSProperties} />
                      </div>
                    </div>
                    {dt > 0 && <div className="dt" key={dt} />}
                    {screen === 'flash' && (
                      <button className="flash" onClick={back} aria-label="关闭手电筒">
                        <i style={{ opacity: 0.35 + flashLvl * 0.13 }} />
                        <span>亮度 {flashLvl}/5 · 轻触关闭</span>
                      </button>
                    )}
                    {display === 'night' && <div className="night" />}
                    {aod && <Standby kind={cover} now={now} />}
                    {aod && <button className="aod-wake" onClick={() => wake()} aria-label="轻触唤醒屏幕" />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="feedback">{input && <span key={input.id}>{input.text}</span>}</div>

          <div className="quick">
            <button onClick={() => { setAnim('push'); if (wk.status === 'idle') { setStack(['face']); setTimeout(() => startCountdown(0)) } else setStack(['face', 'workout']) }}><Icon n="play" s={16} fill />开始徒步</button>
            <button onClick={() => { setAnim('push'); setStack(['face', 'apps', 'nav']); setAppsF(1) }}><Icon n="compass" s={16} />打开导航</button>
            <button onClick={() => { setAnim('push'); setStack(['face', 'control']) }}><Icon n="sliders" s={16} />控制中心</button>
            <button onClick={doubleTap}><Icon n="tap2" s={16} />双指互点</button>
            <button className={aod ? 'on' : ''} onClick={() => { if (aod) wake(); else { setAod(true); feel('放下手腕 · 屏幕转为常亮低功耗') } }}><Icon n="moon" s={16} />{aod ? '抬起手腕' : '放下手腕'}</button>
            <button onClick={() => { const c = aod ? 1 - cover : cover; setCover(c); setAod(true); feel(`待机封面 · ${c ? '方块' : '线迹'}`) }}><Icon n="spark" s={16} />{aod ? `换成${cover ? '线迹' : '方块'}封面` : '待机封面'}</button>
            <button className={real ? 'on' : ''} onClick={() => setReal(!real)}><Icon n="ruler" s={16} />1:1 实物尺寸</button>
            <a href={`${import.meta.env.BASE_URL}terra-os-watch.zip`} download="terra-os-watch.zip" target="_blank" rel="noopener noreferrer" onClick={() => feel('开始下载 · terra-os-watch.zip')}><Icon n="download" s={16} />下载项目包</a>
          </div>
        </section>

        <aside className="guide">
          <span className="kicker">当前界面</span>
          <h2 key={guide.title}>{guide.title}</h2>
          <p className="g-desc">{guide.desc}</p>
          <ul className="g-list">
            {[
              { i: 'rotate', k: '旋转表冠', v: guide.crown, hint: '拖动表冠 / 鼠标滚轮 / ↑↓' },
              { i: 'crown', k: '按下表冠', v: guide.press, hint: '单击表冠 / Enter' },
              { i: 'button', k: '操作键', v: guide.action, hint: '侧面按键 / 空格' },
              { i: 'hand', k: '轻触屏幕', v: guide.tap, hint: '点击屏幕' },
              { i: 'swipe', k: '滑动屏幕', v: lateral ? '左右滑切换' : canBack ? '右滑返回 · 上下滑同表冠' : '上下滑同表冠', hint: '在屏幕上拖动' },
              { i: 'tap2', k: '双指互点', v: dtAction, hint: '快捷按钮 / D 键' },
            ].map(r => (
              <li key={r.k} className={r.v === '—' ? 'off' : ''}>
                <span className="g-icon"><Icon n={r.i} s={20} /></span>
                <div><b>{r.k}</b><p>{r.v}</p><small>{r.hint}</small></div>
              </li>
            ))}
          </ul>
          <div className="g-status">
            <span className={active ? 'on' : ''}><i />{wk.status === 'running' ? `运动中 ${fmt(wk.t)}` : wk.status === 'paused' ? '运动已暂停' : '未在运动'}</span>
            <span className={display !== 'std' ? 'on' : ''}><i />{display === 'sun' ? '强光模式' : display === 'night' ? '夜间红光' : '标准显示'}</span>
            {dnd && <span className="on"><i />勿扰</span>}
          </div>
          <div className="g-specs">
            <div><b>≥ 22</b><span>屏内最小字号<br />约 1.8 mm</span></div>
            <div><b>≤ 5</b><span>每屏数据项<br />一瞥可读</span></div>
            <div><b>≥ 72</b><span>主要按钮高度<br />戴手套可点</span></div>
          </div>
        </aside>
      </main>
    </div>
  )
}
