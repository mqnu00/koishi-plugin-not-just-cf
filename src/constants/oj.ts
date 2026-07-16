import { Schema } from 'koishi'
import type { OjAlias, OjName } from '../types'

export const OJ_LIST: OjName[] = ['Codeforces', 'NowCoder', 'LeetCode', 'Luogu', 'AtCoder']

export const OJ_ALIASES: Record<OjAlias, OjName> = {
  cf: 'Codeforces',
  nc: 'NowCoder',
  lc: 'LeetCode',
  lg: 'Luogu',
  atc: 'AtCoder',
}

export const OJ_ALIAS_LIST = Object.keys(OJ_ALIASES) as OjAlias[]

export const OJ_DISPLAY: Record<OjName, { alias: OjAlias; label: string; description: string }> = {
  Codeforces: { alias: 'cf', label: 'Codeforces', description: 'Codeforces - Codeforces (cf)' },
  NowCoder: { alias: 'nc', label: 'NowCoder', description: '牛客 - NowCoder (nc)' },
  LeetCode: { alias: 'lc', label: 'LeetCode', description: '力扣 - LeetCode (lc)' },
  Luogu: { alias: 'lg', label: 'Luogu', description: '洛谷 - Luogu (lg)' },
  AtCoder: { alias: 'atc', label: 'AtCoder', description: 'AtCoder - AtCoder (atc)' },
}

export const OJ_SCHEMA = OJ_LIST.map((oj) => Schema.const(oj).description(OJ_DISPLAY[oj].description))

export function resolveOjAlias(input: string): OjName | null {
  const key = input?.toLowerCase() as OjAlias
  return OJ_ALIASES[key] || null
}
