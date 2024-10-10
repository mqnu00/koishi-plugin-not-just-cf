import { DateUtil } from "./utils/time_util"
export class Contest {
    oj: string
    name: string
    // 单位 秒
    stime: number
    dtime: number
    to_string() {
        let spt = '--------------------'
        let oj = this.oj
        let name = this.name
        let stime = new DateUtil().formatDate(new Date(this.stime * 1000).toLocaleString(), 'yyyy-MM-dd HH:mm:ss')
        let dtime = this.dtime / 60
        let now: string =
            `${name}\n比赛平台：${oj}\n比赛时间：${stime}\n比赛时长：${dtime}分钟\n${spt}\n`
        return now
    }
}