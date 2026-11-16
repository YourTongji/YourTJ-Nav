# 部署与发布

目前只有一个目标：GitHub Pages。产物是纯静态文件，换成对象存储或 CDN 时只要 `VITE_BASE` 对得上，
代码不用改。

## GitHub Pages

### 一次性配置

1. 打开仓库的 Settings，进 Pages，把 Build and deployment 的 Source 选成 GitHub Actions。
2. 推送到 `main`，`.github/workflows/deploy.yml` 会自动构建并发布。
3. 首次发布后，地址是 `https://<org>.github.io/<repo>/`。

### 工作流做了什么

```text
checkout → setup-node(22, npm cache) → npm ci
        → configure-pages，拿到 base_path
        → npm run build，VITE_BASE=<base_path>/
        → upload-pages-artifact(dist)
        → deploy-pages
```

`configure-pages` 给出当前站点的路径前缀。project page 是 `/YourTJ-Nav`，
user 或 org page 以及自定义域名是空。工作流把它拼成 `VITE_BASE`，
所以同一个构建在子路径和根路径都能跑。

### 路径规则

- `vite.config.ts` 的 `base` 读 `VITE_BASE`，默认 `/`。
- 代码里引用 `public/` 资源必须走 base：
  - `src/data/*` 用 `asset("/brand/x.png")`
  - 组件里用 `` `${import.meta.env.BASE_URL}cat.webp` ``
  - `index.html` 里用相对路径 `./yourtj-logo.png`
- 写死 `"/brand/x.png"`，在 project page 上一定 404。

## 自动补充站点

站点数据是纯文本，所以加一个站点可以全自动：

```text
Issue（模板 add-site.yml，自动打 site-request 标签）
  ↓ site-request.yml
scripts/add-site.mjs 解析表单，在 src/data/sites.ts 对应分类追加一条，再跑 tsc 校验
  ↓ peter-evans/create-pull-request
分支 site/issue-<n>，只改动 src/data/sites.ts
  ↓ 维护者 Approve
auto-merge.yml 执行 gh pr merge --squash --delete-branch
  ↓
deploy.yml 重新构建并发布
  ↓
回到原 Issue 留言告知已生效
```

几个设计决定：

- 机器人只能改一个文件。工作流里写了 `add-paths: src/data/sites.ts`，碰不到别的地方。
- 幂等。`scripts/add-site.mjs` 先扫一遍现有地址，已经存在就跳过。编辑 Issue 会更新同一个分支，
  不会开出第二个 PR。
- 人工 PR 不受影响。`auto-merge.yml` 只处理带 `site-request` 标签、并且 head 在本仓库的 PR。
- 图标。表单留空时自动取 `https://<域名>/favicon.ico`。要自托管图标仍然走人工 PR，
  把文件放进 `public/brand/`，再用 `asset()` 引用。

要重跑某条 Issue，在 Actions 里选 Site request → PR 再 Run workflow，或者改一下 Issue 的标签。

## 自定义域名

1. 在 Settings 的 Pages 里填 Custom domain，GitHub 会生成并提交 `CNAME`。
2. DNS 加一条 `CNAME`，指向 `<org>.github.io`。
3. 勾上 Enforce HTTPS。

换成自定义域名后，`base_path` 变成空，工作流会自动以 `/` 构建，不用改代码。

## 换成别的托管

产物是 `dist/`，任何静态托管都能接。

| 目标 | 做法 |
|---|---|
| 对象存储加 CDN | `VITE_BASE=/ npm run build`，把 `dist/` 同步上去 |
| 自建 Nginx | 同上，`try_files` 指向 `index.html` |
| 子路径托管 | `VITE_BASE=/some/path/ npm run build` |

要跟着变的只有 `VITE_BASE` 和 DNS，工作流本身可以留着或替换。

## 缓存

`assets/*` 带内容哈希，可以缓存一年。

`index.html`、`cat.webp`、`brand/*`、`fonts/*` 不带哈希，不要设长缓存，否则改版后用户拿到旧的。
用 CDN 时给这几类单独配短 TTL，或者 `no-cache`。

## 回滚

Pages 每次发布对应一次 workflow run。在 Actions 里重新 run 上一个成功的部署即可。
