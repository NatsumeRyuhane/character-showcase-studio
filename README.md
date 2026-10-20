# 角色展示设计工作台 · Character Showcase Studio

在浏览器中制作角色展示动画的设计工具，适用于模型发布、委托作品展示等场景。可以选择 13 套视觉方案，填写角色与品牌信息，调整配色、几何、动效、片头片尾和画面后处理，再导出为：

- **独立 HTML**：直接播放的纯画面网页；
- **OBS 输出包**：一体或三层（画面 / 光效 / 边框）浏览器源；
- **AE 可编辑模板**：在 After Effects 中生成可继续编辑的工程。

当前版本 0.11.0。线上地址：https://nekokaii.com/showcase-generator

## 立即使用

最简单的方式是直接访问线上地址，不需要安装任何软件。

在本机运行需要 [Node.js](https://nodejs.org/) 18 或更新版本：

- **Windows**：双击根目录的 `start.cmd`，保持弹出的窗口开启，然后在浏览器打开 `http://127.0.0.1:8768/`。
- **其他系统**：在 `frontend/` 中依次运行 `node tools/build.mjs` 与 `node tools/server.mjs`，然后打开同一地址。

建议使用较新的 Chrome 或 Edge。

> 上传的图片只在当前页面有效，刷新后需要重新选择；文字和参数会保存在浏览器中。

## 文档

| 文档 | 内容 |
| --- | --- |
| [docs/user/editor.md](docs/user/editor.md) | 工作台使用说明：界面、视觉方案、片头片尾、后处理、输出 |
| [docs/user/obs.md](docs/user/obs.md) | 导入 OBS：一体源与三层源 |
| [docs/user/ae-export.md](docs/user/ae-export.md) | AE 可编辑模板的使用方法与效果范围 |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | 版本更新记录 |
| [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) | 协作方式：如何提出需求、如何与 AI 助手一起修改项目 |
| [docs/dev/](docs/dev/) | 开发文档（英文）：架构、状态与时间轴、导出、构建与测试、部署 |
| [docs/qa/](docs/qa/) | 历史验证记录 |
| [frontend/THIRD-PARTY-NOTICES.md](frontend/THIRD-PARTY-NOTICES.md) | 第三方代码、字体与图形的来源和许可 |

## 参与开发

修改源码前请先阅读 [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md)。AI 助手（Codex、Claude Code 等）会自动读取 [AGENTS.md](AGENTS.md)。

开发只需要 Node.js 18 或更新版本，无需 `npm install`。在 `frontend/` 中运行：

```sh
node tools/build.mjs    # 构建，输出到 frontend/dist/
node tools/check.mjs    # 自动检查，需在构建后运行
node tools/server.mjs   # 本机预览
```

`frontend/dist/` 是构建产物，不提交到仓库，也不要手动修改。

## 目录结构

| 文件或目录 | 用途 |
| --- | --- |
| `frontend/` | 网页工作台：`src/` 源码、`runtime/` 运行时与导出、`assets/` 字体、`vendor/` 第三方库、`tests/` 检查脚本、`tools/` 构建与预览工具；构建结果在 `frontend/dist/` |
| `deploy/cloudflare/` | Cloudflare 部署配置 |
| `docs/` | 使用说明、开发文档、验证记录、更新记录 |
| `.github/` | 协作指南、Issue 与 PR 模板 |
| `AGENTS.md`、`.agents/` | AI 助手的协作规范与配置 |
| `start.cmd`、`build.cmd` | Windows 下双击启动预览 / 只构建 |

## 当前限制

- 这是设计预览、参数调节及导出工具。AE 工程由本机 After Effects 运行生成脚本后保存，复杂的网页质感不保证逐像素还原。
- 上传的素材尚未持久化，交接时需附带原始素材。
- 适配标识只是展示内容，选择它们不会替模型完成对应适配。
- 页面使用沙盒 iframe 与内容安全策略（CSP）运行。仓库不包含部署凭据、API 密钥或账号资料。
