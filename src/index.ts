import { Context, Dict, Schema, z } from 'koishi'
import { get_oj, get_oj_format, oj_abbr, oj_check, oj_content, oj_list} from './oj'
import { queryObjects } from 'v8'
import { stringify } from 'querystring'
import { Contest } from './type'

export const name = 'not-just-cf'

// export const inject = ['database']

declare module 'koishi' {
    interface Tables {
        // contest_alert: {
        //     id: number
        //     name: string
        //     start_time: number
        //     alert_time: number
        //     cut_time: number
        // }
    }
}

export interface Group {
    group_id: string
}

export interface Config { 
    alertConfig: {
        alertContest?: boolean
        alertBeforeContest?: boolean
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
                alertBeforeContest: Schema.boolean().default(false).description('是否在比赛前30分钟提醒群友').experimental(),
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
    const str_list = await get_oj_format(ctx, config.OJcontent)
    ctx.setTimeout(() => {
        alert_content(ctx, config, str_list)
    }, diff)
}

/* async function check_data(ctx: Context, config: Config) {
    
}

async function get_data(ctx: Context) {
    return await ctx.database.get('contest_alert', {})
} */

// 实验性功能 比赛前30分钟提醒
async function check_call_timer(ctx: Context, config: Config, contest_timer_callback: [Contest, () => void][]) {

    let obj_list = await get_oj(ctx, config.OJcontent)
    for (let i = 0; i < contest_timer_callback.length; i++) {
        let check = false
        let j: number
        for (j = 0; j < obj_list.length; j++) {
            if (obj_list[j].name == contest_timer_callback[i][0].name &&
                obj_list[j].stime == contest_timer_callback[i][0].stime
            ) {
                check = true
                break
            }
        }
        if (!check) {
            contest_timer_callback[i][1]()
            contest_timer_callback.splice(i, 1)
        } else {
            obj_list.splice(j, 1)
        }
    }
    // 获取当前日期
    const now = new Date();
    // 创建一个新的日期对象，表示明天早上九点
    const tomorrow9am = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0);
    for (let i = 0; i < obj_list.length; i++) {
        let timer_delay = obj_list[i].stime * 1000 - now.getTime() - 30 * 60 * 1000;
        // console.log(obj_list[i].stime * 1000 - now.getTime() - 30 * 60)
        // let timer_delay = 1000;
        let callback = ctx.timer.setTimeout(() => {
            alert_content(ctx, config, obj_list[i].to_string() + '\n距离比赛开始还有30分钟')
        }, timer_delay)
        console.log(timer_delay)
        contest_timer_callback.push([obj_list[i], callback])
    }
    // 计算时间戳差值
    let diff = tomorrow9am.getTime() - now.getTime();
    ctx.timer.setTimeout(() => {
        check_call_timer(ctx, config, contest_timer_callback)
    }, diff)
}

export function apply(ctx: Context, config: Config) {
    // ctx.database.extend('contest_alert', {
    //     id: 'unsigned',
    //     name: 'string',
    //     start_time: 'integer',
    //     alert_time: 'integer',
    //     cut_time: 'integer',
    // })

    let contest_timer_callback: [Contest, () => void][] = []

    ctx.on('ready', async () => {
        if (config.alertConfig.alertContest) {
            
            alert_contest_list(ctx, config)
        }
        // 实验性功能 比赛前30分钟提醒
        if (config.alertConfig.alertBeforeContest) {
            check_call_timer(ctx, config, contest_timer_callback)
        }
    })
    // if (config.alertContest) {
    //     ctx.setTimeout(()=>{
    //         alertTimer(ctx, 1000, config)
    //     }, 1000)
    // }

    // write your plugin here
    // 测试数据库
    // check_data(ctx, config)

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
    // ctx.command('test', 'test')
    //     .action(async (session) => {
    //         contest_check = contest_check + 1
    //         return contest_check 
    // })
}
