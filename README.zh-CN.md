# GitNexus 中文版

> 本仓库面向中文 Wiki 生成能力进行迭代。英文原版说明见 [README.md](README.md)。

**重要提醒：** GitNexus 没有任何官方加密货币、token 或 coin。任何使用 GitNexus 名称的币种都与本项目及维护者无关。

GitNexus 会把代码库索引成知识图谱，记录依赖关系、调用链、模块聚类和执行流程，然后通过 CLI、MCP 和 Web UI 暴露给 AI 编程工具使用。它的目标是让 Cursor、Claude Code、Codex、Windsurf、OpenCode 等工具在修改代码前能理解真实的代码结构。

## 核心能力

- 本地分析代码库，生成持久化知识图谱。
- 通过 MCP 给 AI Agent 提供代码结构、影响范围和上下文查询能力。
- 支持 CLI 直接查询符号、调用链、影响范围和执行流程。
- 生成基于知识图谱的代码 Wiki。
- 支持生成简体中文 Wiki，包括页面标题、模块显示名、正文、小节标题、Mermaid 标签和 HTML viewer 基础文案。

## 快速开始

在目标代码仓库根目录运行：

```bash
npx gitnexus analyze
```

该命令会索引当前仓库，并生成 AI Agent 可使用的上下文文件。

如果使用 npm 11 遇到 `npx` 安装异常，可以使用 pnpm：

```bash
pnpm --allow-build=@ladybugdb/core --allow-build=gitnexus --allow-build=tree-sitter dlx gitnexus@latest analyze
```

## 常用命令

```bash
gitnexus setup                   # 为编辑器配置 MCP
gitnexus analyze [path]          # 分析并索引代码库
gitnexus analyze --force         # 强制重建索引
gitnexus list                    # 查看已索引仓库
gitnexus status                  # 查看当前仓库索引状态
gitnexus query "<concept>"       # 查询代码概念
gitnexus context <symbol>        # 查看符号上下文
gitnexus impact <symbol>         # 分析修改影响范围
gitnexus wiki                    # 生成代码 Wiki
```

## 生成中文 Wiki

生成简体中文 Wiki：

```bash
gitnexus wiki --lang zh-CN --force
```

也可以使用这些别名：

```bash
gitnexus wiki --lang 中文 --force
gitnexus wiki --lang chinese --force
gitnexus wiki --lang zh --force
gitnexus wiki --lang 简体中文 --force
```

中文 Wiki 会本地化可见文档内容：

- 模块显示名
- 页面标题和 H1
- 正文和小节标题
- Mermaid 图表标签
- HTML viewer 中的基础 UI 文案

源码相关内容会保持原样：

- 函数名、类名、变量名和真实 API 名称
- 文件路径、import path、包名
- CLI 命令、配置 key
- 公式、复杂度表达式和数学符号
- Markdown 链接目标和页面 slug

页面文件名和链接 slug 默认保持 ASCII，便于跨平台路径、增量更新、GitHub/Gist 浏览和 HTML hash 链接稳定。

## MCP 配置

自动配置：

```bash
npx gitnexus setup
```

手动为 Claude Code 配置：

```bash
claude mcp add gitnexus -- npx -y gitnexus@latest mcp
```

手动为 Codex 配置：

```bash
codex mcp add gitnexus -- npx -y gitnexus@latest mcp
```

## Web UI

GitNexus 也提供 Web UI，用于可视化浏览图谱和进行仓库问答：

```bash
gitnexus serve
```

启动后可以让浏览器端连接本地服务，复用 CLI 已经索引过的仓库。

## 当前仓库说明

当前仓库的 `origin` 指向：

```text
https://github.com/hanjiangker/GitNexus_CNWiki.git
```

后续中文 Wiki 相关功能、文档和验证流程都可以在这个仓库中继续迭代。英文上游项目保留为 `upstream`，用于同步原项目更新。

## 许可证

本项目沿用原 GitNexus 的许可证。详情见 [LICENSE](LICENSE)。
