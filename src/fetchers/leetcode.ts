import axios from 'axios'
import type { Context } from 'koishi'
import type { Config } from '../config'
import type { Contest } from '../types'
import { shouldIncludeContest } from '../utils/filter'
import { logInfo, writePlatformResponseLog } from '../utils/logger'

const SOURCE_URL = 'https://leetcode.com/graphql'

export async function fetchLeetCodeContests(ctx: Context, config: Config): Promise<Contest[]> {
  const currentTime = Math.floor(Date.now() / 1000)
  const response = await axios.post(SOURCE_URL, {
    operationName: null,
    variables: {},
    query: `{
      allContests {
        title
        startTime
        duration
        isVirtual
      }
    }`,
  }, {
    headers: {
      Referer: 'https://leetcode.com/',
      'Content-Type': 'application/json',
    },
  })

  const contests = response.data?.data?.allContests
  if (!Array.isArray(contests)) {
    logInfo(ctx, config, '[LeetCode] 获取完成：响应中没有比赛列表。', `[LeetCode] 请求地址：${SOURCE_URL}`)
    await writePlatformResponseLog(ctx, config, {
      platform: 'LeetCode',
      sourceUrl: SOURCE_URL,
      rawResponse: response.data,
      rawCount: 0,
      normalizedContests: [],
    })
    return []
  }

  const normalized = contests
    .filter((contest: any) => {
      const start = Number(contest.startTime)
      const duration = Number(contest.duration)
      return !contest.isVirtual && shouldIncludeContest(start, start + duration, currentTime, config.contestWindowDays)
    })
    .map((contest: any) => ({
      oj: 'LeetCode',
      name: String(contest.title || 'LeetCode Contest'),
      startTime: Number(contest.startTime),
      duration: Number(contest.duration),
    }))
  logInfo(
    ctx,
    config,
    `[LeetCode] 获取完成：原始 ${contests.length} 条，过滤后 ${normalized.length} 条。`,
    `[LeetCode] 请求地址：${SOURCE_URL}`,
  )
  await writePlatformResponseLog(ctx, config, {
    platform: 'LeetCode',
    sourceUrl: SOURCE_URL,
    rawResponse: response.data,
    rawCount: contests.length,
    normalizedContests: normalized,
  })
  return normalized
}
