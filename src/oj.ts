import { Context } from "koishi";
import { Contest } from "./type";
import { fetchAtcoderContests } from "./crawl/atcoder";

export const oj_list = [
    'codeforces',
    'NowCoder',
    'LeetCode',
    'LuoGu',
    'AtCoder'
]

export const oj_abb = [
    'cf',
    'nc',
    'lc',
    'lg',
    'atc'
]

export const oj_alise = [
    'cf--codeforces',
    'nc--NowCoder',
    'lc--LeetCode',
    'lg--LuoGu',
    'atc--AtCoder'
]

export const oj_abbr: { [key: string]: { [key: string]: string } } = {
    'codeforces': {
        'abbr': 'cf',
        'desc': 'codeforces（cf）'
    },
    'NowCoder': {
        'abbr': 'nc',
        'desc': '牛客（nc）'
    },
    'LeetCode': {
        'abbr': 'lc',
        'desc': '力扣（lc）'
    },
    'LuoGu': {
        'abbr': 'lg',
        'desc': '洛谷（lg）'
    },
    'AtCoder': {
        'abbr': 'atc',
        'desc': 'AtCoder（atc）'
    }
}

export const oj_check: { [key: string]: { [key: string]: string } } = {
    'cf': {
        'abbr': 'codeforces',
        'desc': 'codeforces比赛日程'
    },
    'nc': {
        'abbr': 'NowCoder',
        'desc': 'NowCoder比赛日程'
    },
    'lc': {
        'abbr': 'LeetCode',
        'desc': 'LeetCode比赛日程'
    },
    'lg': {
        'abbr': 'LuoGu',
        'desc': 'LuoGu比赛日程'
    },
    'atc': {
        'abbr': 'AtCoder',
        'desc': 'AtCoder比赛日程'
    }
}

export async function cf_api_read(ctx: Context) {
    let data = await ctx.http.get('https://codeforces.com/api/contest.list')
    if (data['status'] == 'OK') {
        let info: [] = data['result']
        let res: Array<Contest> = [];
        for (let i = 0; i < info.length; i++) {
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
    } if (contest_type == 'AtCoder') {
        return fetchAtcoderContests()
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

export async function get_oj_format(ctx: Context, check: string[]) {
    let res = ''
    let tmp: Array<Contest> = []
    for (let i = 0; i < check.length; i++) {
        tmp = tmp.concat(await oj_content(ctx, check[i]))
    }
    tmp = tmp.sort((a, b) => {
        return a.stime - b.stime
    })
    if (tmp.length == 0) return '没有比赛'
    for (let i = 0; i < tmp.length; i++) {
        res = res.concat(tmp[i].to_string())
    }
    return res;
}