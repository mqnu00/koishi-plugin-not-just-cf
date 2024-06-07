import { Context, Schema } from 'koishi'
import { format_cf_read } from './cf'

export const name = 'not-just-cf'

export const inject = ['database']

declare module 'koishi' {
    interface Tables {
        contest_alert: {
            id: number
            name: string
            start_time: number
            alert_time: number
            cut_time: number
        }
    }
}

export interface Config { 
    alertContest?: boolean
    bot_platform?: string
    bot_selfid?: string
    alertTime?: number[]
    sendGroup?: number[]
}


export const Config: Schema<Config> = Schema.object({
    alertContest: Schema
    .boolean()
    .default(false)
    .description('是否定时通知比赛日程'),
    alertTime: Schema
    .array(Number)
    .description('比赛开始前多久提醒[分钟]'),
    bot_platform: Schema
    .string()
    .description('机器人平台，可以查看适配器名称，比如adapter-onebot就填入onebot'),
    bot_selfid: Schema
    .string()
    .description('机器人的账号'),
    sendGroup: Schema
    .array(Number)
    .description('发送给哪个群')
})

export function alertTimer(ctx: Context, dtime: number, config: Config) {
    
    const res_list = format_cf_read(ctx)
    const bot = ctx.bots[`${config.bot_platform}:${config.bot_selfid}`]
    if (bot == undefined) {
        console.log(`${config.bot_platform}:${config.bot_selfid}`)
        console.log('koishi-plugin-not-just-cf config: wrong bot_platform or bot_selfid')
        return 
    }
    for (let group_i = 0; group_i < config.sendGroup.length; group_i++) {
        bot.sendMessage(`${config.sendGroup[group_i]}`, '???')
    }
    
    ctx.timer.setTimeout(()=>{
        alertTimer(ctx, dtime, config)
    }, dtime)
}

export function apply(ctx: Context, config: Config) {
    ctx.database.extend('contest_alert', {
        id: 'unsigned',
        name: 'string',
        start_time: 'integer',
        alert_time: 'integer',
        cut_time: 'integer'
    })

    ctx.on('ready', async () => {
        if (config.alertContest) {
            if (
                config.alertTime.length == 0 ||
                config.bot_platform == null||
                config.bot_selfid == null

            )
                throw new Error("koishi-plugin-not-just-cf need redo config");
        }
    })
    // if (config.alertContest) {
    //     ctx.setTimeout(()=>{
    //         alertTimer(ctx, 1000, config)
    //     }, 1000)
    // }
    

    // write your plugin here
    ctx.command('cf.list', '提供cf比赛日程')
        .action(async ({ session }) => {

            const res_list = format_cf_read(ctx)
            return res_list
        })
}
