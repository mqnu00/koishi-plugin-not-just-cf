import { Context, Dict, Schema, z } from 'koishi'
import { get_oj_format, oj_abbr, oj_check, oj_list} from './oj'

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

export interface Group {
    group_id: string
}

export interface Config { 
    alertConfig: {
        alertContest?: boolean
        botPlatform?: string
        botSelfid?: string
        alertContestList?: Group[]
    },
    OJcontent?: string[]
}


export const Config: Schema<Config> = Schema.object({
    OJcontent: Schema
    .array(Schema.union(oj_list))
    .default(oj_list)
    .role('checkbox')
    .description('插件提供的比赛日程的平台'),
    alertConfig: Schema
    .intersect([
        Schema.object({
            alertContest: Schema.boolean().default(false).description('是否每天提醒群友比赛日程（默认早上9点），提醒内容是已勾选的比赛平台')
        }),
        Schema.union([
            Schema.object({
                alertContest: Schema.const(true).required(),
                botPlatform: Schema.string().required().description('机器人平台，可以查看适配器名称，比如adapter-onebot就填入onebot'),
                botSelfid: Schema.string().required().description('机器人的账号'),
                alertContestList: Schema.array(Schema.object({
                    group_id: Schema.string().description('发送给哪个群(群号)').required()
                }))
            }).description('群组提醒设置'),
            Schema.object({})
        ])
    ])
})

export function alert_content(ctx: Context, config: Config, content: string) {
    
    const bot = ctx.bots[`${config.alertConfig.botPlatform}:${config.alertConfig.botSelfid}`]
    if (bot == undefined) {
        console.log(`${config.alertConfig.botPlatform}:${config.alertConfig.botSelfid}`)
        console.log('koishi-plugin-not-just-cf config: wrong bot_platform or bot_selfid')
        return 
    }
    for (let group_i = 0; group_i < config.alertConfig.alertContestList.length; group_i++) {
        bot.sendMessage(config.alertConfig.alertContestList[group_i].group_id, content)
    }
}

export async function alert_contest_list(ctx: Context, config: Config) {
    // 获取当前日期
    const now = new Date();
    // 创建一个新的日期对象，表示明天早上九点
    const tomorrow9am = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0);
    // 计算时间戳差值
    let diff = tomorrow9am.getTime() - now.getTime();
    // diff = 1000
    const res_list = await get_oj_format(ctx, config.OJcontent)
    ctx.setTimeout(() => {
        alert_content(ctx, config, res_list)
    }, diff)
    ctx.timer.setTimeout(() => {
        alert_contest_list(ctx, config)
    }, diff)
}

export function apply(ctx: Context, config: Config) {
    // ctx.database.extend('contest_alert', {
    //     id: 'unsigned',
    //     name: 'string',
    //     start_time: 'integer',
    //     alert_time: 'integer',
    //     cut_time: 'integer'
    // })

    ctx.on('ready', async () => {
        if (config.alertConfig.alertContest) {
            
            alert_contest_list(ctx, config)
        }
    })
    // if (config.alertContest) {
    //     ctx.setTimeout(()=>{
    //         alertTimer(ctx, 1000, config)
    //     }, 1000)
    // }

    // write your plugin here
    let contest_check = ''
    for (let i = 0; i < config.OJcontent.length; i++) {
        contest_check = contest_check.concat(`${oj_abbr[config.OJcontent[i]]['desc']}\n`)
    }

    ctx.command('contest', `现在提供的比赛平台有：\n${contest_check}`)
    ctx.command('contest.tot', '列出所有比赛')
    .action(async ({session}) => {
        const res_list = await get_oj_format(ctx, config.OJcontent)
        return res_list
    })
    ctx.command('contest/list <contest_name>', '提供指定比赛日程')
        .action(async (session, contest_name ) => {
            if (contest_name == undefined || !config.OJcontent.includes(oj_check[contest_name]['abbr'])) {
                return `需要 list cf/nc/lc/ng \n 例子：【list cf】`
            }
            let tmp = [oj_check[contest_name]['abbr']]
            const res_list = await get_oj_format(ctx, tmp)
            return res_list
        })
}
