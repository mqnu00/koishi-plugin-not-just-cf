import { Context, Schema } from 'koishi'
import { format_cf_read } from './cf'

export const name = 'not-just-cf'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  // write your plugin here
  ctx.on('message', (session) => {
    if (session.content === 'cf') {
        format_cf_read(ctx).then((info) => {
            session.send(info)
        })
    }
})
}
