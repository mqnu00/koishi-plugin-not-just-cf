import type { Bot, Context } from 'koishi'
import type { Config } from '../config'
import { logInfo } from '../utils/logger'
import type { AlertTarget } from '../types'

export function resolveAlertBot(ctx: Context, target: AlertTarget): Bot | null {
  if (!target.platform) return null
  if (target.selfId) return ctx.bots[`${target.platform}:${target.selfId}`] || null
  return ctx.bots.find((bot) => bot.platform === target.platform) || null
}

export async function sendToAlertTargets(ctx: Context, config: Config, content: any): Promise<void> {
  for (const target of config.alertTargets) {
    if (!target.enabled || !target.channelId) continue
    const bot = resolveAlertBot(ctx, target)
    if (!bot) {
      logInfo(
        ctx,
        config,
        `[WARN] 未找到提醒目标 Bot：${target.platform}${target.selfId ? `:${target.selfId}` : ''}。`,
      )
      continue
    }
    await bot.sendMessage(target.channelId, content)
  }
}
