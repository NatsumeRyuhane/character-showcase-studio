# 角色展示设计工作台 · Character Showcase Studio

在浏览器中制作角色展示动画的设计工具，适用于模型发布、委托作品展示等场景。可以选择 13 套视觉方案，填写角色与品牌信息，调整配色、几何、动效、片头片尾和画面后处理，再导出为：

- **独立 HTML**：直接播放的纯画面网页；
- **OBS 输出包**：一体或三层（画面 / 光效 / 边框）浏览器源；
- **AE 可编辑模板**：在 After Effects 中生成可继续编辑的工程。

当前版本 0.11.0。线上地址：https://nekokaii.com/showcase-generator

## 立即使用

**直接打开根目录的 `index.html`** 即可，不需要安装依赖或登录账号。建议使用较新的 Chrome 或 Edge。

如果浏览器限制直接打开本地文件：

1. 双击 Windows 下的 `start.cmd`，并保持弹出的终端窗口开启；
2. 在浏览器打开 `http://127.0.0.1:8768/`。

`start.cmd` 优先使用 Node.js 18 或更新版本，找不到时使用 Python 3。端口被占用时，可运行 `node tools/server.mjs 8769` 后访问对应端口。

> 上传的图片只在当前页面有效，刷新后需要重新选择；文字和参数会保存在浏览器中。

## 文档

| 文档 | 内容 |
| --- | --- |
| [docs/user/editor.md](docs/user/editor.md) | 工作台使用说明：界面、视觉方案、片头片尾、后处理、输出 |
| [docs/user/obs.md](docs/user/obs.md) | 导入 OBS：一体源与三层源 |
| [docs/user/ae-export.md](docs/user/ae-export.md) | AE 可编辑模板的使用方法与效果范围 |
| [CHANGELOG.md](CHANGELOG.md) | 版本更新记录 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 协作方式：如何提出需求、如何与 AI 助手一起修改项目 |
| [docs/dev/](docs/dev/) | 开发文档（英文）：架构、状态与时间轴、导出、构建与测试、部署 |
| [docs/qa/](docs/qa/) | 历史验证记录 |
| [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) | 第三方代码、字体与图形的来源和许可 |

## 参与开发

修改源码前请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。AI 助手（Codex、Claude Code 等）会自动读取 [AGENTS.md](AGENTS.md)。

开发只需要 Node.js 18 或更新版本，无需 `npm install`：

```sh
node tools/build.mjs    # 从 src/ 等目录重新生成 index.html 与 dist/
node tools/check.mjs    # 自动检查，需在构建后运行
node tools/server.mjs   # 本机预览
```

**不要直接修改 `index.html` 或 `dist/`**，它们由构建生成，下一次构建会覆盖。

## 目录结构

| 文件或目录 | 用途 |
| --- | --- |
| `index.html` | 构建好的完整页面，可直接打开 |
| `src/` | 设计排版、编辑器、动效、导出等源码 |
| `runtime/` | 页面外壳、沙盒运行时、导出打包、AE 导入模板、OBS 同步服务 |
| `assets/fonts/` | 内置字体及其许可 |
| `vendor/` | 第三方库、许可及来源清单 |
| `tools/` | 构建、检查、本机预览、Cloudflare 部署脚本 |
| `tests/` | 自动检查脚本；`tests/ae/` 为需在 AE 中手动运行的验证脚本 |
| `dist/` | 构建结果 |
| `docs/` | 文档 |

## 当前限制

- 这是设计预览、参数调节及导出工具。AE 工程由本机 After Effects 运行生成脚本后保存，复杂的网页质感不保证逐像素还原。
- 上传的素材尚未持久化，交接时需附带原始素材。
- 适配标识只是展示内容，选择它们不会替模型完成对应适配。
- 页面使用沙盒 iframe 与内容安全策略（CSP）运行。仓库不包含部署凭据、API 密钥或账号资料。
