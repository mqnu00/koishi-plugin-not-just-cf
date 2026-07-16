import * as cheerio from 'cheerio'
import type { Context } from 'koishi'
import type { Config } from '../config'
import type { Contest } from '../types'
import { shouldIncludeContest } from '../utils/filter'
import { logInfo, writePlatformResponseLog } from '../utils/logger'

const SOURCE_URL = 'https://ac.nowcoder.com/acm/contest/vip-index?topCategoryFilter=13'

function parseNowCoderTime(text: string): { startTime: number; duration: number } | null {
  const normalized = text.replace(/\s+/g, ' ').trim()
  const match = normalized.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+至\s+(?:(\d{4}-\d{2}-\d{2})\s+)?(\d{2}:\d{2})/)
  if (!match) return null

  const startDate = match[1]
  const startClock = match[2]
  const endDate = match[3] || startDate
  const endClock = match[4]
  const start = new Date(`${startDate}T${startClock}:00+08:00`).getTime() / 1000
  const end = new Date(`${endDate}T${endClock}:00+08:00`).getTime() / 1000
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  return { startTime: start, duration: end - start }
}
export async function fetchNowCoderContests(ctx: Context, config: Config): Promise<Contest[]> {
  const currentTime = Math.floor(Date.now() / 1000)
  const response = await ctx.http.get(SOURCE_URL)
  const $ = cheerio.load(response)
  const contests: Contest[] = []
  const entries = $('.nk-main .platform-mod').eq(0).find('.platform-item-main')

  entries.each((_, element) => {
    const name = $(element).find('h4 a').text().trim()
    const contestTime = $(element).find('.match-time-icon').text()
    const parsed = parseNowCoderTime(contestTime)
    if (!name || !parsed) return

    if (shouldIncludeContest(parsed.startTime, parsed.startTime + parsed.duration, currentTime, config.contestWindowDays)) {
      contests.push({
        oj: 'NowCoder',
        name,
        startTime: parsed.startTime,
        duration: parsed.duration,
      })
    }
  })

  logInfo(
    ctx,
    config,
    `[NowCoder] 获取完成：原始 ${entries.length} 条，过滤后 ${contests.length} 条。`,
    `[NowCoder] 请求地址：${SOURCE_URL}`,
  )
  await writePlatformResponseLog(ctx, config, {
    platform: 'NowCoder',
    sourceUrl: SOURCE_URL,
    rawResponse: response,
    rawCount: entries.length,
    normalizedContests: contests,
  })
  return contests
}
