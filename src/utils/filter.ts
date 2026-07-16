import type { Contest } from '../types'

const ONE_DAY_SECONDS = 24 * 3600

export function shouldIncludeContest(startTime: number, endTime: number, currentTime: number, windowDays: number): boolean {
  if (endTime <= currentTime) return false
  const safeWindowDays = Math.max(0, windowDays)
  if (safeWindowDays === 0) return true
  return startTime - currentTime <= safeWindowDays * ONE_DAY_SECONDS
}
export function isUpcomingContest(contest: Contest, currentTime = Math.floor(Date.now() / 1000)): boolean {
  return contest.startTime + contest.duration > currentTime
}

export function shouldScheduleBeforeAlert(contest: Contest, beforeMinutes: number, nowMs = Date.now()): boolean {
  const alertAt = contest.startTime * 1000 - beforeMinutes * 60 * 1000
  return alertAt > nowMs
}
