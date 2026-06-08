# Windows 安装和使用中文 Wiki 修改版指南

日期：2026-06-07

本文针对文件：

```text
gitnexus-zh-wiki-modified-20260607.zip
```

该 zip 是一个源码包，不是已经发布到 npm 的预构建包。Windows 上使用时需要先安装依赖、构建 CLI，然后再运行 `gitnexus analyze` 和 `gitnexus wiki --lang zh-CN`。

## 1. 这个包包含什么

压缩包包含完整 GitNexus 仓库源码，并排除了以下本地环境产物：

- `.git`
- `node_modules`
- `dist`
- 构建缓存

因此 Windows 上第一次使用必须重新安装依赖并构建。

本次中文 wiki 相关改动已经包含在包内：

- `gitnexus/src/core/wiki/generator.ts`
- `gitnexus/src/core/wiki/prompts.ts`
- `gitnexus/src/core/wiki/html-viewer.ts`
- `gitnexus/src/cli/i18n/en.ts`
- `gitnexus/src/cli/i18n/zh-CN.ts`
- `gitnexus/test/unit/wiki-localization.test.ts`
- `gitnexus/test/unit/wiki-html-viewer.test.ts`
- `zh-wiki-change-summary.md`
- `zh-wiki-worklog-2026-06-07.md`

## 2. Windows 环境准备

建议环境：

- Windows 10 或 Windows 11
- PowerShell 7 或系统自带 Windows PowerShell
- Git for Windows
- Node.js 22 或更高版本
- npm 10.x 更稳；如果你使用 npm 11.x，遇到安装问题时建议降级到 npm 10

检查版本：

```powershell
node -v
npm -v
git --version
```

推荐：

```powershell
node -v
# v22.x 或更高
```

如果 npm 11.x 在安装 native 依赖时报错，可以降级 npm：

```powershell
npm install -g npm@10.9.0
```

## 3. 解压源码包

建议解压到路径较短、没有中文和空格的目录，例如：

```text
C:\dev\gitnexus-zh-wiki
```

解压后目录结构大致如下：

```text
C:\dev\gitnexus-zh-wiki\gitnexus\
  README.md
  gitnexus\
  gitnexus-shared\
  gitnexus-web\
  zh-wiki-change-summary.md
  zh-wiki-worklog-2026-06-07.md
```

下面命令假设你的仓库根目录是：

```powershell
cd C:\dev\gitnexus-zh-wiki\gitnexus
```

如果你的路径不同，请替换成实际路径。

## 4. 安装依赖和构建

### 4.1 可选：跳过可选语法解析器

如果你只是要生成常见 TypeScript、JavaScript、Python、Go、Java 等仓库的 wiki，可以先跳过 Dart、Proto、Swift 的可选 grammar 构建，减少 Windows native 编译问题。

PowerShell：

```powershell
$env:GITNEXUS_SKIP_OPTIONAL_GRAMMARS = "1"
```

注意：这会导致 Dart、Proto、Swift 文件不被完整解析。其他语言功能不受影响。

### 4.2 构建 `gitnexus-shared`

```powershell
cd C:\dev\gitnexus-zh-wiki\gitnexus\gitnexus-shared
npm install
npm run build
```

### 4.3 安装 Web 子项目依赖

主 CLI 构建脚本会尝试构建并打包 Web UI，所以先安装 `gitnexus-web` 依赖：

```powershell
cd C:\dev\gitnexus-zh-wiki\gitnexus\gitnexus-web
npm install
```

### 4.4 安装并构建 CLI 包

```powershell
cd C:\dev\gitnexus-zh-wiki\gitnexus\gitnexus
npm install
npm run build
```

构建成功后，CLI 入口位于：

```text
C:\dev\gitnexus-zh-wiki\gitnexus\gitnexus\dist\cli\index.js
```

## 5. 本地启用这个修改版 CLI

推荐使用 `npm link`，这样可以直接运行 `gitnexus` 命令：

```powershell
cd C:\dev\gitnexus-zh-wiki\gitnexus\gitnexus
npm link
```

检查是否生效：

```powershell
gitnexus --version
gitnexus wiki --help
```

如果你的机器上已经安装过官方版 `gitnexus`，`npm link` 会让当前源码构建版本优先作为全局命令。确认命令来源：

```powershell
where gitnexus
```

如果不想 link，也可以直接用 Node 运行：

```powershell
node C:\dev\gitnexus-zh-wiki\gitnexus\gitnexus\dist\cli\index.js --help
```

## 6. 配置 LLM API Key

wiki 生成需要 LLM。

以 OpenAI 兼容 API 为例：

```powershell
$env:OPENAI_API_KEY = "你的 API Key"
```

如果你使用自定义 OpenAI 兼容服务：

```powershell
gitnexus wiki C:\path\to\repo --provider custom --base-url https://your-api.example.com/v1 --model your-model --lang zh-CN --force
```

如果使用 OpenAI 官方模型：

```powershell
gitnexus wiki C:\path\to\repo --provider openai --model gpt-4o --lang zh-CN --force
```

具体 provider、model、base URL 根据你的实际 LLM 服务调整。

## 7. 生成中文 Wiki 的完整流程

假设目标代码仓库在：

```text
D:\work\my-project
```

### 7.1 先分析仓库

```powershell
gitnexus analyze D:\work\my-project
```

如果仓库很大，可以先跳过 embeddings，加快速度：

```powershell
gitnexus analyze D:\work\my-project --skip-embeddings
```

如果需要强制重建索引：

```powershell
gitnexus analyze D:\work\my-project --force
```

### 7.2 生成简体中文 wiki

推荐：

```powershell
gitnexus wiki D:\work\my-project --lang zh-CN --force
```

也支持：

```powershell
gitnexus wiki D:\work\my-project --lang 中文 --force
gitnexus wiki D:\work\my-project --lang chinese --force
```

`--force` 的作用：

- 从英文 wiki 切换到中文 wiki 时强制完整重新生成。
- 避免旧的 `meta.json`、`module_tree.json` 或页面缓存继续复用英文结果。

### 7.3 查看输出

wiki 通常生成在目标仓库的 GitNexus 存储目录下，命令结束时会打印输出路径。

常见位置：

```text
D:\work\my-project\.gitnexus\wiki\
```

重点文件：

```text
overview.md
module_tree.json
meta.json
index.html
```

可以直接用浏览器打开：

```text
D:\work\my-project\.gitnexus\wiki\index.html
```

注意：当前 HTML viewer 使用 CDN 加载 `marked` 和 `mermaid`，所以打开 `index.html` 时最好保持网络可用。Markdown 文件本身可以离线查看。

## 8. 中文 Wiki 行为说明

中文模式会翻译：

- 页面标题
- 模块显示名
- 文档正文
- 小节标题
- Mermaid 图表标签
- HTML viewer 基础 UI 文案

中文模式不会翻译：

- 函数名
- 类名
- 变量名
- 文件路径
- import path
- 包名
- CLI 命令
- 配置 key
- 公式
- 复杂度表达式，例如 `O(n log n)`
- Markdown 链接目标，例如 `auth.md`

示例：

```md
# 认证模块

该模块负责登录和会话管理，核心入口包括 `loginUser()` 和 `createSession()`。

相关源码位于 `src/auth/session.ts`。
```

页面显示名是中文，但文件名和链接目标仍保持稳定 ASCII：

```text
auth.md
```

这样做是为了保证 Windows 文件系统、浏览器 hash、GitHub/Gist 浏览和增量更新更稳定。

## 9. 常见问题

### 9.1 `gitnexus` 运行的不是这个修改版

检查：

```powershell
where gitnexus
```

重新 link：

```powershell
cd C:\dev\gitnexus-zh-wiki\gitnexus\gitnexus
npm link
```

或者直接用 Node 运行 dist 入口：

```powershell
node C:\dev\gitnexus-zh-wiki\gitnexus\gitnexus\dist\cli\index.js wiki D:\work\my-project --lang zh-CN --force
```

### 9.2 `lbugjs.node missing` 或 LadybugDB native 模块错误

通常是安装脚本没有执行，或者 native 依赖没有正确安装。

处理方式：

```powershell
cd C:\dev\gitnexus-zh-wiki\gitnexus\gitnexus
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
npm run build
```

不要使用：

```powershell
npm install --ignore-scripts
```

因为 GitNexus 依赖 native postinstall 产物。

### 9.3 npm 11.x 安装异常

如果遇到 npm/arborist 或 native install 异常，优先使用 npm 10：

```powershell
npm install -g npm@10.9.0
```

然后重新安装依赖。

### 9.4 tree-sitter 或 native build 失败

Windows 上 native 模块可能需要：

- Python 3
- Visual Studio Build Tools
- C++ build tools

如果只是可选 grammar 构建失败，可以设置：

```powershell
$env:GITNEXUS_SKIP_OPTIONAL_GRAMMARS = "1"
```

然后重新安装：

```powershell
npm install
```

### 9.5 从英文 wiki 切换到中文 wiki 报语言不一致

使用：

```powershell
gitnexus wiki D:\work\my-project --lang zh-CN --force
```

`--force` 会删除旧页面并重新生成。

### 9.6 中文标题正常，但函数名被翻译了

本修改版已经在 system prompt 中要求保留函数名、路径、命令和公式。极少数 LLM 仍可能违反要求。

建议：

- 使用更稳定的模型。
- 重新运行 `--force`。
- 检查生成结果中是否只是说明性文字被翻译，真实代码标识符应保持原样。

### 9.7 路径有空格时报错

PowerShell 中给路径加引号：

```powershell
gitnexus wiki "D:\work\my project" --lang zh-CN --force
```

## 10. 推荐命令速查

从源码包构建：

```powershell
cd C:\dev\gitnexus-zh-wiki\gitnexus\gitnexus-shared
npm install
npm run build

cd C:\dev\gitnexus-zh-wiki\gitnexus\gitnexus-web
npm install

cd C:\dev\gitnexus-zh-wiki\gitnexus\gitnexus
npm install
npm run build
npm link
```

分析仓库：

```powershell
gitnexus analyze D:\work\my-project --skip-embeddings
```

生成中文 wiki：

```powershell
gitnexus wiki D:\work\my-project --lang zh-CN --force
```

打开结果：

```text
D:\work\my-project\.gitnexus\wiki\index.html
```

## 11. 使用时的关键注意事项

- 不传 `--lang` 时默认行为仍是原来的英文 wiki。
- 中文 wiki 需要显式传 `--lang zh-CN`、`--lang 中文` 或 `--lang chinese`。
- 从英文切换到中文时建议加 `--force`。
- 页面显示名是中文，但 `.md` 文件名和链接目标默认保持 ASCII。
- 源码里的函数名、路径、命令、公式应保持原样。
- Windows 上不要用 `--ignore-scripts` 安装 GitNexus 依赖。
- 如果 native 依赖安装失败，优先确认 Node/npm 版本和 Visual Studio Build Tools。
- 如果只是想减少安装风险，可以设置 `GITNEXUS_SKIP_OPTIONAL_GRAMMARS=1`，但会跳过 Dart/Proto/Swift 的解析支持。
