/**
 * 时间工具类
 */
export class DateUtil {

    /**
     * 格式化时间
     * 调用formatDate(strDate, 'yyyy-MM-dd');
     * @param strDate（中国标准时间、时间戳等）
     * @param strFormat（返回格式）
     */
    public formatDate(strDate: any, strFormat?: string) {
      if (!strDate) return;
      if (!strFormat) strFormat = 'yyyy-MM-dd';
    
      switch (typeof strDate) {
        case 'string':
          strDate = new Date(strDate.replace(/-/, '/'));
          break;
        case 'number':
          strDate = new Date(strDate);
          break;
      }
    
      if (strDate instanceof Date) {
        const dateInTimezone = new Date(strDate.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));
    
        const dict: any = {
          yyyy: dateInTimezone.getFullYear(),
          M: dateInTimezone.getMonth() + 1,
          d: dateInTimezone.getDate(),
          H: dateInTimezone.getHours(),
          m: dateInTimezone.getMinutes(),
          s: dateInTimezone.getSeconds(),
          MM: ('' + (dateInTimezone.getMonth() + 101)).substr(1),
          dd: ('' + (dateInTimezone.getDate() + 100)).substr(1),
          HH: ('' + (dateInTimezone.getHours() + 100)).substr(1),
          mm: ('' + (dateInTimezone.getMinutes() + 100)).substr(1),
          ss: ('' + (dateInTimezone.getSeconds() + 100)).substr(1),
        };
        
        return strFormat.replace(/(yyyy|MM?|dd?|HH?|mm?|ss?)/g, function () {
          return dict[arguments[0]];
        });
      }
    }
}
