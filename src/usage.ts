const pkg = require('../package.json')

const KOISHI_LOGO_BASE64 = 'data%3Aimage%2Fpng%3Bbase64%2CiVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAABU0lEQVR42p2UQSsFYRSGnxnqLuytKWKpKFkQNsS%2FsOHPWPADLCmxU5S7UzYWNrJR7lYiRF2FeWzOMKZ7mXHqNNP5vvP2nu%2B850CY2lP4X1K31ZbaDm%2BpO%2Bpyp5wfAXVEPfRvO1JHf4AVQGbUh7j4EZ4VkrNCXPVRnf3CUBN1SH2KC28VGOV3ntRhNclZHdcAKYM11QR1oVBOXctzFlNgBTC8qmXxPQEegbVeYApIgJT6tg%2F0AdMp0B%2FBpCabK2AAmAAa%2F2GRBft1oBFPkqTAba7LCiAfQC9wClwAY1HJHepuiO29Yrsf1Dn1uiDU3RTYCtTkl1Leg8k9MB4NGgReI28rV3azgyCz0og01Xl1Uz1QX8uCTELm3UbkTF1VJ9Wr0tn3iBSGdjYG0XivE3VN3VD31PM4a3cc2tIGGI0VkTO7rLxGuiy25ejmjfqsvkSXui62TxaK03td4FXTAAAAAElFTkSuQmCC'

export const usage = `
<h1>📅 Koishi 多平台 算法赛事 查询+推送 助手</h1>
<h2>🧩 koishi-plugin-not-just-cf-vincentzyu-fork</h2>
<h3>🏷️ 当前版本：v${pkg.version}</h3>

<p>
  <a href="https://www.npmjs.com/package/koishi-plugin-not-just-cf-vincentzyu-fork" target="_blank">
    <img src="https://img.shields.io/npm/v/koishi-plugin-not-just-cf-vincentzyu-fork?style=flat-square&logo=npm" alt="npm version">
  </a>
  <a href="https://www.npmjs.com/package/koishi-plugin-not-just-cf-vincentzyu-fork" target="_blank">
    <img src="https://img.shields.io/npm/dm/koishi-plugin-not-just-cf-vincentzyu-fork?style=flat-square&logo=npm" alt="npm downloads">
  </a>
  <br>
  <a href="https://opensource.org/license/mit" target="_blank">
    <img src="https://img.shields.io/badge/license-MIT-2ea44f?style=flat-square&logo=opensourceinitiative&logoColor=white" alt="MIT License">
  </a>
  <br>
  <a href="https://www.typescriptlang.org/" target="_blank">
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  </a>
  <a href="https://pptr.dev/" target="_blank">
    <img src="https://img.shields.io/badge/Puppeteer-HTML-40B5A4?style=flat-square&logo=googlechrome&logoColor=white" alt="Puppeteer HTML">
  </a>
  <a href="https://github.com/kane50613/takumi" target="_blank">
    <img src="https://img.shields.io/badge/Takumi-WASM-654FF0?style=flat-square&logo=webassembly&logoColor=white" alt="Takumi WASM">
  </a>
  <br>
  <a href="https://github.com/VincentZyuApps/koishi-plugin-not-just-cf-vincentzyu-fork" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
  </a>
  <a href="https://gitee.com/vincent-zyu/koishi-plugin-not-just-cf-vincentzyu-fork" target="_blank">
    <img src="https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white" alt="Gitee">
  </a>
  <br>
  <a href="https://forum.koishi.xyz/t/topic/xxxxx" target="_blank">
    <img src="https://img.shields.io/badge/Koishi%20Forum-xxxxx-5546A3?style=for-the-badge&logo=${KOISHI_LOGO_BASE64}&logoColor=white" alt="Koishi Forum">
  </a>
  <a href="https://qm.qq.com/q/4REAsoZiFy" target="_blank">
    <img src="https://img.shields.io/badge/QQ%E7%BE%A4-1085190201-12B7F5?style=flat-square&logo=qq&logoColor=white" alt="QQ群">
  </a>
</p>

<h2>💬 交流反馈</h2>
<p>🐛 Bug 反馈 / 💡 建议 / 👨‍💻 插件开发交流，欢迎加群：</p>
<p><del>📦 插件使用问题 / 🐛 Bug 反馈 / 👨‍💻 插件开发交流，欢迎加入 QQ 群：<b>259248174</b>（这个群 G 了）</del></p>
<p>📦 插件使用问题 / 🐛 Bug 反馈 / 👨‍💻 插件开发交流，欢迎加入 QQ 群：<b>1085190201</b></p>
<p>在群里直接艾特我，回复得更快哦~ ✨</p>

<p>聚合 <b>Codeforces、NowCoder、LeetCode、Luogu、AtCoder</b> 的近期比赛，支持文字、Takumi、Puppeteer 运营看板和 QQ Markdown 输出。</p>

<h2>⚠️ 服务依赖</h2>
<ul>
  <li>🌐 <b>http（必需）</b>：获取各比赛平台数据和自动下载字体。</li>
  <li>🎨 <b>puppeteer（可选）</b>：启用 <code>puppeteer_image</code> 运营看板输出。</li>
  <li>⏰ <b>cron（可选）</b>：启用每日定时比赛提醒。</li>
</ul>

<h2>🚀 常用命令</h2>
<table>
  <thead><tr><th>命令</th><th>说明</th></tr></thead>
  <tbody>
    <tr><td><code>contest.all</code></td><td>查看全部已启用平台的近期比赛</td></tr>
    <tr><td><code>contest.list cf</code></td><td>查看指定平台，支持 <code>cf / nc / lc / lg / atc</code></td></tr>
  </tbody>
</table>

<h2>📤 输出模式</h2>
<ul>
  <li><code>text</code>：带 emoji 的文字比赛列表。</li>
  <li><code>takumi_image</code>：简洁稳定的 Takumi WASM 图片。</li>
  <li><code>puppeteer_image</code>：包含平台 Logo、统计和焦点赛事的 HTML 运营看板。</li>
  <li><code>qqmarkdown_style</code> / <code>qqmarkdown_table</code>：QQ 官方 Bot Markdown 与快捷按钮。</li>
</ul>

<details>
<summary><b>📖 运行说明（点击展开）</b></summary>
<ul>
  <li>🔤 图片模式会自动检查 LXGW 文楷字体，优先从 Gitee 下载，失败后回退 GitHub，并执行完整 hash 校验。</li>
  <li>📦 Puppeteer 内置资源会按内容复制到 <code>ctx.baseDir/data/assets/not-just-cf-vincentzyu-fork</code>，运行时不会直接读取或写入插件安装目录。</li>
  <li>📁 开启 <code>verboseFileLog</code> 后，各平台最后一次完整响应会写入 Koishi 根目录的 <code>cache/not-just-cf-vincentzyu-fork</code>。</li>
  <li>🐧 QQ Markdown 仅支持 QQ 官方 Bot；其他平台仍可使用文字与图片输出。</li>
  <li>🖼️ 完整说明与图片预览请前往 GitHub 或 Gitee README。</li>
</ul>
</details>

<hr>
<p>🆓 本插件基于 MIT 协议开源，欢迎反馈问题、提交建议与参与开发。</p>
`
