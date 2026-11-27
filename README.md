# Terra OS · 交互式 3D 手表

可以拖动旋转的 Terra OS 手表 3D 演示：拖动表身旋转模型，滚轮或双指捏合缩放，轻触或滑动表屏直接操作 Terra OS 界面。

**在线预览：https://wx73306-create.github.io/terra-os-watch-3d/**

## 交互方式

| 操作 | 效果 |
| --- | --- |
| 拖拽表身 | 旋转模型 |
| 滚轮 / 双指捏合 | 缩放 |
| 「回到正面」 | 视角复位 |
| 「自动旋转」 | 开关缓慢自转 |
| 「表冠 ↑ / ↓」 | 转动表冠，切换叠放卡片 / 应用 |
| 「按表冠」 | 确认 / 返回表盘 |
| 「按侧键」 | 快速开始上次的运动 |
| 轻触、滑动表屏 | 直接操作手表界面 |

## 仓库结构

```
index.html              # 成品：单文件网页，含 three.js、3D 模型与表屏界面
source/
  watch1127.glb         # 3D 手表模型（原始 GLB）
  viewer.js             # 3D 展示与交互代码
  page.html             # 网页模板
  watch-screen.html     # 表屏界面（实际渲染在 iframe 里）
  build.mjs             # 打包脚本：把上面几样内联进 index.html
  ui-original/          # 原始 Terra OS 界面项目源码（React + Vite）
```

## 本地查看

直接双击 `index.html` 即可离线打开（需支持 WebGL 2 的浏览器）。

## 重新打包

在 `source/` 下执行：

```bash
npm ci
npm run build
```

会重新生成根目录的 `index.html`。`npm ci` 需要联网；产物本身可以离线运行。

## 说明

- 页面**零外部依赖**：three.js 打进 bundle，模型与表屏以 base64 内联，不走任何 CDN。
- 代价是单文件约 17 MB，首次打开需要在下载完成后才会渲染。
- 手表界面里的数据均为模拟值，不连接真实设备，与 `terra-os-watch`（2D 交互版）是同一套 UI 的两个版本。
