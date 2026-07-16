import type { Contest } from '../types'
import { formatDateTime, formatDuration, formatTimeUntil } from '../utils/time'

export function formatContestText(contest: Contest): string {
  return [
    `🏁 ${contest.name}`,
    `🏷️ 比赛平台：${contest.oj}`,
    `🕘 比赛时间：${formatDateTime(contest.startTime)}`,
    `⏱️ 比赛时长：${formatDuration(contest.duration)}`,
    `⏳ 距离开始：${formatTimeUntil(contest.startTime)}`,
    '--------------------',
    '',
  ].join('\n')
}

export function formatContestListText(contests: Contest[], totalCount = contests.length): string {
  if (!contests.length) return '📅 近期算法比赛日程\n\n暂无比赛'
  const omittedCount = Math.max(0, totalCount - contests.length)
  const lines = [
    `📅 近期算法比赛日程`,
    `📌 共 ${totalCount} 场比赛${omittedCount ? `，当前展示前 ${contests.length} 场` : ''}`,
    '',
    contests.map(formatContestText).join(''),
  ]
  if (omittedCount) lines.push(`📎 还有 ${omittedCount} 场比赛未在文字模式中展示`)
  return lines.join('\n')
}

export function getContestWindowText(contestWindowDays: number, contestTarget: string): string {
  if (contestWindowDays === 0) return `列出未来的${contestTarget}`
  return `列出${contestWindowDays}天内将要举办的${contestTarget}`
}
