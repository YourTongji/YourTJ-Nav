# 项目文档

这里是文档入口。同一个事实可能散在代码、配置和文档三处，动手前先确认以哪份为准。

| 想知道 | 看哪里 |
|---|---|
| 页面有哪些功能，交互怎么设计 | [`product/features.md`](./product/features.md) |
| 颜色、间距、材质、动效的取值 | [`design/design-system.md`](./design/design-system.md) |
| 一个站点该用哪种图标 | [`design/icons.md`](./design/icons.md) |
| 代码怎么分层，数据存在哪 | [`architecture/overview.md`](./architecture/overview.md) |
| 本地怎么跑起来 | [`development/local-development.md`](./development/local-development.md) |
| 改完怎么验证 | [`development/testing.md`](./development/testing.md) |
| 怎么发布，域名和路径怎么配 | [`operations/deployment.md`](./operations/deployment.md) |

## 事实源

- 站点清单、分类和出厂顺序：`src/data/sites.ts`
- 设计令牌与所有玻璃面：`src/index.css`
- 存储键与读写校验：`src/lib/*-store.ts`
- 部署路径：`vite.config.ts` 的 `base`，以及 `.github/workflows/deploy.yml`

文档写的是约定，不逐行复述代码。两者冲突时以代码为准，然后提 PR 改文档。

## 目录

```text
docs/
  product/features.md          功能、交互与边界
  design/design-system.md      令牌、颜色、材质、动效、字体
  design/icons.md              图标形式与底板规则
  architecture/overview.md     分层、数据流、存储、构建
  development/local-development.md
  development/testing.md
  operations/deployment.md
```
