import type { BrandIconFn } from "reicon-brands"

/** Public assets live under the deploy base, which is not always "/". */
const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`

import { Autodesk, Github, Origin, Photopea } from "reicon-brands"
import type { IconComponent } from "reicon-react"
import {
  AwardCertificate,
  Bolt,
  Bulb,
  Calculator,
  Calendar,
  Card,
  Check,
  Coin2,
  Envelope,
  Flask,
  GraduationCap,
  Library,
  MagicStar,
  Medal,
  Monitor,
  Note,
  Printer,
  Shield,
  Sledgehammer,
  Sparkle,
  TestTube,
  Video,
  Wallet,
} from "reicon-react"

/** Which surface a logo was drawn for. */
export type Chip = "light" | "dark"

export type SiteMark =
  | { kind: "glyph"; Icon: IconComponent }
  /**
   * A logo file. `fill` lets an opaque square icon become the plate itself;
   * `tint` puts a see-through logo on a plate of the colour in `plate`.
   */
  | { kind: "logo"; src: string; chip: Chip | "tint"; fit?: "inset" | "fill"; plate?: string }
  /** A mark from the Reicon brand set, drawn in the brand's own colour. */
  | { kind: "brand"; Icon: BrandIconFn; chip: Chip }
  /** A site the user added: its first character on a light plate. */
  | { kind: "letter"; text: string }

export type Site = {
  id: string
  title: string
  description: string
  url: string
  mark: SiteMark
}

export type SiteSection = {
  id: string
  label: string
  sites: Site[]
}

const glyph = (Icon: IconComponent): SiteMark => ({ kind: "glyph", Icon })
const logo = (src: string, chip: Chip, fit: "inset" | "fill" = "inset"): SiteMark => ({
  kind: "logo",
  src,
  chip,
  fit,
})
const brand = (Icon: BrandIconFn): SiteMark => ({ kind: "brand", Icon, chip: "light" })

const official: Site[] = [
  {
    id: "system-1",
    title: "1系统",
    description: "教学一体化系统",
    url: "https://1.tongji.edu.cn",
    mark: logo(asset("/brand/1.png"), "light", "fill"),
  },
  {
    id: "canvas",
    title: "Canvas",
    description: "课程公告与作业",
    url: "http://canvas.tongji.edu.cn/",
    mark: logo(asset("/brand/canvas.png"), "light"),
  },
  {
    id: "mobile-portal",
    title: "移动门户",
    description: "移动端门户与小程序",
    url: "https://all4u.tongji.edu.cn/tj-portal/page/mobile",
    mark: logo(asset("/brand/mobile-portal.png"), "light"),
  },
  {
    id: "dorm-power",
    title: "宿舍购电",
    description: "一卡通直接扣费",
    url: "http://goudian.tongji.edu.cn/",
    mark: glyph(Bolt),
  },
  {
    id: "ai-platform",
    title: "同济 AI 平台",
    description: "创建和使用智能体",
    url: "http://agent.tongji.edu.cn/",
    mark: glyph(Sparkle),
  },
  {
    id: "one-stop",
    title: "一网通办",
    description: "奖学金、助学金办理",
    url: "http://myportal.tongji.edu.cn/",
    mark: glyph(Note),
  },
  {
    id: "mail",
    title: "同济邮箱",
    description: "教育邮箱",
    url: "https://mail.tongji.edu.cn/",
    mark: glyph(Envelope),
  },
  {
    id: "look",
    title: "智慧教学媒体",
    description: "录播回放与课件",
    url: "https://look.tongji.edu.cn",
    mark: glyph(Video),
  },
  {
    id: "cloud-media",
    title: "云媒体平台",
    description: "旧版录播平台",
    url: "http://v.tongji.edu.cn",
    mark: logo(asset("/brand/cloud-media.ico"), "light", "fill"),
  },
  {
    id: "self-print",
    title: "自助服务",
    description: "成绩排名自助打印",
    url: "https://zzfw.tongji.edu.cn/wec-self-print-app-console/mobile.html#/mobile/orderDetail?id=1798312171055091713",
    mark: glyph(Printer),
  },
  {
    id: "physics-lab",
    title: "物理实验中心",
    description: "账号密码均为学号",
    url: "http://phyvr.tongji.edu.cn",
    mark: glyph(Flask),
  },
  {
    id: "second-class",
    title: "第二课堂",
    description: "劳动学时活动",
    url: "https://itongjis.tongji.edu.cn/",
    mark: glyph(Medal),
  },
  {
    id: "library",
    title: "图书馆",
    description: "论文数据库与预约",
    url: "http://www.lib.tongji.edu.cn/",
    mark: glyph(Library),
  },
  {
    id: "software",
    title: "正版软件",
    description: "正版软件下载",
    url: "https://software.tongji.edu.cn/",
    mark: glyph(AwardCertificate),
  },
  {
    id: "yunpan",
    title: "同济云盘",
    description: "云盘服务",
    url: "https://yunpan.tongji.edu.cn/",
    mark: logo(asset("/brand/yunpan.png"), "light", "fill"),
  },
  {
    id: "logistics",
    title: "同济后勤",
    description: "报修、宽带与投诉",
    url: "https://tjhq.tongji.edu.cn",
    mark: glyph(Sledgehammer),
  },
  {
    id: "work-study",
    title: "勤工助学",
    description: "岗位申请与管理",
    url: "http://myportal.tongji.edu.cn/xsfwdt/sys/qgzxapp/*default/index.do?EMAP_LANG=zh",
    mark: glyph(Wallet),
  },
  {
    id: "innovation",
    title: "创新创业",
    description: "SITP 与创新项目",
    url: "https://cxcy.tongji.edu.cn/",
    mark: glyph(Bulb),
  },
  {
    id: "stadium",
    title: "体育场馆预约",
    description: "羽毛球、乒乓球等",
    url: "https://stadium.tongji.edu.cn",
    mark: logo(asset("/brand/stadium.ico"), "light", "fill"),
  },
  {
    id: "math-class",
    title: "高数同步课堂",
    description: "高数同步录播",
    url: "https://gaoshutongbu.tongji.edu.cn/index.htm",
    mark: glyph(Calculator),
  },
  {
    id: "freshman",
    title: "新生任务指引",
    description: "入学任务清单",
    url: "https://1.tongji.edu.cn/welcome",
    mark: glyph(Check),
  },
  {
    id: "finance",
    title: "财务处",
    description: "学费与各类缴费",
    url: "https://paycwc.tongji.edu.cn/payment/",
    mark: glyph(Card),
  },
  {
    id: "nic",
    title: "信息化办公室",
    description: "校园信息化服务",
    url: "https://nic.tongji.edu.cn/main.htm",
    mark: glyph(Monitor),
  },
  {
    id: "vpn-download",
    title: "同济 VPN 下载",
    description: "客户端与配置说明",
    url: "https://nic.tongji.edu.cn/xzzq/VPNkhdxz.htm",
    mark: glyph(Shield),
  },
  {
    id: "agi",
    title: "同济大学人工智能服务平台",
    description: "同济大学自部署的AI资源",
    url: "https://agi.tongji.edu.cn",
    mark: logo("https://agi.tongji.edu.cn/favicon.ico", "light"),
  },
]

const course: Site[] = [
  {
    id: "ocs",
    title: "OCS 网课助手",
    description: "网课平台脚本扩展",
    url: "https://docs.ocsjs.com",
    mark: logo(asset("/brand/ocs.png"), "light"),
  },
  {
    id: "mooc",
    title: "中国大学 MOOC",
    description: "在线课程",
    url: "https://www.icourse163.org/",
    mark: logo(asset("/brand/mooc.png"), "light"),
  },
  {
    id: "chaoxing",
    title: "超星学习通",
    description: "课程与签到",
    url: "http://www.chaoxing.com/",
    mark: logo(asset("/brand/cx.png"), "light", "fill"),
  },
  {
    id: "zhihuishu",
    title: "智慧树",
    description: "在线课程平台",
    url: "https://onlineweb.zhihuishu.com/",
    mark: logo(asset("/brand/zhihuishu.jpg"), "light", "fill"),
  },
  {
    id: "ketangpai",
    title: "课堂派",
    description: "课堂互动与作业",
    url: "https://www.ketangpai.com/#/main",
    mark: logo(asset("/brand/ketangpai.ico"), "light", "fill"),
  },
  {
    id: "ilab",
    title: "ilab 虚拟实验",
    description: "虚拟仿真实验",
    url: "https://www.ilab-x.com/",
    mark: glyph(TestTube),
  },
  {
    id: "tongji",
    title: "同济大学好课平台",
    description: "数学基础课常用网站",
    url: "https://tongji.aihaoke.net",
    mark: logo("https://tongji.aihaoke.net/favicon.ico", "light"),
  },
]

const academic: Site[] = [
  {
    id: "scholar",
    title: "Google Scholar",
    description: "学术文献检索",
    url: "https://scholar.google.com",
    mark: logo(asset("/brand/google-scholar.png"), "light"),
  },
  {
    id: "semantic-scholar",
    title: "Semantic Scholar",
    description: "AI 辅助文献检索",
    url: "https://www.semanticscholar.org",
    mark: logo(asset("/brand/semanticscholar.png"), "light"),
  },
  {
    id: "cnki",
    title: "中国知网",
    description: "中文期刊与学位论文",
    url: "https://www.cnki.net",
    mark: logo(asset("/brand/cnki.png"), "light"),
  },
  {
    id: "wos",
    title: "Web of Science",
    description: "引文索引数据库",
    url: "https://www.webofscience.com",
    mark: logo(asset("/brand/wos.png"), "light"),
  },
  {
    id: "wanfang",
    title: "万方数据",
    description: "学位论文与期刊",
    url: "https://www.wanfangdata.com.cn",
    mark: logo(asset("/brand/wanfang.png"), "light"),
  },
  {
    id: "arxiv",
    title: "Arxiv",
    description: "全球规模和影响力最大的开放获取预印本平台",
    url: "https://arxiv.org",
    mark: logo("https://arxiv.org/favicon.ico", "light"),
  },
]

const ai: Site[] = [
  {
    id: "chatgpt",
    title: "ChatGPT",
    description: "OpenAI 对话入口",
    url: "https://chat.openai.com",
    mark: logo(asset("/brand/chatgpt.svg"), "light"),
  },
  {
    id: "gemini",
    title: "Gemini",
    description: "Google 对话模型",
    url: "https://gemini.google.com/",
    mark: logo(asset("/brand/gemini.svg"), "light"),
  },
  {
    id: "notebooklm",
    title: "NotebookLM",
    description: "资料库问答与摘要",
    url: "https://notebooklm.google/",
    mark: logo(asset("/brand/notebooklm.png"), "light"),
  },
  {
    id: "grok",
    title: "Grok",
    description: "xAI 对话模型",
    url: "https://grok.com",
    mark: logo(asset("/brand/grok.png"), "light"),
  },
]

const tools: Site[] = [
  {
    id: "tj-yiqizou",
    title: "TJ一起走",
    description: "校园拼车",
    url: "http://pinche.tj.hainuo.wang/",
    mark: logo(asset("/brand/yqz.png"), "light", "fill"),
  },
  {
    id: "zhuoyue-xing",
    title: "卓越星感想小助手",
    description: "AI 学习助手",
    url: "https://agent.tongji.edu.cn/product/llm/chat/cs68u58q76vmvhitgtrg",
    mark: glyph(MagicStar),
  },
  {
    id: "stirling",
    title: "Stirling PDF",
    description: "PDF 合并、转换与签名",
    url: "https://pdf.is/?lang=zh_CN",
    mark: logo(asset("/brand/stirling.png"), "light"),
  },
  {
    id: "photopea",
    title: "Photopea",
    description: "浏览器里的 Photoshop",
    url: "https://www.photopea.com",
    mark: brand(Photopea),
  },
  {
    id: "gamma",
    title: "Gamma",
    description: "AI 生成演示文稿",
    url: "https://gamma.app",
    mark: logo(asset("/brand/gamma.png"), "light"),
  },
  {
    id: "tongji-course",
    title: "通济选课",
    description: "课程筛选工具",
    url: "https://course.f1justin.com/",
    mark: glyph(GraduationCap),
  },
  {
    id: "paike",
    title: "同济排课助手",
    description: "模拟选课流程",
    url: "https://xk.xialing.icu/",
    mark: glyph(Calendar),
  },
  {
    id: "onetj",
    title: "一块钱第三方",
    description: "手机端轻量客户端",
    url: "https://flowerblackg.github.io/onetj-webapp",
    mark: glyph(Coin2),
  },
  {
    id: "tj-tools-tg",
    title: "同济资料收集",
    description: "Telegram 资料与工具",
    url: "https://t.me/Tongji_Tools",
    mark: logo(asset("/brand/tg.png"), "light"),
  },
  {
    id: "wloc",
    title: "wloc",
    description: "校园网定位工具",
    url: "https://github.com/Yu9191/wloc",
    mark: logo(asset("/brand/wloc.jpg"), "light", "fill"),
  },
  {
    id: "github",
    title: "GitHub",
    description: "代码托管",
    url: "https://github.com",
    mark: brand(Github),
  },
]

const software: Site[] = [
  {
    id: "autocad",
    title: "AutoCAD 教育版",
    description: "教育授权申请",
    url: "https://www.autodesk.com.cn/education/edu-software/overview?sorting=featured&filters=individual",
    mark: brand(Autodesk),
  },
  {
    id: "origin",
    title: "Origin 学生版",
    description: "学生授权申请",
    url: "https://www.originlab.com/OriginProLearning.aspx",
    mark: brand(Origin),
  },
]

export const sections: SiteSection[] = [
  { id: "official", label: "学校官网", sites: official },
  { id: "course", label: "课程常用", sites: course },
  { id: "academic", label: "学术资源", sites: academic },
  { id: "ai", label: "人工智能", sites: ai },
  { id: "tools", label: "实用工具", sites: tools },
  { id: "software", label: "正版申请", sites: software },
]

export const totalSites = sections.reduce((sum, section) => sum + section.sites.length, 0)
