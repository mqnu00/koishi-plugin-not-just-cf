import { Context } from "koishi";
import { DateUtil } from "./utils/time_util";

export async function cf_api_read(ctx: Context) {
    let data = await ctx.http.get('https://codeforces.com/api/contest.list')
    if (data['status'] == 'OK') {
        let info: [] = data['result']
        let res: Array<{[key:string]: any}> = [];
        for (let i = 0; i < info.length; i++){
            if (info[i]['phase'] == 'FINISHED') break
            let dict: {[key:string]: any} = {}
            dict['name'] = info[i]['name']
            dict['stime'] = info[i]['startTimeSeconds']
            dict['dtime'] = info[i]['durationSeconds']
            res.push(dict)
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
        let name = info[i]['name']
        let stime = new DateUtil().formatDate(new Date(info[i]['stime']*1000).toLocaleString(), 'yyyy-MM-dd HH:mm:ss')
        let dtime = info[i]['dtime'] / 60
        let now: string = 
        `${name}\n比赛时间：${stime}\n比赛时长：${dtime}分钟\n${spt}\n`
        res = res.concat(now)
    }
    return res
}