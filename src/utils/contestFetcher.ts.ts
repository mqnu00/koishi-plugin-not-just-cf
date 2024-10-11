import * as cheerio from 'cheerio';
import { Contest } from "../type";
import { Context } from "koishi";
import axios from "axios";

function createContest(oj: string, name: string, stime: number, dtime: number): Contest {
    const contest = new Contest();
    contest.oj = oj;
    contest.name = name;
    contest.stime = stime;
    contest.dtime = dtime;
    return contest;
}

function getCurrentTime(): number {
    return Math.floor(Date.now() / 1000);
}

const threeDaysInSeconds = 3 * 24 * 3600;

export async function fetchCodeforcesContests(ctx: Context) {
    const currentTime = getCurrentTime();
    try {
        const data = await ctx.http.get('https://codeforces.com/api/contest.list');
        const info: any[] = data['result'];
        const res: Contest[] = info
            .filter(contest => {
                const endTime = contest['startTimeSeconds'] + contest['durationSeconds'];
                return endTime > currentTime && contest['startTimeSeconds'] - currentTime <= threeDaysInSeconds;
            })
            .map(contest => {
                const link = `https://codeforces.com/contest/${contest['id']}`;
                return createContest(
                    'Codeforces',
                    contest['name'],
                    contest['startTimeSeconds'],
                    contest['durationSeconds'],
                );
            });

        return res;
    } catch (error) {
        console.error("Codeforces contest fetch error:", error);
        return null;
    }
}

export async function fetchLuoGuContests(ctx: Context) {
    const currentTime = getCurrentTime();
    try {
        const data = await ctx.http.get('https://www.luogu.com.cn/contest/list?page=1&_contentOnly=1');
        const info = data.currentData.contests.result;
        const res: Contest[] = info
            .filter(contest => contest.endTime > currentTime && contest.startTime - currentTime <= threeDaysInSeconds)
            .map(contest => {
                const link = `https://www.luogu.com.cn/contest/${contest.id}`;
                return createContest('Luogu', contest.name, contest.startTime, contest.endTime - contest.startTime);
            });

        return res;
    } catch (error) {
        console.error("LuoGu contest fetch error:", error);
        return null;
    }
}

export async function fetchAtcoderContests(ctx: Context) {
    const currentTime = getCurrentTime();
    try {
        const data = await ctx.http.get('https://github.moeyy.xyz/https://raw.githubusercontent.com/mqnu00/ACM-contest-calender-maker/refs/heads/main/contest.json');
        const $ = JSON.parse(data)
        // console.log($.timezone)
        const now = new Date()
        const res = $.contests.filter(contest => contest.oj === 'atcoder').map(info => new Contest(info.oj, info.name, info.stime, info.dtime)).filter(info => info.stime * 1000 <= (now.getTime() + 3 * 24 * 60 * 60 * 1000))
        // console.log(now.getTime() + 3 * 24 * 60 * 60 * 1000)
        // console.log(res)
        // const data = await ctx.http.get('https://atcoder.jp/contests/');
        // const $ = cheerio.load(data);

        // const res: Contest[] = [];
        // $('table').eq(1).find('tbody tr').each((_, element) => {
        //     const tds = $(element).find('td');
        //     const rawStartTime = tds.eq(0).find('time').text();
        //     const formattedTime = rawStartTime.replace(/(\d{2})(\d{2})$/, '$1:$2');
        //     const startTime = new Date(formattedTime).getTime() / 1000;
        //     const name = tds.eq(1).find('a').text();
        //     console.log(name)
        //     const link = 'https://atcoder.jp' + tds.eq(1).find('a').attr('href');
        //     const length = tds.eq(2).text().trim();
        //     const [hours, minutes] = length.split(':').map(Number);
        //     const duration = (hours * 3600) + (minutes * 60);

        //     const endTime = startTime + duration;

        //     if (endTime > currentTime && startTime - currentTime <= threeDaysInSeconds) {
        //         res.push(createContest('AtCoder', name, startTime, duration));
        //     }
        // });

        return res;
    } catch (error) {
        console.error("AtCoder contest fetch error:", error);
        return null;
    }
}

export async function fetchLeetCodeContests() {
    const currentTime = getCurrentTime();
    try {
        const response = await axios.post('https://leetcode.com/graphql', {
            operationName: null,
            variables: {},
            query: `{
                allContests {
                    title
                    titleSlug
                    startTime
                    duration
                    isVirtual
                }
            }`
        }, {
            headers: {
                'Referer': 'https://leetcode.com/',
                'Content-Type': 'application/json',
            }
        });

        const contests = response.data.data.allContests;
        const res: Contest[] = contests
            .filter((contest: any) => {
                const endTime = contest.startTime + contest.duration;
                return !contest.isVirtual && endTime > currentTime && contest.startTime - currentTime <= threeDaysInSeconds;
            })
            .map((contest: any) => createContest('LeetCode', contest.title, contest.startTime, contest.duration));
        return res;
    } catch (error) {
        console.error("LeetCode contest fetch error:", error);
        return null;
    }
}

export async function fetchNowCoderContests(ctx: Context) {
    const currentTime = getCurrentTime();
    try {
        const response = await ctx.http.get('https://ac.nowcoder.com/acm/contest/vip-index?topCategoryFilter=13');
        const $ = cheerio.load(response);

        const res: Contest[] = [];
        $('.nk-main .platform-mod').eq(0).find('.platform-item-main').each((_, element) => {
            const name = $(element).find('h4 a').text().trim();
            const contestTime = $(element).find('.match-time-icon').text().replace(/\s+/g, ' ').trim();
            
            const contestId = $(element).closest('.platform-item').attr('data-id');
            const link = `https://ac.nowcoder.com/acm/contest/${contestId}`;

            const match = contestTime.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+至\s+(\d{4}-\d{2}-\d{2})?\s*(\d{2}:\d{2})/);
            const startDateTime = new Date(`${match[1]}T${match[2]}:00+08:00`);
            const endDateTime = new Date(`${match[3]}T${match[4]}:00+08:00`);

            const startTime = startDateTime.getTime() / 1000;
            const duration = (endDateTime.getTime() - startDateTime.getTime()) / 1000;
            const endTime = startTime + duration;

            if (endTime > currentTime && startTime - currentTime <= threeDaysInSeconds) {
                res.push(createContest('NowCoder', name, startTime, duration));
            }
        });

        return res;
    } catch (error) {
        console.error("NowCoder contest fetch error:", error);
        return null;
    }
}