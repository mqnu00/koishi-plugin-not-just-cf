import { existsSync, readFileSync, statSync } from 'fs'
import path from 'path'

interface PlatformPresentationConfig {
  fileName: string
  label: string
  darkFilter: string
  lightFilter: string
  logoScale?: number
}

export interface PlatformPresentation {
  label: string
  logoDataUrl: string | null
  filter: string
  logoScale: number
}

const PLATFORM_PRESENTATION: Record<string, PlatformPresentationConfig> = {
  Codeforces: {
    fileName: 'logo.CODEFORCES.png',
    label: 'Codeforces',
    darkFilter: 'contrast(1.08) saturate(1.06)',
    lightFilter: 'contrast(1.08)',
  },
  NowCoder: {
    fileName: 'logo.牛客.png',
    label: 'NowCoder / 牛客',
    darkFilter: 'brightness(1.1) saturate(1.08)',
    lightFilter: 'contrast(1.06)',
    logoScale: 1.05,
  },
  LeetCode: {
    fileName: 'logo.LeetCode.png',
    label: 'LeetCode / 力扣',
    darkFilter: 'brightness(1.12) contrast(1.05)',
    lightFilter: 'contrast(1.08)',
  },
  Luogu: {
    fileName: 'logo.洛谷.png',
    label: 'Luogu / 洛谷',
    darkFilter: 'brightness(1.12) saturate(1.12)',
    lightFilter: 'contrast(1.03) saturate(1.08)',
  },
  AtCoder: {
    fileName: 'logo.AtCoder.png',
    label: 'AtCoder',
    darkFilter: 'invert(1) grayscale(1) brightness(1.15)',
    lightFilter: 'grayscale(1) contrast(1.12)',
  },
}

interface LogoCacheEntry {
  signature: string
  dataUrl: string
}

const logoCache = new Map<string, LogoCacheEntry>()

export function getPlatformLogoDataUrl(platform: string, logoDir: string): string | null {
  const fileName = PLATFORM_PRESENTATION[platform]?.fileName
  if (!fileName) return null
  const filePath = path.join(logoDir, fileName)
  if (!existsSync(filePath)) return null

  const stats = statSync(filePath)
  const signature = `${stats.size}:${stats.mtimeMs}`
  const cached = logoCache.get(filePath)
  if (cached?.signature === signature) return cached.dataUrl

  const dataUrl = `data:image/png;base64,${readFileSync(filePath).toString('base64')}`
  logoCache.set(filePath, { signature, dataUrl })
  return dataUrl
}

export function getPlatformPresentation(platform: string, darkMode: boolean, logoDir: string): PlatformPresentation {
  const presentation = PLATFORM_PRESENTATION[platform]
  return {
    label: presentation?.label || platform,
    logoDataUrl: getPlatformLogoDataUrl(platform, logoDir),
    filter: presentation
      ? (darkMode ? presentation.darkFilter : presentation.lightFilter)
      : 'none',
    logoScale: presentation?.logoScale ?? 1,
  }
}
