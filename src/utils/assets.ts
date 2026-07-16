import { existsSync } from 'fs'
import { mkdir, readFile, readdir, writeFile } from 'fs/promises'
import path from 'path'
import type { Context } from 'koishi'
import type { Config } from '../config'
import { logInfo } from './logger'

export const ASSET_PLUGIN_NAME = 'not-just-cf-vincentzyu-fork'
export const DEFAULT_ASSET_FOLDER_RELATIVE_PATH = ['data', 'assets', ASSET_PLUGIN_NAME] as const

interface CopyStats {
  copied: number
  unchanged: number
}

const pendingAssets = new Map<string, Promise<string>>()

function normalizeAssetParts(parts: string[] | readonly string[] | undefined): string[] {
  const normalized = (parts || [])
    .map((part) => String(part).trim())
    .filter(Boolean)
  const resolved = normalized.length ? normalized : [...DEFAULT_ASSET_FOLDER_RELATIVE_PATH]

  for (const part of resolved) {
    if (path.isAbsolute(part) || part === '.' || part === '..' || part.includes('/') || part.includes('\\')) {
      throw new Error(`资源目录包含非法路径片段：${part}`)
    }
  }
  return resolved
}

function assertInsideBaseDir(baseDir: string, targetDir: string): void {
  const relative = path.relative(path.resolve(baseDir), path.resolve(targetDir))
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`资源目录必须是 ctx.baseDir 下的子目录：${targetDir}`)
  }
}

function getBundledAssetDir(): string {
  const candidates = [
    path.resolve(__dirname, '../../assets'),
    path.resolve(__dirname, '../assets'),
  ]
  const bundledDir = candidates.find((candidate) => existsSync(candidate))
  if (!bundledDir) throw new Error(`找不到插件内置资源目录：${candidates.join('、')}`)
  return bundledDir
}

export function getRuntimeAssetDirByBaseDir(
  baseDir: string,
  assetParts?: string[] | readonly string[],
): string {
  const targetDir = path.resolve(baseDir, ...normalizeAssetParts(assetParts))
  assertInsideBaseDir(baseDir, targetDir)
  return targetDir
}

export function getRuntimeLogoDirByBaseDir(
  baseDir: string,
  assetParts?: string[] | readonly string[],
): string {
  return path.join(getRuntimeAssetDirByBaseDir(baseDir, assetParts), 'logo')
}

async function copyFileIfChanged(sourcePath: string, targetPath: string): Promise<boolean> {
  const sourceData = await readFile(sourcePath)
  if (existsSync(targetPath)) {
    const targetData = await readFile(targetPath)
    if (targetData.equals(sourceData)) return false
  }

  await mkdir(path.dirname(targetPath), { recursive: true })
  await writeFile(targetPath, sourceData)
  return true
}

async function copyAssetDirectory(sourceDir: string, targetDir: string, stats: CopyStats): Promise<void> {
  const entries = await readdir(sourceDir, { withFileTypes: true })
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name)
    const targetPath = path.join(targetDir, entry.name)
    if (entry.isDirectory()) {
      await copyAssetDirectory(sourcePath, targetPath, stats)
      continue
    }
    if (!entry.isFile()) continue
    if (await copyFileIfChanged(sourcePath, targetPath)) stats.copied++
    else stats.unchanged++
  }
}

export async function ensureRuntimeAssets(ctx: Context, config: Config): Promise<string> {
  const targetDir = getRuntimeAssetDirByBaseDir(ctx.baseDir, config.assetFolderRelativePath)
  const pending = pendingAssets.get(targetDir)
  if (pending) return pending

  const task = (async () => {
    const sourceDir = getBundledAssetDir()
    const stats: CopyStats = { copied: 0, unchanged: 0 }
    await mkdir(targetDir, { recursive: true })
    await copyAssetDirectory(sourceDir, targetDir, stats)
    logInfo(
      ctx,
      config,
      `[资源] 运行时资源已就绪：${targetDir}。`,
      `[资源] 已复制或更新 ${stats.copied} 个文件，跳过 ${stats.unchanged} 个相同文件。`,
    )
    return targetDir
  })().catch((error) => {
    pendingAssets.delete(targetDir)
    throw error
  })

  pendingAssets.set(targetDir, task)
  return task
}
