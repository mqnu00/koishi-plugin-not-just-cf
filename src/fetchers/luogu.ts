import * as cheerio from 'cheerio'
import type { Context } from 'koishi'
import type { Config } from '../config'
import type { Contest } from '../types'
import { shouldIncludeContest } from '../utils/filter'
import { logInfo, writePlatformResponseLog } from '../utils/logger'

const SOURCE_URL = 'https://www.luogu.com.cn/contest/list?page=1&_contentOnly=1'

interface LuoguContestEntry {
  id: number
  name: string
  startTime: number
  endTime: number
}
function normalizeLuoguContestEntries(data: any): LuoguContestEntry[] {
  if (Array.isArray(data?.currentData?.contests?.result)) return data.currentData.contests.result
  if (Array.isArray(data?.data?.contests?.result)) return data.data.contests.result
  throw new Error('invalid luogu contest payload')
}

function extractLuoguContestEntries(payload: string | Record<string, any>): LuoguContestEntry[] {
  if (typeof payload === 'string') {
    const $ = cheerio.load(payload)
    const serialized = $('#lentille-context').text().trim()
    if (!serialized) throw new Error('luogu lentille-context payload not found')
    return normalizeLuoguContestEntries(JSON.parse(serialized))
  }
  if (payload && typeof payload === 'object') return normalizeLuoguContestEntries(payload)
  throw new Error('unsupported luogu payload type')
}

export async function fetchLuoguContests(ctx: Context, config: Config): Promise<Contest[]> {
  const currentTime = Math.floor(Date.now() / 1000)
  const data = await ctx.http.get(SOURCE_URL)
  const entries = extractLuoguContestEntries(data)
  const contests = entries
    .filter((contest) => shouldIncludeContest(contest.startTime, contest.endTime, currentTime, config.contestWindowDays))
    .map((contest) => ({
      oj: 'Luogu',
      name: contest.name,
      startTime: contest.startTime,
      duration: contest.endTime - contest.startTime,
    }))
  logInfo(
    ctx,
    config,
    `[Luogu] 获取完成：原始 ${entries.length} 条，过滤后 ${contests.length} 条。`,
    `[Luogu] 请求地址：${SOURCE_URL}`,
  )
  await writePlatformResponseLog(ctx, config, {
    platform: 'Luogu',
    sourceUrl: SOURCE_URL,
    rawResponse: data,
    rawCount: entries.length,
    normalizedContests: contests,
  })
  return contests
}
