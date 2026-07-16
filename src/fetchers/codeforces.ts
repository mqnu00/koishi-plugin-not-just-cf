import type { Context } from 'koishi'
import type { Config } from '../config'
import type { Contest } from '../types'
import { shouldIncludeContest } from '../utils/filter'
import { logInfo, writePlatformResponseLog } from '../utils/logger'

const SOURCE_URL = 'https://codeforces.com/api/contest.list'

export async function fetchCodeforcesContests(ctx: Context, config: Config): Promise<Contest[]> {
  const currentTime = Math.floor(Date.now() / 1000)
  const data = await ctx.http.get(SOURCE_URL)
  const list = Array.isArray(data?.result) ? data.result : []

  const contests = list
    .filter((contest: any) => {
      const start = Number(contest.startTimeSeconds)
      const duration = Number(contest.durationSeconds)
      return shouldIncludeContest(start, start + duration, currentTime, config.contestWindowDays)
    })
    .map((contest: any) => ({
      oj: 'Codeforces',
      name: String(contest.name || 'Codeforces Contest'),
      startTime: Number(contest.startTimeSeconds),
      duration: Number(contest.durationSeconds),
    }))
  logInfo(
    ctx,
    config,
    `[Codeforces] 获取完成：原始 ${list.length} 条，过滤后 ${contests.length} 条。`,
    `[Codeforces] 请求地址：${SOURCE_URL}`,
  )
  await writePlatformResponseLog(ctx, config, {
    platform: 'Codeforces',
    sourceUrl: SOURCE_URL,
    rawResponse: data,
    rawCount: list.length,
    normalizedContests: contests,
  })
  return contests
}
