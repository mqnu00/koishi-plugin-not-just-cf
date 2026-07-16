export type OjName = 'Codeforces' | 'NowCoder' | 'LeetCode' | 'Luogu' | 'AtCoder'

export type OjAlias = 'cf' | 'nc' | 'lc' | 'lg' | 'atc'

export type OutputFormat = 'text' | 'takumi_image' | 'puppeteer_image' | 'qqmarkdown_style' | 'qqmarkdown_table'

export interface Contest {
  oj: OjName | string
  name: string
  startTime: number
  duration: number
}

export interface AlertTarget {
  platform: string
  selfId: string
  channelId: string
  enabled: boolean
}

export interface RenderOptions {
  width: number
  darkMode: boolean
  title?: string
  subtitle?: string
  generatedAt?: number
  fontPath?: string
  totalContestCount?: number
}

export interface ContestQueryOptions {
  ojs: OjName[]
  windowDays: number
}
