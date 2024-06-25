import { Context } from "koishi";
import { Contest } from "./type";
import { Config } from ".";
import { error } from "console";

export const oj_list = [
    'codeforces',
    'NowCoder',
    'LeetCode',
    'LuoGu'
]

export async function cf_api_read(ctx: Context) {
    let data = await ctx.http.get('https://codeforces.com/api/contest.list')
    if (data['status'] == 'OK') {
        let info: [] = data['result']
        let res: Array<Contest> = [];
        for (let i = 0; i < info.length; i++){
            if (info[i]['phase'] == 'FINISHED') break
            let now = new Contest()
            now.oj = 'codeforces'
            now.name = info[i]['name']
            now.stime = info[i]['startTimeSeconds']
            now.dtime = info[i]['durationSeconds']
            res.push(now)
        }
        return res
    }
    return null
}

export async function oj_content(ctx: Context, contest_type: string) {

    if (contest_type == 'codeforces') {
        return cf_api_read(ctx)
    } else {
        let content = await ctx.http.get("https://algcontest.rainng.com/")
        let res: Array<Contest> = []
        for (let i = 0; i < content.length; i++) {
            if (content[i].oj == contest_type && content[i].status == 'Register') {
                let now = new Contest()
                now.oj = contest_type
                now.name = content[i].name
                now.stime = content[i].startTimeStamp
                now.dtime = content[i].endTimeStamp - content[i].startTimeStamp
                res.push(now)
            }
        }
        return res
    }
}

export async function get_oj_format(ctx: Context, config:Config) {
    let res = ''
    let tmp: Array<Contest> = []
    for (let i = 0; i < config.OJcontent.length; i++) {
        tmp = tmp.concat(await oj_content(ctx, config.OJcontent[i]))
    }
    tmp = tmp.sort((a, b) => {
        return a.stime - b.stime
    })
    for (let i = 0; i < tmp.length; i++) {
        res = res.concat(tmp[i].to_string())
    }
    console.log(res)
    return res;
}