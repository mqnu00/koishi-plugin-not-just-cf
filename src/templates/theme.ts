import type { OjName } from '../types'

export const themes = {
  light: {
    bg: '#f5f7fb',
    panel: '#ffffff',
    panelMuted: '#eef2f7',
    text: '#172033',
    textMuted: '#647084',
    border: '#d7deea',
    title: '#1f4e79',
    accent: '#2f80ed',
    shadow: 'rgba(31, 78, 121, 0.08)',
  },
  dark: {
    bg: '#151922',
    panel: '#202632',
    panelMuted: '#293140',
    text: '#f2f5fa',
    textMuted: '#aab4c2',
    border: '#3a4556',
    title: '#7db7ff',
    accent: '#78c6ff',
    shadow: 'rgba(0, 0, 0, 0.25)',
  },
}
export type ContestTheme = typeof themes.light

export const ojColors: Record<OjName | string, string> = {
  Codeforces: '#4f6edb',
  NowCoder: '#12a37f',
  LeetCode: '#f0a500',
  Luogu: '#2f80ed',
  AtCoder: '#6f42c1',
}
