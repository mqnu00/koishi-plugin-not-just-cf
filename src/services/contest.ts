import type { Context } from 'koishi'
import type { Config } from '../config'
import { fetchAtcoderContests } from '../fetchers/atcoder'
import { fetchCodeforcesContests } from '../fetchers/codeforces'
import { fetchLeetCodeContests } from '../fetchers/leetcode'
import { fetchLuoguContests } from '../fetchers/luogu'
import { fetchNowCoderContests } from '../fetchers/nowcoder'
import type { Contest, OjName } from '../types'
import { logInfo } from '../utils/logger'

type ContestFetcher = (ctx: Context, config: Config) => Promise<Contest[]>

const CONTEST_FETCHERS: Record<OjName, ContestFetcher> = {
  Codeforces: fetchCodeforcesContests,
  NowCoder: fetchNowCoderContests,
  LeetCode: fetchLeetCodeContests,
  Luogu: fetchLuoguContests,
  AtCoder: fetchAtcoderContests,
}

export function sortContests(contests: Contest[]): Contest[] {
  return contests.slice().sort((a, b) => a.startTime - b.startTime)
}
export async function getContests(ctx: Context, config: Config, ojs: OjName[] = config.enabledOjs): Promise<Contest[]> {
  const groups = await Promise.all(ojs.map(async (oj) => {
    try {
      return await CONTEST_FETCHERS[oj](ctx, config)
    } catch (error: any) {
      logInfo(
        ctx,
        config,
        `[WARN] ${oj} 比赛数据获取失败，本次按空列表处理。`,
        `[WARN] ${error instanceof Error ? error.stack || error.message : error}`,
      )
      return []
    }
  }))
  return sortContests(groups.flat())
}
