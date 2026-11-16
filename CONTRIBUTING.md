# 贡献指南

这个页面靠大家一起维护。补一个站点或者报一个显示问题，就已经很有用，不需要会写代码。

## 加一个站点

不用改代码。打开[补充站点](https://github.com/YourTongji/YourTJ-Nav/issues/new?template=add-site.yml)，
填名称、地址、分类和一句话说明，提交就行。后面全自动：

```text
Issue（自动打 site-request 标签）
  → 机器人改 src/data/sites.ts，开一个只动这一个文件的 PR
  → 维护者 Approve
  → 自动 squash 合入
  → GitHub Pages 重新部署
  → 回到 Issue 留言说已生效
```

地址已经在清单里时，机器人会跳过并在日志里写明，不会重复添加。想改内容直接编辑 Issue，
PR 会跟着更新，不会开出第二个。

## 改代码

### 环境

需要 Node.js 22 或更高版本，没有其他系统依赖。

```bash
git clone https://github.com/YourTongji/YourTJ-Nav.git
cd YourTJ-Nav
npm ci
npm run dev     # http://127.0.0.1:5173
```

### 分支与提交

从最新 `main` 切出 `feat/*`、`fix/*` 或 `docs/*`。提交信息用 `type(scope): 说明`，
例如 `fix(pins): 置顶在窄屏保持一行`。一个 PR 只做一件事，顺手看到的小问题另开一个。

### 提交前

```bash
npm run build     # 类型检查加构建，必须通过
```

视觉或交互改动再补一句实测结论，例如“深色主题配亮壁纸时，站点标题对比度 14.1:1”。
测量方法写在[验证与验收](./docs/development/testing.md)，都可以复现。

### 改动落在哪

| 想改 | 去 |
|---|---|
| 站点清单、分类 | `src/data/sites.ts` |
| 搜索引擎 | `src/data/engines.ts` |
| 壁纸来源 | `src/data/wallpapers.ts` |
| 颜色、材质、字体、动效 | `src/index.css` |
| 存储键与校验 | `src/lib/*-store.ts` |
| 界面 | `src/components/` |

设计约定见[设计系统](./docs/design/design-system.md)。加图标前先看
[图标策略](./docs/design/icons.md)，那里记了三种图标形式的取舍和几个踩过的坑。

## 报告问题

用[问题反馈](https://github.com/YourTongji/YourTJ-Nav/issues/new?template=bug-report.yml)，
写清环境、现象和复现步骤即可，不用先分析原因。截图请脱敏。

## 讨论方式

- review 里指出的是代码，不是人。
- 不确定就先开 Issue 问，别闷头做一大坨。
- 用到第三方素材（图标、字体）请注明来源和授权。
