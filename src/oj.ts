import { Context } from "koishi";
import { Contest } from "./type";
import { Config } from ".";

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
        return res.reverse()
    }
    return null
}

export async function other_oj_content(ctx: Context, contest_type: string) {

    let content = await ctx.http.get("https://algcontest.rainng.com/")
    let res = []
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

// export async function get_oj_format(config:Config) {
//     let res: string[];
//     if (config.alertConfig)
// }