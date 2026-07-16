import { randomUUID } from 'crypto'
import { existsSync } from 'fs'
import { mkdir, unlink, writeFile } from 'fs/promises'
import { extname, join } from 'path'
import { pathToFileURL } from 'url'
import type { Context } from 'koishi'
import type {} from 'koishi-plugin-puppeteer'
import type { Config } from '../config'
import { OJ_LIST } from '../constants/oj'
import type { Contest, RenderOptions } from '../types'
import { ensureRuntimeAssets } from '../utils/assets'
import { logInfo } from '../utils/logger'
import { formatDateTime, formatDuration, formatTimeUntil } from '../utils/time'
import { getPlatformPresentation } from './logo'
import { ojColors } from './theme'

interface ContestGroup {
  date: string
  label: string
  contests: Contest[]
}

const weekdayFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  weekday: 'long',
})

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getDateKey(seconds: number): string {
  return formatDateTime(seconds).slice(0, 10)
}

function groupContests(contests: Contest[]): ContestGroup[] {
  const groups = new Map<string, Contest[]>()
  for (const contest of contests) {
    const date = getDateKey(contest.startTime)
    const group = groups.get(date) || []
    group.push(contest)
    groups.set(date, group)
  }
  return Array.from(groups, ([date, items]) => ({
    date,
    label: weekdayFormatter.format(new Date(items[0].startTime * 1000)),
    contests: items,
  }))
}

function getFontFace(fontPath?: string): string {
  if (!fontPath || !existsSync(fontPath)) return ''
  const extension = extname(fontPath).toLowerCase()
  const format = extension === '.woff2'
    ? 'woff2'
    : extension === '.woff'
      ? 'woff'
      : extension === '.otf'
        ? 'opentype'
        : 'truetype'
  return `@font-face { font-family: "ContestCustom"; src: url("${pathToFileURL(fontPath).href}") format("${format}"); font-display: block; }`
}

function renderContestCard(contest: Contest, darkMode: boolean, logoDir: string): string {
  const dateTime = formatDateTime(contest.startTime)
  const color = ojColors[contest.oj] || '#667085'
  const presentation = getPlatformPresentation(contest.oj, darkMode, logoDir)
  return `
    <article class="contest-card" style="--oj-color: ${color}">
      <div class="contest-main">
        <div class="contest-meta">
          <span class="platform-identity">
            ${renderPlatformLogo(contest.oj, 'card-logo', darkMode, logoDir)}
            <span>${escapeHtml(presentation.label)}</span>
          </span>
        </div>
        <div class="contest-name">${escapeHtml(contest.name)}</div>
      </div>
      <div class="contest-time">
        <span class="countdown">T-${escapeHtml(formatTimeUntil(contest.startTime))}</span>
        <strong>${escapeHtml(dateTime.slice(11, 16))}</strong>
        <span>${escapeHtml(formatDuration(contest.duration))}</span>
      </div>
    </article>`
}

function renderGroups(contests: Contest[], darkMode: boolean, logoDir: string): string {
  return groupContests(contests).map((group) => `
    <section class="date-group">
      <header class="date-heading">
        <div><span class="date-marker"></span><strong>${escapeHtml(group.date)}</strong></div>
        <span>${escapeHtml(group.label)} / ${group.contests.length} 场</span>
      </header>
      <div class="contest-list">${group.contests.map((contest) => renderContestCard(contest, darkMode, logoDir)).join('')}</div>
    </section>`).join('')
}

function getPlatformLogoClass(platform: string): string {
  const normalized = platform.toLowerCase().replace(/[^a-z0-9_-]/g, '-')
  return `platform-logo-${normalized || 'unknown'}`
}

function buildPlatformLogoStyles(platforms: string[], logoDir: string): string {
  return platforms.map((platform) => {
    const presentation = getPlatformPresentation(platform, false, logoDir)
    if (!presentation.logoDataUrl) return ''
    return `.${getPlatformLogoClass(platform)} { background-image: url("${presentation.logoDataUrl}"); }`
  }).join('\n')
}

function renderPlatformLogo(platform: string, className: string, darkMode: boolean, logoDir: string): string {
  const presentation = getPlatformPresentation(platform, darkMode, logoDir)
  const label = escapeHtml(presentation.label)
  if (!presentation.logoDataUrl) return `<span class="logo-mark logo-fallback ${className}">${label}</span>`
  return `<span class="logo-mark ${className}" role="img" aria-label="${label}"><i class="logo-art ${getPlatformLogoClass(platform)}" style="filter:${presentation.filter};--platform-logo-scale:${presentation.logoScale}"></i></span>`
}

function renderSpotlight(contest: Contest, darkMode: boolean, logoDir: string): string {
  const color = ojColors[contest.oj] || '#667085'
  const presentation = getPlatformPresentation(contest.oj, darkMode, logoDir)
  return `
    <section class="spotlight" style="--oj-color: ${color}">
      <div class="spotlight-copy">
        <div class="section-label"><span>NEXT UP</span><i></i><b>${escapeHtml(presentation.label)}</b></div>
        <h2>${escapeHtml(contest.name)}</h2>
        <div class="spotlight-meta">
          <span><small>开始时间</small>${escapeHtml(formatDateTime(contest.startTime))}</span>
          <span><small>预计时长</small>${escapeHtml(formatDuration(contest.duration))}</span>
        </div>
      </div>
      <div class="spotlight-countdown">
        ${renderPlatformLogo(contest.oj, 'spotlight-logo', darkMode, logoDir)}
        <div class="countdown-copy">
          <small>距离开赛</small>
          <strong>${escapeHtml(formatTimeUntil(contest.startTime))}</strong>
          <span>Asia/Shanghai</span>
        </div>
      </div>
    </section>`
}

function renderPlatformDistribution(contests: Contest[], darkMode: boolean, logoDir: string): string {
  const counts = new Map<string, number>()
  for (const contest of contests) counts.set(contest.oj, (counts.get(contest.oj) || 0) + 1)
  const max = Math.max(1, ...counts.values())
  const knownPlatforms = new Set<string>(OJ_LIST)
  const platforms = [...OJ_LIST, ...Array.from(counts.keys()).filter((platform) => !knownPlatforms.has(platform))]
  const rows = platforms.map((platform) => {
    const count = counts.get(platform) || 0
    const color = ojColors[platform] || '#667085'
    const width = count ? Math.max(8, Math.round(count / max * 100)) : 0
    const presentation = getPlatformPresentation(platform, darkMode, logoDir)
    return `
      <div class="platform-row">
        ${renderPlatformLogo(platform, 'platform-logo', darkMode, logoDir)}
        <span class="platform-name">${escapeHtml(presentation.label)}</span>
        <div class="platform-track"><b style="width:${width}%;background:${color}"></b></div>
        <strong>${count}</strong>
      </div>`
  }).join('')
  return `<div class="platform-grid">${rows}</div>`
}

export function buildContestHtml(
  contests: Contest[],
  options: RenderOptions,
  logoDir: string,
  spotlightMaxContests = 10,
  puppeteerScheduleColumns = 3,
): string {
  const width = options.width || 960
  const dark = options.darkMode
  const title = options.title || '近期算法比赛日程'
  const generatedAt = options.generatedAt || Math.floor(Date.now() / 1000)
  const totalCount = options.totalContestCount ?? contests.length
  const platforms = Array.from(new Set(contests.map((contest) => contest.oj)))
  const dates = Array.from(new Set(contests.map((contest) => getDateKey(contest.startTime))))
  const fontFace = getFontFace(options.fontPath)
  const logoStyles = buildPlatformLogoStyles(Array.from(new Set<string>([...OJ_LIST, ...platforms])), logoDir)
  const scheduleColumns = Math.max(1, Math.min(4, Math.trunc(Number(puppeteerScheduleColumns) || 3)))
  const showSpotlight = contests.length > 0 && totalCount <= spotlightMaxContests
  const scheduleContests = showSpotlight ? contests.slice(1) : contests
  const density = contests.length <= 3 ? 'focus' : contests.length <= 8 ? 'balanced' : 'compact'
  const c = dark
    ? { bg: '#12161c', surface: '#1b2028', surfaceAlt: '#202631', line: '#343b47', text: '#f4f6f8', muted: '#98a3b3', faint: '#6f7b8c', accent: '#75b8ff' }
    : { bg: '#edf0f4', surface: '#ffffff', surfaceAlt: '#f7f8fa', line: '#d2d7df', text: '#18202c', muted: '#667085', faint: '#8b95a5', accent: '#1769aa' }

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <style>
    ${fontFace}
    ${logoStyles}
    :root { color-scheme: ${dark ? 'dark' : 'light'}; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      width: ${width}px;
      background: transparent;
      font-family: ${fontFace ? '"ContestCustom", ' : ''}"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif;
      letter-spacing: 0;
    }
    #contest-poster {
      width: ${width}px;
      padding: 28px;
      color: ${c.text};
      background: ${c.bg};
    }
    .masthead {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      padding: 2px 2px 20px;
      border-bottom: 1px solid ${c.line};
    }
    .brand-line { display: flex; align-items: center; gap: 10px; margin-bottom: 7px; color: ${c.accent}; font-size: 12px; font-weight: 900; }
    .brand-line i { width: 22px; height: 2px; background: ${c.accent}; }
    h1 { margin: 0; font-size: 34px; line-height: 1.2; font-weight: 900; }
    .sync-state { flex: none; text-align: right; }
    .sync-state strong { display: flex; align-items: center; justify-content: flex-end; gap: 7px; margin-bottom: 5px; color: ${c.text}; font-size: 13px; }
    .sync-state strong i { width: 8px; height: 8px; border-radius: 50%; background: #35c48d; }
    .sync-state span { color: ${c.muted}; font-size: 12px; }
    .overview {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(280px, .618fr);
      border-bottom: 1px solid ${c.line};
    }
    .metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-right: 1px solid ${c.line}; }
    .metric { min-height: 86px; padding: 17px 18px; border-right: 1px solid ${c.line}; border-bottom: 1px solid ${c.line}; }
    .metric:nth-child(2n) { border-right: 0; }
    .metric:nth-last-child(-n+2) { border-bottom: 0; }
    .metric span { display: block; margin-bottom: 6px; color: ${c.muted}; font-size: 12px; font-weight: 700; }
    .metric strong { font-size: 27px; line-height: 1; }
    .metric small { margin-left: 5px; color: ${c.faint}; font-size: 11px; font-weight: 700; }
    .logo-mark { display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 4px; background: ${dark ? 'rgba(229, 232, 236, .42)' : 'rgba(96, 106, 120, .08)'}; }
    .logo-art { display: block; width: 100%; height: 100%; background-position: center; background-repeat: no-repeat; background-size: contain; transform: scale(var(--context-logo-scale, 1)) scale(var(--platform-logo-scale, 1)); }
    .logo-fallback { color: ${c.muted}; font-size: 9px; font-weight: 900; }
    .platform-panel { min-width: 0; padding: 13px 14px; }
    .panel-title { margin-bottom: 9px; color: ${c.muted}; font-size: 12px; font-weight: 800; }
    .platform-grid { display: flex; flex-direction: column; gap: 6px; }
    .platform-row { display: grid; grid-template-columns: 84px minmax(78px, auto) minmax(24px, 1fr) 14px; align-items: center; gap: 7px; min-width: 0; min-height: 22px; }
    .platform-row > strong { font-size: 11px; text-align: right; }
    .platform-name { overflow: hidden; color: ${c.muted}; font-size: 9px; font-weight: 800; white-space: nowrap; }
    .platform-logo { width: 84px; height: 18px; }
    .platform-logo .logo-art { --context-logo-scale: 1.14; }
    .platform-track { height: 2px; overflow: hidden; background: ${c.line}; }
    .platform-track b { display: block; height: 100%; }
    .platform-empty { display: flex; align-items: center; justify-content: center; min-height: 110px; color: ${c.faint}; font-size: 11px; }
    .spotlight {
      position: relative;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 210px;
      margin-top: 22px;
      overflow: hidden;
      border: 1px solid ${c.line};
      border-left: 6px solid var(--oj-color);
      border-radius: 8px;
      background: ${c.surface};
    }
    .spotlight-copy { min-width: 0; padding: 22px 24px; }
    .section-label { display: flex; align-items: center; gap: 9px; color: ${c.muted}; font-size: 11px; font-weight: 900; }
    .section-label i { width: 28px; height: 1px; background: ${c.line}; }
    .section-label b { color: var(--oj-color); }
    .spotlight h2 { margin: 12px 0 17px; overflow-wrap: anywhere; font-size: 27px; line-height: 1.32; }
    .spotlight-meta { display: flex; gap: 30px; color: ${c.text}; font-size: 13px; font-weight: 800; }
    .spotlight-meta span { display: flex; flex-direction: column; gap: 4px; }
    .spotlight-meta small { color: ${c.muted}; font-size: 10px; font-weight: 700; }
    .spotlight-countdown { display: flex; flex-direction: column; justify-content: center; padding: 15px 20px; border-left: 1px solid ${c.line}; background: ${c.surfaceAlt}; }
    .spotlight-logo { width: 160px; height: 42px; margin: 0 auto 11px; }
    .spotlight-logo .logo-art { --context-logo-scale: 1.08; }
    .countdown-copy { display: flex; flex-direction: column; align-items: flex-end; }
    .countdown-copy small { color: ${c.muted}; font-size: 11px; font-weight: 800; }
    .countdown-copy strong { margin: 6px 0; color: var(--oj-color); font-size: 27px; line-height: 1.1; text-align: right; }
    .countdown-copy span { color: ${c.faint}; font-size: 10px; }
    .schedule-section { margin-top: 24px; }
    .schedule-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 13px; padding: 0 2px; }
    .schedule-header div span { display: block; margin-bottom: 4px; color: ${c.accent}; font-size: 10px; font-weight: 900; }
    .schedule-header h3 { margin: 0; font-size: 21px; }
    .schedule-header > span { color: ${c.muted}; font-size: 11px; font-weight: 700; }
    .date-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
    .date-group { min-width: 0; }
    .date-heading { display: flex; align-items: baseline; justify-content: space-between; padding: 0 2px 9px; border-bottom: 1px solid ${c.line}; }
    .date-heading div { display: flex; align-items: center; gap: 8px; }
    .date-marker { width: 3px; height: 15px; background: ${c.accent}; }
    .date-heading strong { font-size: 17px; }
    .date-heading > span { color: ${c.muted}; font-size: 11px; font-weight: 700; }
    .contest-list { display: grid; grid-template-columns: repeat(${scheduleColumns}, minmax(0, 1fr)); grid-auto-flow: row; gap: 8px 12px; }
    .contest-card {
      position: relative;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 82px;
      min-height: 96px;
      overflow: hidden;
      border-bottom: 1px solid ${c.line};
      background: ${c.surface};
    }
    .contest-card::before { content: ""; position: absolute; inset: 16px auto 16px 0; width: 3px; background: var(--oj-color); }
    .contest-main { min-width: 0; padding: 14px 15px 13px 14px; }
    .contest-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 7px; }
    .platform-identity { display: flex; align-items: center; gap: 6px; min-width: 0; }
    .platform-identity > span { overflow: hidden; color: var(--oj-color); font-size: 9px; font-weight: 900; white-space: nowrap; }
    .card-logo { flex: none; width: 64px; height: 14px; }
    .card-logo .logo-art { --context-logo-scale: 1.12; }
    .countdown { color: ${c.muted}; font-size: 9px; line-height: 1.2; font-weight: 700; white-space: nowrap; }
    .contest-name { overflow-wrap: anywhere; font-size: 16px; line-height: 1.38; font-weight: 800; }
    .contest-time {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      justify-content: center;
      gap: 5px;
      padding: 11px 8px;
      border-left: 1px solid ${c.line};
      background: ${c.surfaceAlt};
    }
    .contest-time strong { font-size: 21px; }
    .contest-time span { color: ${c.muted}; font-size: 10px; font-weight: 700; }
    .date-grid.compact .contest-card { min-height: 82px; }
    .date-grid.compact .contest-main { padding-top: 11px; padding-bottom: 10px; }
    .date-grid.compact .contest-name { font-size: 14px; }
    .date-grid.compact .contest-time strong { font-size: 18px; }
    @media (max-width: 760px) {
      .contest-list { grid-template-columns: minmax(0, 1fr); }
    }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 7px; margin-top: 20px; padding: 52px 20px; border: 1px solid ${c.line}; border-radius: 8px; background: ${c.surface}; }
    .empty-state strong { font-size: 22px; }
    .empty-state span { color: ${c.muted}; font-size: 14px; }
    .footer { display: flex; justify-content: space-between; margin-top: 24px; padding: 13px 2px 2px; border-top: 1px solid ${c.line}; color: ${c.faint}; font-size: 10px; font-weight: 700; }
  </style>
</head>
<body>
  <main id="contest-poster">
    <header class="masthead">
      <div><div class="brand-line"><i></i>CONTEST OPERATIONS</div><h1>${escapeHtml(title)}</h1></div>
      <div class="sync-state"><strong><i></i>数据已同步</strong><span>${escapeHtml(formatDateTime(generatedAt))}<br>Asia/Shanghai</span></div>
    </header>
    <section class="overview">
      <div class="metrics">
        <div class="metric"><span>监控赛事</span><strong>${totalCount}</strong><small>场</small></div>
        <div class="metric"><span>覆盖平台</span><strong>${platforms.length}</strong><small>个</small></div>
        <div class="metric"><span>日程跨度</span><strong>${dates.length}</strong><small>天</small></div>
        <div class="metric"><span>下一场</span><strong>${contests[0] ? escapeHtml(formatTimeUntil(contests[0].startTime)) : '--'}</strong></div>
      </div>
      <div class="platform-panel"><div class="panel-title">平台赛事分布</div>${renderPlatformDistribution(contests, dark, logoDir)}</div>
    </section>
    ${showSpotlight ? renderSpotlight(contests[0], dark, logoDir) : ''}
    ${!contests.length ? '<div class="empty-state"><strong>近期暂无比赛</strong><span>监控窗口内没有即将开始或正在进行的赛事</span></div>' : ''}
    ${scheduleContests.length ? `
      <section class="schedule-section">
        <header class="schedule-header"><div><span>UPCOMING SCHEDULE</span><h3>${showSpotlight ? '后续赛程' : '全部赛程'}</h3></div><span>${totalCount > contests.length ? `展示 ${contests.length}/${totalCount} 场` : `${scheduleContests.length} 场待跟进赛事`}</span></header>
        <div class="date-grid ${density}">${renderGroups(scheduleContests, dark, logoDir)}</div>
      </section>` : ''}
    <footer class="footer"><span>NOT-JUST-CF / OPERATIONS BOARD</span><span>Puppeteer HTML renderer · ${escapeHtml(String(width))}px</span></footer>
  </main>
</body>
</html>`
}

async function waitForStableLayout(page: any, selector: string) {
  await page.evaluate(async (targetSelector: string) => {
    const fonts = (document as any).fonts
    if (fonts?.ready) await fonts.ready
    const element = document.querySelector(targetSelector)
    if (!element) return

    let previous = ''
    let stableFrames = 0
    for (let index = 0; index < 12 && stableFrames < 2; index++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      const rect = element.getBoundingClientRect()
      const current = `${rect.width},${rect.height},${element.scrollWidth},${element.scrollHeight}`
      if (current === previous) stableFrames++
      else {
        previous = current
        stableFrames = 0
      }
    }
  }, selector)
}

export async function renderContestPuppeteerImage(
  ctx: Context,
  contests: Contest[],
  options: RenderOptions,
  config: Config,
): Promise<Buffer> {
  if (!ctx.puppeteer) {
    throw new Error('Puppeteer 服务未启用，请安装并启用 koishi-plugin-puppeteer。')
  }

  const width = options.width || 960
  const deviceScaleFactor = Math.max(0.5, Math.min(5, Number(config.puppeteerDeviceScaleFactor) || 2.5))
  const assetDir = await ensureRuntimeAssets(ctx, config)
  const logoDir = join(assetDir, 'logo')
  const renderDir = join(ctx.baseDir, 'data', 'not-just-cf')
  const htmlPath = join(renderDir, `render-${randomUUID()}.html`)
  await mkdir(renderDir, { recursive: true })
  await writeFile(
    htmlPath,
    buildContestHtml(contests, options, logoDir, config.puppeteerSpotlightMaxContests, config.puppeteerScheduleColumns),
    'utf8',
  )
  let page: Awaited<ReturnType<typeof ctx.puppeteer.page>> | undefined
  try {
    page = await ctx.puppeteer.page()
    if (config.verboseConsoleLog) {
      page.on('console', (message) => logInfo(ctx, config, `[Puppeteer Console] ${message.text()}`))
    }
    page.on('pageerror', (error) => logInfo(
      ctx,
      config,
      '[ERROR] Puppeteer 页面执行异常。',
      `[ERROR] ${error.stack || error.message}`,
    ))
    await page.setViewport({ width, height: 1000, deviceScaleFactor })
    const renderStart = Date.now()
    logInfo(
      ctx,
      config,
      `[Puppeteer] 开始渲染 ${contests.length} 场比赛，设备像素比 ${deviceScaleFactor}。`,
      `[Puppeteer] 临时 HTML：${htmlPath}`,
    )
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load', timeout: 15000 })
    await page.waitForSelector('#contest-poster', { timeout: 5000 })
    await waitForStableLayout(page, '#contest-poster')
    const element = await page.$('#contest-poster')
    if (!element) throw new Error('找不到比赛日程渲染容器 #contest-poster。')
    const screenshot = await element.screenshot({ type: 'png' })
    logInfo(
      ctx,
      config,
      `[Puppeteer] 比赛日程渲染完成，耗时 ${Date.now() - renderStart}ms。`,
      `[Puppeteer] PNG 大小：${screenshot.length} bytes。`,
    )
    return Buffer.from(screenshot)
  } finally {
    if (page) await page.close()
    await unlink(htmlPath).catch((error) => {
      logInfo(
        ctx,
        config,
        '[WARN] 删除 Puppeteer 临时 HTML 失败。',
        `[WARN] 路径：${htmlPath}\n${error instanceof Error ? error.stack || error.message : error}`,
      )
    })
  }
}
