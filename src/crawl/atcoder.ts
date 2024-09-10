import axios from 'axios';
import * as cheerio from 'cheerio';
import { Contest } from "../type";

export async function fetchAtcoderContests(){
    const response = await axios.get('https://atcoder.jp/contests/');
    const $ = cheerio.load(response.data);

    const table = $('table').eq(1);
    const res: Contest[] = [];

    table.find('tbody tr').each((_, element) => {
        const tds = $(element).find('td');

        // 获取比赛开始时间
        const rawStartTime = tds.eq(0).find('time').text();
        const formattedTime = rawStartTime.replace(/(\d{2})(\d{2})$/, '$1:$2');
        const startTime = new Date(formattedTime);
        const startTimeStamp = startTime.getTime() / 1000;

        // 获取比赛名称和链接
        const name = tds.eq(1).find('a').text();
        const link = "https://atcoder.jp" + tds.eq(1).find('a').attr('href');

        // 比赛持续时间
        const length = tds.eq(2).text().trim();
        const [hours, minutes] = length.split(':').map(Number);
        const totalSeconds = (hours * 3600) + (minutes * 60);

        // 创建Contest对象
        let now = new Contest()
        now.oj = 'AtCoder'
        now.name = name
        now.stime = startTimeStamp
        now.dtime = totalSeconds

        res.push(now)
    });

    return res;
}