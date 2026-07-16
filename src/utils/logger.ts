import type { Context } from 'koishi'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import type { Config } from '../config'
import type { Contest, OjName } from '../types'

const PLUGIN_CACHE_DIR = 'not-just-cf-vincentzyu-fork'

const PLATFORM_FILE_NAMES: Record<OjName, string> = {
  Codeforces: 'latest-codeforces.json',
  AtCoder: 'latest-atcoder.json',
  NowCoder: 'latest-nowcoder.json',
  LeetCode: 'latest-leetcode.json',
  Luogu: 'latest-luogu.json',
}

export interface PlatformResponseLog {
  platform: OjName
  sourceUrl: string
  rawResponse: unknown
  rawCount: number
  normalizedContests: Contest[]
}

export function getVerboseLogDirByBaseDir(baseDir: string): string {
  return path.join(baseDir, 'cache', PLUGIN_CACHE_DIR)
}

export const DEFAULT_VERBOSE_FILE_LOG_DIR = getVerboseLogDirByBaseDir(process.cwd())

export function logInfo(
  ctx: Context,
  config: Config,
  msg1: string,
  msg2?: string,
  verbose = false,
) {
  ctx.logger.info(msg1)
  if (msg2 && (config.verboseConsoleLog || verbose)) ctx.logger.info(msg2)
}

function jsonReplacer(_key: string, value: unknown) {
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack }
  }
  return value
}

export async function writePlatformResponseLog(
  ctx: Context,
  config: Config,
  entry: PlatformResponseLog,
): Promise<void> {
  if (!config.verboseFileLog) return

  const logDir = getVerboseLogDirByBaseDir(ctx.baseDir)
  const filePath = path.join(logDir, PLATFORM_FILE_NAMES[entry.platform])
  const payload = {
    schemaVersion: 1,
    platform: entry.platform,
    fetchedAt: new Date().toISOString(),
    sourceUrl: entry.sourceUrl,
    rawCount: entry.rawCount,
    normalizedCount: entry.normalizedContests.length,
    rawResponse: entry.rawResponse,
    normalizedContests: entry.normalizedContests,
  }

  try {
    await mkdir(logDir, { recursive: true })
    await writeFile(filePath, `${JSON.stringify(payload, jsonReplacer, 2)}\n`, 'utf8')
    logInfo(
      ctx,
      config,
      `[${entry.platform}] 已更新完整响应文件。`,
      `[${entry.platform}] 响应文件：${filePath}`,
    )
  } catch (error) {
    logInfo(
      ctx,
      config,
      `[WARN] ${entry.platform} 完整响应文件写入失败。`,
      `[WARN] 写入路径：${filePath}\n${error instanceof Error ? error.stack || error.message : error}`,
    )
  }
}
