# 更新记录

本文件只记录**尚未发布的修改**和**最近一个版本**。更早的版本请查看本文件的 Git 历史（`git log -p -- docs/CHANGELOG.md`），或在 GitHub 上查看提交记录。0.11.0 之前的版本在建立仓库前完成，相关验证记录见 [docs/qa/](qa/)。

发布新版本时：把「未发布」改为新版本号和日期，删除上一个版本的内容，再新建一个空的「未发布」。

**导出的 HTML、OBS 包与 AE 模板都是快照，升级后需要用新版工作台重新导出，旧文件不会自动更新。**

## 未发布

### 文档
- 新增 AI 助手协作规范 `AGENTS.md`（Claude Code 通过 `CLAUDE.md` 读取同一份内容）。
- AI 助手的配置统一放在 `.agents/`，`.claude` 为指向它的符号链接。
- 新增中文协作指南 `.github/CONTRIBUTING.md`，以及 Issue、PR 模板。
- 文档按读者重新整理：使用说明移入 `docs/user/`（中文），开发文档以英文重写并移入 `docs/dev/`，历史验证记录归档到 `docs/qa/`，更新记录移入 `docs/CHANGELOG.md`，且只保留最近一个版本。
- AE 手动验证脚本移至 `frontend/tests/ae/`。

### 变更
- 项目目录调整：网页工作台移入 `frontend/`，Cloudflare 部署配置移入 `deploy/cloudflare/`。
- **构建产物不再提交到仓库**，仓库中不再有可直接打开的 `index.html`。本机使用需安装 Node.js：Windows 双击 `start.cmd` 会先构建再启动预览。
- 通过 `start.cmd` 预览时页面地址不变，浏览器中已保存的设置会保留；以前直接打开 `index.html` 文件时保存的设置不会带过来。

### 修复
- 统一换行符，避免 Windows 与 macOS 构建出不同的 `index.html`。

## 0.11.0 · 2026-10-20

### 新增
- OBS 输出可选「三层网页源」：画面、透明光效、边框分为三个源，由本机同步服务统一控制播放、暂停、重播、跳到展示或进入片尾。单独刷新某层后会自动追上其他层。原有的一体网页源保留。

### 修复
- 单独 HTML 完整自动播放：角色镜头 → 作者镜头 → 展示 → 已启用的片尾。
- 老电视关机覆盖整个画面，包括可编辑边框。

### 其他
- 发布 Kgg / Studio-K 启动预设（街区超频档案、上下边框、深底绯红、片头后处理）。
- 部署到 Cloudflare：https://nekokaii.com/showcase-generator
