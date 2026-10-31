# 本地运行与腾讯云托管

## 本地运行

正式版曾在 Node 24.18.0 本地构建；腾讯云构建日志使用 Node 22.21.1。运行环境需满足本项目 Next.js 版本的要求；依赖版本以 `package-lock.json` 为准。

```sh
npm ci
cp .env.example .env.local
```

在自己的 `.env.local` 填入 DeepSeek 密钥，然后运行：

```sh
npm run dev -- -p 3001
```

打开 [http://localhost:3001](http://localhost:3001)。新浏览器没有预置任务。点击一个示例只会填表，需要再点击提交。未配置模型密钥时会显示离线兜底标记，不能把它当作实时 AI 结果。

| 环境变量 | 默认或用途 |
|---|---|
| `DEEPSEEK_API_KEY` | 实时 AI 所需，只在服务端使用 |
| `DEEPSEEK_BASE_URL` | 默认 `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 默认 `deepseek-flash` |
| `DEEPSEEK_THINKING` | 默认 enabled，可设 disabled |
| `PUBMED_PROVIDER` | 默认 Europe PMC；显式设 ncbi 才使用 NCBI |
| `NCBI_API_KEY` | NCBI 的可选服务端配置，默认入口不需要 |

仓库只提供空白 `.env.example`。本地密钥文件、云账号凭据和 Git 历史没有上传。

## 检查

```sh
npx tsc --noEmit
npx eslint src
node --conditions=react-server scripts/check-pubmed.mjs
node --conditions=react-server scripts/check-pubmed.mjs --live
npm run build
```

前一个文献检查使用受控输入验证解析、来源过滤和限流。`--live` 会实际访问 Europe PMC，网络或上游服务失败时可能不通过。它不需要 DeepSeek 密钥。

先启动配置了密钥的本地服务，再验证完整证据分析：

```sh
node scripts/check-evidence-live.mjs http://localhost:3001
```

该检查实际调用模型和公开文献接口，检查实时标记、文献、GLORY-1 PMID 40421736 和 40 秒要求。测试问题是自拟验收输入，不是真实患者记录。

## EdgeOne Makers 部署

1. 在自己的腾讯云 EdgeOne Makers 项目配置生产环境变量 `DEEPSEEK_API_KEY`。
2. 使用本仓库 `edgeone.json` 的构建设置，上传源码 ZIP 或关联自己的 Git 仓库。
3. 等待平台完成依赖安装、Next.js 构建和函数发布。
4. 在自己的站点提交示例和独立问题，检查实时来源、检索式、PMID 与入口标记。

当前线上项目采用直接上传源码包的方式。创建本 GitHub 仓库没有自动关联或变更现有腾讯云部署。源码声明了香港函数地域；最终交付只验证了站点与接口可用性，没有独立测量实际函数地域。

## 数据保存

任务、知识和经验都保存在当前浏览器。它们不会自动同步给另一个浏览器或设备。部署代码不等于迁移浏览器数据。多人协作后端、登录和组织权限属于后续工程。

