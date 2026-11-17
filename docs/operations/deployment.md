# 部署与发布

两个目标并行：GitHub Pages 和自建服务器。推送 `main` 时两条工作流各自构建、各自发布，互不依赖。
正式入口 `n.yourtj.de` 由自建服务器承载（经 Cloudflare 代理），Pages 的 github.io 地址保留可用，
作为备用路径。产物是纯静态文件，换成对象存储或 CDN 时只要 `VITE_BASE` 对得上，代码不用改。

## GitHub Pages

### 一次性配置

1. 打开仓库的 Settings，进 Pages，把 Build and deployment 的 Source 选成 GitHub Actions。
2. 推送到 `main`，`.github/workflows/deploy.yml` 会自动构建并发布。
3. 首次发布后，地址是 `https://<org>.github.io/<repo>/`。配上自定义域名后，`n.yourtj.de` 是正式入口，
   github.io 那个地址仍然可用。

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

## 自建服务器

`.github/workflows/deploy-server.yml` 把同一份代码以 `VITE_BASE=/` 构建后发布到自建服务器。
与 Pages 部署并行，互不影响；构建失败不会走到上传和切换。

### 一次性配置

Settings → Secrets and variables → Actions：

| 名称 | 类型 | 内容 |
|---|---|---|
| `DEPLOY_HOST` | Secret | 服务器公网 IPv4 |
| `DEPLOY_SSH_KEY` | Secret | 专用部署私钥（ed25519，登录无 sudo 的 `yourtj-nav` 用户） |
| `DEPLOY_KNOWN_HOSTS` | Secret | 服务器主机公钥行：`<主机> ssh-ed25519 AAAA…`。前半截必须和 `DEPLOY_HOST` 完全一致（是 IP 就写 IP，不是域名），否则 ssh 匹配不上；公钥取自 `/etc/ssh/ssh_host_ed25519_key.pub`。固定指纹，不做 keyscan |
| `SERVER_DEPLOY_ENABLED` | Variable | `true` 时启用；未设置时工作流跳过而非失败 |

服务器侧前提：`yourtj-nav` 用户可密钥登录，`/var/www/yourtj-nav/` 归其所有，
nginx root 指向 `current` 符号链接（`disable_symlinks off`）。

### 目录结构与切换

```text
/var/www/yourtj-nav/
  <sha12>/     每个 commit 一个版本目录
  current →    指向在用版本的符号链接
```

新版本先解压到 `.staging-<sha12>/`，校验 `index.html` 存在后才落到版本目录，
所以包损坏或解压失败碰不到任何在用的版本。随后用 `mv -T` 原子替换 `current`，
再经 443 全链路探活（严格 200），失败自动切回上一版并以非零码退出。

同一个 commit 重复触发时会直接跳过，不会删掉正在服务的目录。
保留最近 3 个版本目录（当前版 + 2 个旧版），只清理提交哈希命名的目录；
目录的 mtime 在切换时会被盖成部署时间，清理顺序才稳定。

### 回滚

把 `current` 指回上一个版本目录即可：

```bash
ln -sfn /var/www/yourtj-nav/<旧sha12> /var/www/yourtj-nav/current.new
mv -T /var/www/yourtj-nav/current.new /var/www/yourtj-nav/current
```

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
- 分支永远从最新 `main` 重建。工作流先 `checkout ref: main`，再往工作区写这一条站点，
  所以分支内容是「main + 一个站点」，不会随着别人的合入越拖越远。

### 冲突自愈

站点 PR 都改 `src/data/sites.ts` 的同一个数组，`main` 一有新的站点合入，还开着的 PR
就会被标成 `CONFLICTING`。`site-refresh.yml` 在每次 `main` 更新后，把带 `site-request`
标签且仍开着的 PR 对应的 Issue 重新跑一遍 `site-request.yml`：分支按最新 `main` 重建、
强推上去，PR 跟着更新，冲突消失。

派发用的是 `workflow_dispatch`。`GITHUB_TOKEN` 触发的事件不会再启动工作流，但
`workflow_dispatch` 和 `repository_dispatch` 是例外。

要重跑某条 Issue，在 Actions 里选 Site request → PR 再 Run workflow 并填 Issue 编号，
或者改一下 Issue 的标签。

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
