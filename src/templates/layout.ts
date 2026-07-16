import { container, text } from '@takumi-rs/helpers'
import type { Contest } from '../types'
import { formatDateTime, formatDuration, formatTimeUntil } from '../utils/time'
import { ojColors, type ContestTheme } from './theme'

function ojColor(oj: string): string {
  return ojColors[oj] || '#6b7280'
}
export function buildHeader(title: string, subtitle: string, contests: Contest[], t: ContestTheme, totalCount = contests.length) {
  const platforms = Array.from(new Set(contests.map((contest) => contest.oj))).length
  return container({
    style: {
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      padding: '18px 22px',
      borderRadius: 14,
      backgroundColor: t.panel,
      border: `1px solid ${t.border}`,
      boxShadow: `0 8px 24px ${t.shadow}`,
    },
    children: [
      text(title, { fontSize: 34, fontWeight: 900, color: t.title }),
      text(subtitle, { fontSize: 16, fontWeight: 600, color: t.textMuted }),
      container({
        style: { width: '100%', display: 'flex', gap: 10 },
        children: [
          buildStat('比赛数', String(totalCount), t),
          buildStat('平台数', String(platforms), t),
          buildStat('最近开赛', contests[0] ? formatTimeUntil(contests[0].startTime) : '-', t),
        ],
      }),
    ],
  })
}

function buildStat(label: string, value: string, t: ContestTheme) {
  return container({
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      padding: '10px 12px',
      borderRadius: 10,
      backgroundColor: t.panelMuted,
      border: `1px solid ${t.border}`,
    },
    children: [
      text(label, { fontSize: 13, fontWeight: 700, color: t.textMuted }),
      text(value, { fontSize: 24, fontWeight: 900, color: t.text }),
    ],
  })
}

export function buildContestCard(contest: Contest, t: ContestTheme) {
  const color = ojColor(contest.oj)
  return container({
    style: {
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      padding: '14px 16px',
      borderRadius: 12,
      backgroundColor: t.panel,
      border: `1px solid ${t.border}`,
      borderLeft: `7px solid ${color}`,
      boxShadow: `0 5px 16px ${t.shadow}`,
    },
    children: [
      container({
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
        children: [
          text(String(contest.oj), { fontSize: 16, fontWeight: 900, color }),
          text(`距离开始 ${formatTimeUntil(contest.startTime)}`, { fontSize: 14, fontWeight: 800, color: t.textMuted }),
        ],
      }),
      text(contest.name, {
        fontSize: 21,
        fontWeight: 900,
        color: t.text,
        lineHeight: 1.25,
      }),
      container({
        style: { display: 'flex', gap: 10 },
        children: [
          text(`时间：${formatDateTime(contest.startTime)}`, { fontSize: 14, fontWeight: 700, color: t.textMuted }),
          text(`时长：${formatDuration(contest.duration)}`, { fontSize: 14, fontWeight: 700, color: t.textMuted }),
        ],
      }),
    ],
  })
}

export function buildContestList(contests: Contest[], t: ContestTheme) {
  if (!contests.length) {
    return container({
      style: {
        width: '100%',
        padding: '32px 20px',
        borderRadius: 14,
        backgroundColor: t.panel,
        border: `1px solid ${t.border}`,
        alignItems: 'center',
      },
      children: [text('没有比赛', { fontSize: 28, fontWeight: 900, color: t.textMuted })],
    })
  }

  return container({
    style: {
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    },
    children: contests.map((contest) => buildContestCard(contest, t)),
  })
}

function estimateTitleLines(title: string, width: number): number {
  const availableWidth = Math.max(240, width - 72)
  const estimatedWidth = Array.from(title).reduce((total, character) => {
    if (/\s/.test(character)) return total + 7
    return total + (character.charCodeAt(0) > 0x7f ? 21 : 12)
  }, 0)
  return Math.max(1, Math.ceil(estimatedWidth / availableWidth))
}

export function calcHeight(contests: Contest[], width: number): number {
  const header = 178
  const card = 110
  const gap = 10
  const padding = 40
  const footer = 34
  if (!contests.length) return padding + header + 16 + 110 + footer
  const cardsHeight = contests.reduce((total, contest) => {
    const extraLines = estimateTitleLines(contest.name, width) - 1
    return total + card + extraLines * 28
  }, 0)
  return padding + header + 16 + cardsHeight + Math.max(0, contests.length - 1) * gap + footer
}
