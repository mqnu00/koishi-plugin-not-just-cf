import type { Context } from 'koishi'
import type { Config } from '../config'
import type { Contest } from '../types'
import { getContests } from './contest'
import { formatContestListText, formatContestText } from './format'
import { sendToAlertTargets } from './bot'
import { shouldScheduleBeforeAlert } from '../utils/filter'
import { logInfo } from '../utils/logger'

type TimerHandle = () => void

declare module 'koishi' {
  interface Context {
    cron?: (expression: string, callback: () => void | Promise<void>) => () => void
  }
}

export function registerAlerts(ctx: Context, config: Config) {
  const disposers: TimerHandle[] = []
  const scheduledBefore = new Set<string>()

  function addDisposer(disposer: TimerHandle | void) {
    if (typeof disposer === 'function') disposers.push(disposer)
  }

  async function sendDailyAlert() {
    const contests = await getContests(ctx, config)
    const visibleContests = contests.slice(0, config.textMaxDisplay)
    await sendToAlertTargets(ctx, config, formatContestListText(visibleContests, contests.length))
  }

  function scheduleCronAlert() {
    if (!ctx.cron) {
      logInfo(ctx, config, '[WARN] 未找到 cron 服务，定时比赛提醒不会启动。')
      return
    }
    addDisposer(ctx.cron(config.alertCronExpression, sendDailyAlert))
    logInfo(
      ctx,
      config,
      `[提醒] Cron 定时比赛提醒已启动：${config.alertCronExpression}。`,
    )
  }

  async function refreshBeforeContestAlerts() {
    const contests = await getContests(ctx, config)
    for (const contest of contests) {
      scheduleBeforeContest(contest)
    }
  }

  function scheduleBeforeContest(contest: Contest) {
    const key = `${contest.oj}:${contest.name}:${contest.startTime}`
    if (scheduledBefore.has(key)) return
    if (!shouldScheduleBeforeAlert(contest, config.alertBeforeMinutes)) return

    const delay = contest.startTime * 1000 - Date.now() - config.alertBeforeMinutes * 60 * 1000
    scheduledBefore.add(key)
    addDisposer(ctx.timer.setTimeout(async () => {
      await sendToAlertTargets(
        ctx,
        config,
        `${formatContestText(contest)}距离比赛开始还有${config.alertBeforeMinutes}分钟`,
      )
    }, delay))
  }

  function scheduleBeforeRefresh() {
    addDisposer(ctx.timer.setInterval(refreshBeforeContestAlerts, 24 * 60 * 60 * 1000))
  }

  ctx.on('ready', async () => {
    if (config.alertEnabled) scheduleCronAlert()
    if (config.alertBeforeEnabled) {
      await refreshBeforeContestAlerts()
      scheduleBeforeRefresh()
    }
  })

  ctx.on('dispose', () => {
    for (const dispose of disposers.splice(0)) dispose()
  })
}
