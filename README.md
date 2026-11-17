<p align="center">
  <img src="./public/yourtj-logo.png" width="88" alt="YourTJ">
</p>
<p align="center">
  YourTJ 导航页，服务于同济同学的浏览器导航起始页。<br>
  <sub>A browser start page for Tongji students, maintained by YourTJ.</sub>
</p>

<p align="center">
  <a href="https://github.com/YourTongji/YourTJ-Nav/actions/workflows/deploy.yml"><img src="https://img.shields.io/github/actions/workflow/status/YourTongji/YourTJ-Nav/deploy.yml?style=flat-square&label=pages" alt="Pages"></a>
  <a href="https://github.com/YourTongji/YourTJ-Nav/actions/workflows/deploy-server.yml"><img src="https://img.shields.io/github/actions/workflow/status/YourTongji/YourTJ-Nav/deploy-server.yml?style=flat-square&label=server" alt="Server"></a>
  <a href="https://github.com/YourTongji/YourTJ-Nav/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/YourTongji/YourTJ-Nav/ci.yml?style=flat-square&label=CI" alt="CI"></a>
  <img src="https://img.shields.io/badge/license-GPL--3.0--only-blue?style=flat-square" alt="License">
</p>

<p align="center">
  <a href="https://n.yourtj.de">在线访问</a> ·
  <a href="./docs/README.md">项目文档</a> ·
  <a href="https://github.com/YourTongji/YourTJ-Nav/issues/new?template=add-site.yml">补充站点</a> ·
  <a href="https://github.com/YourTongji/YourTJ-Nav/issues/new?template=bug-report.yml">报告问题</a> ·
  <a href="./CONTRIBUTING.md">贡献指南</a>
</p>

## 关于

页面从上到下四层：时钟、搜索框、置顶、分类网格。右下角浮着三个按钮：反馈、换壁纸和设置。底部是最近访问和页脚。

站点数据在 `src/data/sites.ts`，加一行就多一个站点，图标、分类和排序跟着走。
用户改过的文件夹、排序、置顶和壁纸存在浏览器本地，刷新后还在。

字体、图标、动画和兜底壁纸都打包在仓库里，不走公共 CDN。唯一的额外请求是自建的访问统计脚本，
异步加载，失败不影响页面。壁纸接口挂掉时页面仍然可用，最坏情况显示本地渐变。

## 能力状态

| 领域 | 状态 | 说明 |
|---|---|---|
| 搜索 | `Current` | 四个引擎可切，地址自动识别，`/` 与 `⌘K` 聚焦，一键清空，宽度可调；候选列表覆盖站点、本地站点和搜索记录，支持拼音首字母 |
| 站点导航 | `Current` | 出厂分类开箱可用，支持分页、拖动排序、右键增删改 |
| 置顶 | `Current` | 搜索栏下一行，可增删拖动，也能把网格里的站点拖上来 |
| 最近访问 | `Current` | 卡片展示，可清空 |
| 外观 | `Current` | 深浅色（含跟随系统）、三种材质、搜索框宽度、一言与时钟开关 |
| 简洁模式 | `Current` | 只留导航，所有文件夹一屏铺开，桌面端不用翻页 |
| 时钟 | `Current` | 字形、字重、字号、不透明度、墨色、秒、12 小时制 |
| 壁纸 | `Current` | 风景（默认）、动漫、自定义三个来源，自定义支持历史画廊 |
| 站点自定义 | `Current` | 自建文件夹与站点；图标可从浏览器缓存、Google、favicon.is 里选或上传，透明图标自动加底色 |
| 多端适配 | `Current` | 窄到 320 像素无横向溢出；网格列数按实际宽度算，触屏划动翻页 |
| 离线降级 | `Current` | 壁纸缓存 6 小时，接口超时回落，本地渐变兜底 |
| 服务端能力 | `Planned` | 目前是纯静态页，站点数据随仓库发布 |

## 技术栈

| 范围 | 技术 |
|---|---|
| 框架 | React 19、TypeScript、Vite 7 |
| 样式 | Tailwind CSS v4、shadcn/ui（源码在仓库内）、OKLCH 设计令牌 |
| 组件 | Radix Primitives（菜单、对话框、滑杆、提示） |
| 图标 | Reicon（线性与填充两套）、Reicon Brands（品牌标） |
| 字体 | Geist Variable、霞鹜文楷、Instrument Serif |
| 存储 | localStorage 存偏好，IndexedDB 存自定义壁纸 |
| 交付 | GitHub Pages 静态托管，GitHub Actions 构建 |

## 快速开始

需要 Node.js 22 或更高版本。

```bash
git clone https://github.com/YourTongji/YourTJ-Nav.git
cd YourTJ-Nav
npm ci
npm run dev      # http://127.0.0.1:5173
```

构建与预览：

```bash
npm run build    # tsc -b && vite build，产物在 dist/
npm run preview
```

部署到子路径时用 `VITE_BASE` 指定前缀。GitHub Pages 的 project page 会自动传入：

```bash
VITE_BASE=/YourTJ-Nav/ npm run build
```

环境要求和其他命令见[本地开发](./docs/development/local-development.md)。

## 仓库结构

```text
src/
  components/        界面组件（搜索、网格、置顶、设置面板）
    ui/              shadcn/ui 源码，随仓库维护
    settings/        设置面板内的分块
  data/              出厂数据：站点、搜索引擎、壁纸源、材质
  hooks/             状态与持久化（壁纸、站点、置顶、偏好）
  lib/               存储层与工具
public/
  brand/             站点图标，全部本地
  fonts/             Geist、霞鹜文楷分片、Instrument Serif
  cat.webp           搜索栏上的猫（趴着）
  cat-typing.webp    敲键盘时的那只（第一次输入才加载）
docs/                产品、设计、架构、开发与部署文档
```

## 加一个站点

打开 `src/data/sites.ts`，在对应分类的数组里加一条：

```ts
{
  id: "new-site",              // 唯一，排序和置顶靠它引用
  title: "新系统",
  description: "一句话说明",
  url: "https://example.tongji.edu.cn",
  mark: logo(asset("/brand/example.png"), "light"),  // 也可以 glyph(Icon) 或 brand(Icon)
}
```

图标放在 `public/brand/`。三种图标形式怎么选，见[图标策略](./docs/design/icons.md)。

也可以不提 PR，直接开[补充站点](https://github.com/YourTongji/YourTJ-Nav/issues/new?template=add-site.yml)
Issue，机器人会按表单内容生成 PR，维护者批准后自动合入并部署。

## 文档

[`docs/README.md`](./docs/README.md) 是唯一文档入口，里面写明每类事实以哪份为准。

- [功能与交互](./docs/product/features.md)
- [设计系统](./docs/design/design-system.md)
- [图标策略](./docs/design/icons.md)
- [架构与数据流](./docs/architecture/overview.md)
- [本地开发](./docs/development/local-development.md)
- [验证与验收](./docs/development/testing.md)
- [部署与发布](./docs/operations/deployment.md)

## 参与贡献

问题反馈、功能建议和 Pull Request 都欢迎。改动较大时，先开 Issue 说清场景和验收标准。

开始编码前：

1. 读 [`CONTRIBUTING.md`](./CONTRIBUTING.md) 和相关文档；
2. 从最新 `main` 切出 `feat/*`、`fix/*` 或 `docs/*` 分支；
3. 保证 `npm run build` 通过，并在 PR 里写明实际跑过的验证。

## 许可

YourTJ 的代码和文档采用 GPL-3.0-only，见[许可证](./LICENSE)。

站点图标、品牌标和字体归各自权利方所有，这里只用于标识对应服务。字体授权见
[设计系统 · 字体](./docs/design/design-system.md#字体)。

## 致谢

- 感谢原`tongji.icu` 为同济相关地址收集做出的持久贡献！
- [lumno-extension](https://github.com/kubai087/lumno-extension) 是置顶栏、最近访问卡片和设置面板的交互参考，面板浮在页面上的做法也来自它。
  自定义站点的图标来源、异形图标底色和搜索候选列表也参考了它。
- 界面图标来自 [Reicon](https://github.com/Reicon/) 和 Reicon Brands。
- 组件与无障碍底座来自 [shadcn/ui](https://ui.shadcn.com/) 和 [Radix Primitives](https://www.radix-ui.com/)。
- 构建工具是 [Vite](https://vite.dev/)、[React](https://react.dev/) 和 [Tailwind CSS](https://tailwindcss.com/)。
- 字体：一言用[霞鹜文楷](https://github.com/lxgw/LxgwWenKai)，界面用 Geist，时钟用 Instrument Serif。
- 各站点的图标和品牌标归各自权利方所有，这里只用于标识对应服务。
