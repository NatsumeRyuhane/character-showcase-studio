# Cloudflare 发布

正式地址：https://nekokaii.com/showcase-generator

源码仓库：https://github.com/nekokaii/character-showcase-studio

此项目使用独立 Worker `character-showcase-studio`，只接管上述路径及其子路径。
现有首页、DNS 和 `/studio*` 项目均保留。实际页面及所有运行资源内嵌于单个 HTML；
原有沙盒 iframe 和 CSP 由构建脚本保留。

## 手动更新

在本项目文件夹中，安装 Node.js 18 或更新版本，执行：

```sh
npx wrangler login
npx wrangler deploy
```

部署命令自动重新构建网页，只上传 `dist-cloudflare/index.html`。
GitHub 推送与 Cloudflare 部署是两个独立步骤；当前没有配置自动部署。
交接给其他开发者时，对方需要有对应 Cloudflare 账户的部署权限。
不要把登录令牌或本机 Wrangler 配置提交到仓库。
