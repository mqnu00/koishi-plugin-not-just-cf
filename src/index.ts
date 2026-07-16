import type { Context } from 'koishi'
import { registerAllCommand } from './commands/all'
import { registerListCommand } from './commands/list'
import type { Config as NotJustCfConfig } from './config'
import { Config as ConfigSchema } from './config'
import { registerAlerts } from './services/alert'
import { ensureLxgwFont } from './utils/font'
import { ensureRuntimeAssets } from './utils/assets'
import { logInfo } from './utils/logger'

export const name = 'not-just-cf'
export const Config = ConfigSchema
export { usage } from './usage'

export const inject = {
  required: ['http'],
  optional: ['cron', 'puppeteer'],
}

export function apply(ctx: Context, config: NotJustCfConfig) {
  if (config.outputFormats.includes('takumi_image') || config.outputFormats.includes('puppeteer_image')) {
    ensureLxgwFont(ctx, config).catch((error) => {
      logInfo(
        ctx,
        config,
        '[WARN] 图片字体预检查失败，将在命令执行时重试。',
        `[WARN] ${error instanceof Error ? error.stack || error.message : error}`,
      )
    })
  }
  if (config.outputFormats.includes('puppeteer_image')) {
    ensureRuntimeAssets(ctx, config).catch((error) => {
      logInfo(
        ctx,
        config,
        '[WARN] Puppeteer 运行时资源预检查失败，将在命令执行时重试。',
        `[WARN] ${error instanceof Error ? error.stack || error.message : error}`,
      )
    })
  }
  registerAllCommand(ctx, config)
  registerListCommand(ctx, config)
  registerAlerts(ctx, config)
}
