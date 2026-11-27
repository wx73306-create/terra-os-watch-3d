export type ScreenId = 'face' | 'edit' | 'apps' | 'sports' | 'countdown' | 'workout' | 'summary' | 'nav' | 'hr' | 'weather' | 'control' | 'flash'

export const wallpapers = [
  { src: '/assets/scenes/valley.jpg', name: '山谷晨光', rot: false },
  { src: '/assets/scenes/city.jpg', name: '古城黄昏', rot: true },
  { src: '/assets/scenes/sunset.jpg', name: '海岸日落', rot: true },
  { src: '/assets/scenes/lake.jpg', name: '湖畔午后', rot: false },
]

export const sports = [
  { n: '徒步', icon: 'mountain', last: '上次 12.4 km', spd: 0.0013, hr: 118 },
  { n: '越野跑', icon: 'bolt', last: '上次 8.6 km', spd: 0.0028, hr: 152 },
  { n: '登山', icon: 'peak', last: '上次爬升 1,240 m', spd: 0.0009, hr: 136 },
  { n: '骑行', icon: 'bike', last: '上次 36.2 km', spd: 0.0055, hr: 138 },
  { n: '滑雪', icon: 'snow', last: '上次 26 趟', spd: 0.006, hr: 142 },
]

export const apps: { id: ScreenId; n: string; icon: string; color: string; ink: string }[] = [
  { id: 'sports', n: '运动', icon: 'bolt', color: '#e3c08a', ink: '#1f1709' },
  { id: 'nav', n: '导航', icon: 'compass', color: '#64d2ff', ink: '#00202e' },
  { id: 'hr', n: '心率', icon: 'heart', color: '#ff375f', ink: '#fff' },
  { id: 'weather', n: '天气', icon: 'cloud', color: '#f5c86a', ink: '#2a1d00' },
]

export const zones = ['#8e8e93', '#64d2ff', '#30d158', '#ff9f0a', '#ff375f']
export const zoneNames = ['热身', '燃脂', '有氧', '乳酸', '极限']
export const zoneOf = (hr: number) => (hr < 100 ? 0 : hr < 120 ? 1 : hr < 140 ? 2 : hr < 158 ? 3 : 4)

export const waypoints = [
  { n: '鹰嘴岩', d: 1.2, b: 58, climb: 186 },
  { n: '营地', d: 3.4, b: 96, climb: 520 },
  { n: '起点', d: 6.8, b: 224, climb: -640 },
]

export const forecast = [
  { t: -6, i: 'sun', d: '晴 · 体感 -11°', w: 18 },
  { t: -4, i: 'sun', d: '晴 · 体感 -9°', w: 16 },
  { t: -3, i: 'cloud', d: '多云 · 体感 -8°', w: 22 },
  { t: -5, i: 'cloud', d: '阴 · 体感 -11°', w: 28 },
  { t: -8, i: 'snow', d: '小雪 · 能见度低', w: 34 },
]

export const hrHistory = [62, 58, 55, 60, 72, 88, 95, 76, 70, 118, 84]

type Guide = { title: string; desc: string; crown: string; press: string; action: string; tap: string }

export function guideFor(screen: ScreenId, status: 'idle' | 'running' | 'paused'): Guide {
  const quick = status === 'idle' ? '快速开始上次的运动' : '回到进行中的运动'
  const g: Record<ScreenId, Guide> = {
    face: { title: '表盘', desc: '抬腕即看：时间、日落、海拔、心率与气温。', crown: '切换右侧叠放卡片', press: '打开应用列表', action: quick, tap: '轻触卡片打开对应应用，长按表盘可更换壁纸' },
    apps: { title: '应用列表', desc: '运动、导航、心率、天气，都可以单手完成操作。', crown: '上下选择应用', press: '回到表盘', action: quick, tap: '轻触打开应用' },
    sports: { title: '开始运动', desc: '只需选择一项运动，倒计时结束后自动开始记录。', crown: '选择运动类型', press: '回到表盘', action: '开始所选运动', tap: '轻触直接开始' },
    countdown: { title: '准备开始', desc: '利用 3 秒倒计时，做好出发准备。', crown: '—', press: '取消', action: '跳过倒计时，立即开始', tap: '轻触跳过' },
    workout: status === 'paused'
      ? { title: '运动已暂停', desc: '数据已停止累计，可以继续，也可以结束并保存。', crown: '—', press: '回到表盘（保持暂停）', action: '继续运动', tap: '轻触「继续」或「结束」' }
      : { title: '运动中', desc: '每页只突出 1 个核心数据，一眼就能读完。', crown: '切换 数据 / 心率 / 海拔', press: '回到表盘，运动在后台继续', action: '暂停运动', tap: '轻触「分段」卡片记录分段' },
    summary: { title: '运动总结', desc: '本次运动记录已保存。', crown: '—', press: '完成并回到表盘', action: '完成并回到表盘', tap: '轻触「完成」' },
    nav: { title: '导航', desc: '箭头始终指向目标航点，可随时一键返航。', crown: '切换目标航点', press: '回到表盘', action: quick, tap: '轻触「返航」导航回起点' },
    hr: { title: '心率', desc: '查看实时心率和今日趋势。', crown: '—', press: '回到表盘', action: quick, tap: '—' },
    weather: { title: '天气', desc: '逐小时预报，并提前提醒天气变化。', crown: '查看逐小时预报', press: '回到表盘', action: quick, tap: '轻触时段查看详情' },
    edit: { title: '更换壁纸', desc: '使用你自己的旅途照片作为表盘。', crown: '切换壁纸', press: '确认并回到表盘', action: '确认', tap: '轻触预览图确认' },
    control: { title: '控制中心', desc: '集中管理户外常用开关。', crown: '—', press: '回到表盘', action: quick, tap: '强光 · 夜间 · 手电筒 · 勿扰' },
    flash: { title: '手电筒', desc: '屏幕和表壳顶部的灯条同时点亮。', crown: '调节亮度', press: '关闭手电筒', action: '关闭手电筒', tap: '轻触关闭' },
  }
  return g[screen]
}
