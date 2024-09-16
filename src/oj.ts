import { Context } from "koishi";
import { Contest } from "./type";
import { fetchCodeforcesContests, fetchLuoGuContests, fetchAtcoderContests, fetchLeetCodeContests, fetchNowCoderContests } from "./utils/contestFetcher.ts";

export const oj_list = [
    'Codeforces',
    'NowCoder',
    'LeetCode',
    'Luogu',
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
    'cf--Codeforces',
    'nc--NowCoder',
    'lc--LeetCode',
    'lg--Luogu',
    'atc--AtCoder'
]

export const oj_abbr: { [key: string]: { [key: string]: string } } = {
    'Codeforces': {
        'abbr': 'cf',
        'desc': 'Codeforces（cf）'
    },
    'NowCoder': {
        'abbr': 'nc',
        'desc': '牛客（nc）'
    },
    'LeetCode': {
        'abbr': 'lc',
        'desc': '力扣（lc）'
    },
    'Luogu': {
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
        'abbr': 'Codeforces',
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
        'abbr': 'Luogu',
        'desc': 'Luogu比赛日程'
    },
    'atc': {
        'abbr': 'AtCoder',
        'desc': 'AtCoder比赛日程'
    }
}

export async function oj_content(ctx: Context, contest_type: string) {

    if (contest_type == 'Codeforces') {
        return fetchCodeforcesContests(ctx)
    }
    if (contest_type == 'AtCoder') {
        return fetchAtcoderContests(ctx)
    }
    if (contest_type == 'Luogu') {
        return fetchLuoGuContests(ctx)
    }
    if (contest_type == 'LeetCode') {
        return fetchLeetCodeContests()
    }
    if (contest_type == 'NowCoder') {
        return fetchNowCoderContests(ctx)
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