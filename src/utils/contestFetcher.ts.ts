import * as cheerio from 'cheerio';
import { Contest } from "../type";
import { Context } from "koishi";
import axios from "axios";

interface LuoguContestEntry {
    id: number
    name: string
    startTime: number
    endTime: number
}

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

const defaultContestWindowDays = 3;
const oneDayInSeconds = 24 * 3600;

function getContestWindowDays(contestWindowDays: number = defaultContestWindowDays): number {
    return Math.max(0, contestWindowDays);
}

export function shouldIncludeContest(startTime: number, endTime: number, currentTime: number, contestWindowDays: number = defaultContestWindowDays) {
    if (endTime <= currentTime) {
        return false;
    }
    const safeContestWindowDays = getContestWindowDays(contestWindowDays);
    if (safeContestWindowDays === 0) {
        return true;
    }
    return startTime - currentTime <= safeContestWindowDays * oneDayInSeconds;
}

function normalizeLuoguContestEntries(data: any): LuoguContestEntry[] {
    if (Array.isArray(data?.currentData?.contests?.result)) {
        return data.currentData.contests.result;
    }
    if (Array.isArray(data?.data?.contests?.result)) {
        return data.data.contests.result;
    }
    throw new Error('invalid luogu contest payload');
}

export function extractLuoguContestEntries(payload: string | Record<string, any>) {
    if (typeof payload === 'string') {
        const $ = cheerio.load(payload);
        const serialized = $('#lentille-context').text().trim();
        if (!serialized) {
            throw new Error('luogu lentille-context payload not found');
        }
        return normalizeLuoguContestEntries(JSON.parse(serialized));
    }
    if (payload && typeof payload === 'object') {
        return normalizeLuoguContestEntries(payload);
    }
    throw new Error('unsupported luogu payload type');
}

export async function fetchCodeforcesContests(ctx: Context, contestWindowDays: number = defaultContestWindowDays) {
    const currentTime = getCurrentTime();
    try {
        const data = await ctx.http.get('https://codeforces.com/api/contest.list');
        const info: any[] = data['result'];
        const res: Contest[] = info
            .filter(contest => {
                const endTime = contest['startTimeSeconds'] + contest['durationSeconds'];
                return shouldIncludeContest(contest['startTimeSeconds'], endTime, currentTime, contestWindowDays);
            })
            .map(contest => {
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

export async function fetchLuoGuContests(ctx: Context, contestWindowDays: number = defaultContestWindowDays) {
    const currentTime = getCurrentTime();
    try {
        const data = await ctx.http.get('https://www.luogu.com.cn/contest/list?page=1&_contentOnly=1');
        const info = extractLuoguContestEntries(data);
        const res: Contest[] = info
            .filter(contest => shouldIncludeContest(contest.startTime, contest.endTime, currentTime, contestWindowDays))
            .map(contest => {
                return createContest('Luogu', contest.name, contest.startTime, contest.endTime - contest.startTime);
            });

        return res;
    } catch (error) {
        console.error("LuoGu contest fetch error:", error);
        return null;
    }
}

export async function fetchAtcoderContests(ctx: Context, contestWindowDays: number = defaultContestWindowDays) {
    const currentTime = getCurrentTime();
    try {
        const data = await ctx.http.get(`${ctx.config.githubProxy}https://raw.githubusercontent.com/mqnu00/ACM-contest-calender-maker/refs/heads/main/contest.json`);
        const $ = JSON.parse(data)
        const res = $.contests
            .filter(contest => contest.oj === 'atcoder')
            .map(info => new Contest(info.oj, info.name, info.stime, info.dtime))
            .filter(info => shouldIncludeContest(info.stime, info.stime + info.dtime, currentTime, contestWindowDays))

        return res;
    } catch (error) {
        console.error("AtCoder contest fetch error:", error);
        return null;
    }
}

export async function fetchLeetCodeContests(contestWindowDays: number = defaultContestWindowDays) {
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
                return !contest.isVirtual && shouldIncludeContest(contest.startTime, endTime, currentTime, contestWindowDays);
            })
            .map((contest: any) => createContest('LeetCode', contest.title, contest.startTime, contest.duration));
        return res;
    } catch (error) {
        console.error("LeetCode contest fetch error:", error);
        return null;
    }
}

export async function fetchNowCoderContests(ctx: Context, contestWindowDays: number = defaultContestWindowDays) {
    const currentTime = getCurrentTime();
    try {
        const response = await ctx.http.get('https://ac.nowcoder.com/acm/contest/vip-index?topCategoryFilter=13');
        const $ = cheerio.load(response);

        const res: Contest[] = [];
        $('.nk-main .platform-mod').eq(0).find('.platform-item-main').each((_, element) => {
            const name = $(element).find('h4 a').text().trim();
            const contestTime = $(element).find('.match-time-icon').text().replace(/\s+/g, ' ').trim();

            const contestId = $(element).closest('.platform-item').attr('data-id');

            const match = contestTime.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+至\s+(\d{4}-\d{2}-\d{2})?\s*(\d{2}:\d{2})/);
            const startDateTime = new Date(`${match[1]}T${match[2]}:00+08:00`);
            const endDateTime = new Date(`${match[3]}T${match[4]}:00+08:00`);

            const startTime = startDateTime.getTime() / 1000;
            const duration = (endDateTime.getTime() - startDateTime.getTime()) / 1000;
            const endTime = startTime + duration;

            if (shouldIncludeContest(startTime, endTime, currentTime, contestWindowDays)) {
                res.push(createContest('NowCoder', name, startTime, duration));
            }
        });

        return res;
    } catch (error) {
        console.error("NowCoder contest fetch error:", error);
        return null;
    }
}
