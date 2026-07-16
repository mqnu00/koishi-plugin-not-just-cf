import type { Context } from 'koishi'
import type { Config } from '../config'
import type { Contest } from '../types'
import { shouldIncludeContest } from '../utils/filter'
import { logInfo, writePlatformResponseLog } from '../utils/logger'

const SOURCE_URL = 'https://raw.githubusercontent.com/mqnu00/ACM-contest-calender-maker/refs/heads/main/contest.json'

function withProxy(proxy: string, url: string): string {
  return proxy ? `${proxy}${url}` : url
}
export async function fetchAtcoderContests(ctx: Context, config: Config): Promise<Contest[]> {
  const currentTime = Math.floor(Date.now() / 1000)
  const raw = await ctx.http.get(withProxy(config.githubProxy, SOURCE_URL))
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw
  const list = Array.isArray(data?.contests) ? data.contests : []

  const contests = list
    .filter((contest: any) => String(contest.oj).toLowerCase() === 'atcoder')
    .map((contest: any) => ({
      oj: 'AtCoder',
      name: String(contest.name || 'AtCoder Contest'),
      startTime: Number(contest.stime),
      duration: Number(contest.dtime),
    }))
    .filter((contest: Contest) => shouldIncludeContest(
      contest.startTime,
      contest.startTime + contest.duration,
      currentTime,
      config.contestWindowDays,
    ))
  logInfo(
    ctx,
    config,
    `[AtCoder] 获取完成：原始 ${list.length} 条，过滤后 ${contests.length} 条。`,
    `[AtCoder] 请求地址：${withProxy(config.githubProxy, SOURCE_URL)}`,
  )
  await writePlatformResponseLog(ctx, config, {
    platform: 'AtCoder',
    sourceUrl: SOURCE_URL,
    rawResponse: raw,
    rawCount: list.length,
    normalizedContests: contests,
  })
  return contests
}
