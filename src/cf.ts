import { Context } from "koishi";
import { DateUtil } from "./utils/time_util";
import { Contest } from "./type";

export async function cf_api_read(ctx: Context) {
    let data = await ctx.http.get('https://codeforces.com/api/contest.list')
    if (data['status'] == 'OK') {
        let info: [] = data['result']
        let res: Array<Contest> = [];
        for (let i = 0; i < info.length; i++){
            if (info[i]['phase'] == 'FINISHED') break
            let now = new Contest()
            now.name = info[i]['name']
            now.stime = info[i]['startTimeSeconds']
            now.dtime = info[i]['durationSeconds']
            res.push(now)
        }
        return res.reverse()
    }
    return null
}


export async function format_cf_read(ctx: Context) {
    let info = await cf_api_read(ctx)
    let res = ''
    let spt = '--------------------'
    for (let i = 0; i < info.length; i++) {
        res = res.concat(info[i].to_string())
    }
    return res
}