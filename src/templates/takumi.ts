import { existsSync, readFileSync } from 'fs'
import { Renderer } from '@takumi-rs/wasm/node'
import { container, text } from '@takumi-rs/helpers'
import type { Contest, RenderOptions } from '../types'
import { formatDateTime } from '../utils/time'
import { themes } from './theme'
import { buildContestList, buildHeader, calcHeight } from './layout'

const rendererCache = new Map<string, Renderer>()

function getRenderer(fontPath?: string): Renderer {
  if (!fontPath || !existsSync(fontPath)) {
    throw new Error('Takumi 渲染需要有效字体文件，请配置 takumiImageFontPath 或使用自动下载的 LXGW 字体。')
  }
  const key = fontPath
  const cached = rendererCache.get(key)
  if (cached) return cached

  const renderer = new Renderer({ fonts: [readFileSync(key)] })
  rendererCache.set(key, renderer)
  return renderer
}

export async function renderContestTakumiImage(contests: Contest[], options: RenderOptions): Promise<Buffer> {
  const width = options.width || 960
  const dark = options.darkMode
  const t = dark ? themes.dark : themes.light
  const title = options.title || '近期算法比赛日程'
  const generatedAt = options.generatedAt || Math.floor(Date.now() / 1000)
  const totalCount = options.totalContestCount ?? contests.length
  const displaySummary = totalCount > contests.length ? ` ｜ 展示 ${contests.length}/${totalCount} 场` : ''
  const subtitle = options.subtitle || `生成时间：${formatDateTime(generatedAt)} ｜ Asia/Shanghai${displaySummary}`
  const height = calcHeight(contests, width)

  const root = container({
    style: {
      width,
      minHeight: height,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      padding: 20,
      backgroundColor: t.bg,
    },
    children: [
      buildHeader(title, subtitle, contests, t, totalCount),
      buildContestList(contests, t),
      text('not-just-cf', {
        fontSize: 13,
        fontWeight: 700,
        color: t.textMuted,
        textAlign: 'right',
        marginTop: 2,
      }),
    ],
  })

  const renderer = getRenderer(options.fontPath)
  return Buffer.from(renderer.render(root, { width, height, format: 'png' }))
}
