import { h, type Context, type Session } from 'koishi'
import type { Config } from '../config'
import { renderContestPuppeteerImage } from '../templates/puppeteer'
import type { Contest } from '../types'
import { resolveRenderFont } from '../utils/font'
import { logInfo } from '../utils/logger'

export async function sendContestPuppeteerImage(
  ctx: Context,
  session: Session,
  config: Config,
  contests: Contest[],
  title: string,
  waitingText: string,
) {
  const start = Date.now()
  const visibleContests = contests.slice(0, config.puppeteerImageMaxDisplay)
  const waiting = config.enableWaitingHint
    ? (await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}${waitingText}`))[0]
    : null

  try {
    const fontPath = await resolveRenderFont(ctx, config, config.puppeteerImageFontPath)
    const image = await renderContestPuppeteerImage(ctx, visibleContests, {
      width: config.puppeteerImageWidth,
      darkMode: config.puppeteerImageDarkMode,
      fontPath,
      title,
      totalContestCount: contests.length,
    }, config)
    const payload = [
      ...(config.enableQuote ? [h.quote(session.messageId)] : []),
      h.image(image, 'image/png'),
    ]
    if (config.puppeteerShowRenderInfo) payload.push(h.text(`\nPuppeteer 渲染耗时：${Date.now() - start}ms`))
    await session.send(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logInfo(
      ctx,
      config,
      '[ERROR] Puppeteer 比赛日程出图失败。',
      `[ERROR] ${error instanceof Error ? error.stack || error.message : message}`,
    )
    await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}Puppeteer 出图失败：${message}`)
  } finally {
    if (waiting) {
      try {
        await session.bot?.deleteMessage?.(session.channelId, waiting)
      } catch (error) {
        logInfo(
          ctx,
          config,
          '[WARN] 删除 Puppeteer 出图等待提示失败。',
          `[WARN] ${error instanceof Error ? error.stack || error.message : error}`,
        )
      }
    }
  }
}
