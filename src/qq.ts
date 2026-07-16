import { h } from 'koishi'
import type { Session } from 'koishi'
import type { Config } from './config'
import type { Contest } from './types'
import { formatDateTime, formatDuration, formatTimeUntil } from './utils/time'
import { logInfo } from './utils/logger'

export interface KeyboardButton {
  render_data: { label: string; style: number }
  action: { type: number; permission: { type: number }; data: string; enter: boolean }
}

export interface KeyboardRows {
  rows: { buttons: KeyboardButton[] }[]
}

export const DEFAULT_KEYBOARD_ROWS: KeyboardRows = {
  rows: [
    {
      buttons: [
        { render_data: { label: '📅 全部比赛', style: 1 }, action: { type: 2, permission: { type: 2 }, data: '${commandNameAll}', enter: true } },
      ],
    },
    {
      buttons: [
        { render_data: { label: 'Codeforces', style: 0 }, action: { type: 2, permission: { type: 2 }, data: '${commandNameList} cf', enter: true } },
        { render_data: { label: '牛客', style: 0 }, action: { type: 2, permission: { type: 2 }, data: '${commandNameList} nc', enter: true } },
      ],
    },
    {
      buttons: [
        { render_data: { label: 'LeetCode', style: 0 }, action: { type: 2, permission: { type: 2 }, data: '${commandNameList} lc', enter: true } },
        { render_data: { label: '洛谷', style: 0 }, action: { type: 2, permission: { type: 2 }, data: '${commandNameList} lg', enter: true } },
        { render_data: { label: 'AtCoder', style: 0 }, action: { type: 2, permission: { type: 2 }, data: '${commandNameList} atc', enter: true } },
      ],
    },
  ],
}

export function isQQOfficialSession(session: Session): boolean {
  return session.platform === 'qq'
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function buildQuoteMarkdown(contests: Contest[], title: string, maxDisplay: number): string {
  if (!contests.length) return `## 📅 ${title}\n\n> 暂无比赛。`
  const visible = contests.slice(0, maxDisplay)
  const lines = [`## 📅 ${title}`, '', `> 📌 共 ${contests.length} 场比赛。`, '']
  for (let index = 0; index < visible.length; index++) {
    const contest = visible[index]
    lines.push(`### ${index + 1}. ${contest.name}`)
    lines.push(`> 🏷️ 平台：${contest.oj}`)
    lines.push(`> 🕘 时间：${formatDateTime(contest.startTime)}`)
    lines.push(`> ⏱️ 时长：${formatDuration(contest.duration)}`)
    lines.push(`> ⏳ 距离开始：${formatTimeUntil(contest.startTime)}`)
    lines.push('')
  }
  if (contests.length > visible.length) lines.push(`> 📎 还有 ${contests.length - visible.length} 场比赛未在 Markdown 中展开。`)
  return lines.join('\n')
}

function buildTableMarkdown(contests: Contest[], title: string, maxDisplay: number): string {
  if (!contests.length) return `## 📅 ${title}\n\n> 暂无比赛。`
  const visible = contests.slice(0, maxDisplay)
  const lines = [
    `## 📅 ${title}`,
    '',
    `> 📌 共 ${contests.length} 场比赛。`,
    '',
    '| # | 平台 | 比赛 | 时间 | 时长 | 距离 |',
    '|---:|---|---|---|---|---|',
  ]
  for (let index = 0; index < visible.length; index++) {
    const contest = visible[index]
    lines.push([
      String(index + 1),
      escapeTableCell(String(contest.oj)),
      escapeTableCell(contest.name),
      escapeTableCell(formatDateTime(contest.startTime).slice(5, 16)),
      escapeTableCell(formatDuration(contest.duration)),
      escapeTableCell(formatTimeUntil(contest.startTime)),
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'))
  }
  if (contests.length > visible.length) {
    lines.push('')
    lines.push(`> 📎 还有 ${contests.length - visible.length} 场比赛未在 Markdown 表格中展开。`)
  }
  return lines.join('\n')
}

export function buildContestMarkdown(contests: Contest[], config: Config, title = '近期算法比赛日程'): string {
  const maxDisplay = config.qqMarkdownMaxDisplay || 50
  return buildQuoteMarkdown(contests, title, maxDisplay)
}

export function buildContestMarkdownTable(contests: Contest[], config: Config, title = '近期算法比赛日程'): string {
  return buildTableMarkdown(contests, title, config.qqMarkdownMaxDisplay || 50)
}

export function buildContestKeyboard(config: Config, customJson?: string): object {
  const raw = customJson || JSON.stringify(DEFAULT_KEYBOARD_ROWS)
  const resolved = raw
    .replace(/\$\{commandNameAll\}/g, config.commandNameAll)
    .replace(/\$\{commandNameList\}/g, config.commandNameList)

  try {
    const parsed = JSON.parse(resolved)
    if (parsed?.rows?.[0]?.buttons?.length) return parsed
  } catch {}

  return DEFAULT_KEYBOARD_ROWS
}

export async function sendQQMarkdown(
  session: any,
  config: Config,
  markdown: string,
  keyboard: object,
  throwOnError = false,
): Promise<void> {
  try {
    if (session.bot?.config?.autoStreamText) {
      await session.send(h('qq:rawmarkdown', { content: markdown, keyboard }))
      return
    }

    const payload: any = {
      msg_type: 2,
      markdown: { content: markdown },
    }
    if ((keyboard as any)?.rows?.length) payload.keyboard = { content: keyboard }

    const msgId = session.messageId
    if (msgId) {
      const now = Date.now()
      const msgTime = session.timestamp ?? now
      if (now - msgTime < 300000) {
        payload.msg_id = msgId
        payload.msg_seq = Math.floor(Math.random() * 0xffffff) + 1
      }
    }

    await session.bot.internal.sendMessage(session.channelId, payload)
  } catch (error) {
    logInfo(
      session.app,
      config,
      '[WARN] QQ Markdown 发送失败，不影响其他输出格式。',
      `[WARN] ${error instanceof Error ? error.stack || error.message : error}`,
    )
    if (throwOnError) throw error
  }
}

export async function sendContestQQMarkdown(session: Session, config: Config, contests: Contest[], title: string): Promise<void> {
  if (!isQQOfficialSession(session)) return
  const keyboard = buildContestKeyboard(config, config.qqMarkdownKeyboardJson)
  if (config.outputFormats.includes('qqmarkdown_style')) {
    await sendQQMarkdown(session, config, buildContestMarkdown(contests, config, title), keyboard)
  }
  if (config.outputFormats.includes('qqmarkdown_table')) {
    await sendQQMarkdown(session, config, buildContestMarkdownTable(contests, config, title), keyboard)
  }
}

export function stringifyCompact(obj: object): string {
  return JSON.stringify(obj, null, 2)
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
}
