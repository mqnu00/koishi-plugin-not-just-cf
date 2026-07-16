import { createHash } from 'crypto'
import { existsSync } from 'fs'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import type { Context } from 'koishi'
import type { Config } from '../config'
import { logInfo } from './logger'

export const LXGW_WENKAI_FILE_NAME = 'LXGWWenKaiMono-Regular.ttf'

const GITEE_URL = `https://gitee.com/vincent-zyu/koishi-plugin-awa-quote-image/releases/download/fonts/${LXGW_WENKAI_FILE_NAME}`
const GITHUB_URL = `https://github.com/VincentZyuApps/koishi-plugin-awa-quote-image/releases/download/fonts/${LXGW_WENKAI_FILE_NAME}`
const DOWNLOAD_SOURCES = [
  { name: 'Gitee', url: GITEE_URL },
  { name: 'GitHub', url: GITHUB_URL },
]

const EXPECTED = {
  size: 24755236,
  md5: '90e75a25cca0e8868977b880352c6a53',
  sha1: '7f018ad4a181e4d2df4f972f357e612885d6c24a',
  sha256: 'ee9faa6479c5b2434f9bceca8e2e7b643f699f4f3d067aac9609261e07c6be61',
  sha512: '793dc4357d311dba539c50b0ae38ff247af066f141ffea54ff0cc51e274453671e736989cee4998fd89211035ecfe52ad38aa828ba7f1739bcf107b94a023be5',
}

const readyPaths = new Set<string>()
const pendingChecks = new Map<string, Promise<string>>()

export function getLxgwFontPath(ctx: Context): string {
  return path.join(ctx.baseDir, 'data', 'fonts', LXGW_WENKAI_FILE_NAME)
}

function verifyBuffer(buffer: Buffer): boolean {
  if (buffer.length !== EXPECTED.size) return false
  return createHash('md5').update(buffer).digest('hex') === EXPECTED.md5
    && createHash('sha1').update(buffer).digest('hex') === EXPECTED.sha1
    && createHash('sha256').update(buffer).digest('hex') === EXPECTED.sha256
    && createHash('sha512').update(buffer).digest('hex') === EXPECTED.sha512
}

async function verifyFile(filePath: string): Promise<boolean> {
  if (!existsSync(filePath)) return false
  try {
    return verifyBuffer(await readFile(filePath))
  } catch {
    return false
  }
}

async function downloadLxgwFont(ctx: Context, config: Config, filePath: string): Promise<void> {
  let lastError: unknown
  for (const source of DOWNLOAD_SOURCES) {
    try {
      logInfo(ctx, config, `[字体] 开始从 ${source.name} 下载 ${LXGW_WENKAI_FILE_NAME}。`)
      const response = await ctx.http.get(source.url, {
        responseType: 'arraybuffer',
        timeout: 60000,
      })
      const buffer = Buffer.from(response)
      if (!verifyBuffer(buffer)) throw new Error('字体大小或 hash 校验失败')
      await writeFile(filePath, buffer)
      if (!(await verifyFile(filePath))) throw new Error('字体写入后校验失败')
      logInfo(ctx, config, `[字体] ${LXGW_WENKAI_FILE_NAME} 已从 ${source.name} 下载并通过校验。`)
      return
    } catch (error) {
      lastError = error
      logInfo(
        ctx,
        config,
        `[WARN] ${source.name} 字体下载失败，将尝试下一个来源。`,
        `[WARN] ${error instanceof Error ? error.stack || error.message : error}`,
      )
    }
  }
  throw new Error(`LXGW 字体下载失败，Gitee 和 GitHub 均不可用：${lastError instanceof Error ? lastError.message : lastError}`)
}

export async function ensureLxgwFont(ctx: Context, config: Config): Promise<string> {
  const filePath = getLxgwFontPath(ctx)
  if (readyPaths.has(filePath)) return filePath

  const pending = pendingChecks.get(filePath)
  if (pending) return pending

  const check = (async () => {
    if (await verifyFile(filePath)) {
      readyPaths.add(filePath)
      logInfo(
        ctx,
        config,
        `[字体] ${LXGW_WENKAI_FILE_NAME} 已存在且校验通过。`,
        `[字体] 文件路径：${filePath}`,
      )
      return filePath
    }

    if (existsSync(filePath)) logInfo(ctx, config, `[WARN] 字体 ${LXGW_WENKAI_FILE_NAME} 校验失败，将重新下载。`)
    await mkdir(path.dirname(filePath), { recursive: true })
    await downloadLxgwFont(ctx, config, filePath)
    readyPaths.add(filePath)
    return filePath
  })().finally(() => pendingChecks.delete(filePath))

  pendingChecks.set(filePath, check)
  return check
}

export async function resolveRenderFont(ctx: Context, config: Config, configuredPath?: string): Promise<string> {
  if (configuredPath) {
    if (existsSync(configuredPath)) return configuredPath
    logInfo(
      ctx,
      config,
      '[WARN] 配置的字体文件不存在，将使用自动管理的 LXGW 字体。',
      `[WARN] 无效字体路径：${configuredPath}`,
    )
  }
  return ensureLxgwFont(ctx, config)
}
