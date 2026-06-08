# GitNexus 完全中文 Wiki 生成方案（方案 B + C）

> 目的：实现 wiki 全中文生成——包括页面标题、模块名、文档正文、Mermaid 图表标签。
> 状态：方案文档，尚未实施。

---

## 一、现状分析

### 已有功能

GitNexus 已内置 `--lang` 参数：

```bash
gitnexus wiki --lang chinese
```

但存在以下限制，导致无法完全中文输出：

### 限制 1：页面标题（H1）固定为英文

`generator.ts` 中，页面标题在生成时硬编码为 `node.name`，不经过 LLM：

```typescript
// generator.ts 第 876 行附近
const pageContent = sanitizeMermaidMarkdown(`# ${node.name}

${response.content}`);
```

即使 LLM 返回的正文用了中文，H1 标题仍是英文模块名。

### 限制 2：模块名分组不使用语言指令

`generator.ts` 第 493-495 行明确禁止在分组阶段使用 `buildSystemPrompt`：

```typescript
// Grouping is a structured-data phase (JSON output), not documentation.
// Do NOT apply buildSystemPrompt here — a language instruction would risk
// translating module-name keys, breaking slug stability and JSON parsing.
```

因此分组阶段返回的模块名始终是英文（LLM 的默认行为）。

### 限制 3：slugify 不支持中文

`generator.ts` 第 1363-1368 行：

```typescript
private slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')    // 非英文字符全部被替换为 -
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
}
```

中文模块名将变成 `----` 被丢弃。

---

## 二、改动方案

### 步骤 1：修改 prompts.ts —— 所有 prompt 改为中文指令

**文件：** `gitnexus/src/core/wiki/prompts.ts`

将以下 4 个 SYSTEM prompt 从英文改为中文：

| 常量名 | 原内容关键词 | 修改后内容关键词 |
|--------|-------------|----------------|
| `GROUPING_SYSTEM_PROMPT` | "You are a documentation architect..." | "你是一位文档架构师。将源文件列表按功能模块分组..." |
| `MODULE_SYSTEM_PROMPT` | "You are a technical documentation writer..." | "你是一位技术文档撰写专家。为代码模块编写清晰的中文文档..." |
| `PARENT_SYSTEM_PROMPT` | "You are a technical documentation writer..." | "你是一位技术文档撰写专家。为包含子模块的父模块编写中文综述页..." |
| `OVERVIEW_SYSTEM_PROMPT` | "You are a technical documentation writer..." | "你是一位技术文档撰写专家。为仓库 wiki 编写顶层中文概述页..." |

**注意：** 所有 prompt 末尾需统一追加一句：

```
IMPORTANT: 输出语言必须为中文。包括正文、代码注释示例、图表标签、页面标题（H1）。
```

### 步骤 2：修改 generator.ts `effectiveLang()` —— 正则支持中文

**文件：** `gitnexus/src/core/wiki/generator.ts`

```typescript
// 修改前（第 195-201 行）：
private effectiveLang(): string {
    const lang = (this.options.lang ?? '')
        .replace(/[\x00-\x1F\x7F]/g, '')
        .trim()
        .slice(0, 50);
    return /^[a-zA-Z -]+$/.test(lang) ? lang : '';
}

// 修改后：
private effectiveLang(): string {
    const lang = (this.options.lang ?? '')
        .replace(/[\x00-\x1F\x7F]/g, '')
        .trim()
        .slice(0, 50);
    return /^[a-zA-Z\u4e00-\u9fa5 -]+$/.test(lang) ? lang : '';
}
```

正则从 `/^[a-zA-Z -]+$/` 改为 `/^[a-zA-Z\u4e00-\u9fa5 -]+$/`，允许中文输入。

### 步骤 3：修改 generator.ts `buildSystemPrompt()` —— 去掉"标题保持英文"限制

**文件：** `gitnexus/src/core/wiki/generator.ts`

```typescript
// 修改前（第 206-209 行）：
private buildSystemPrompt(base: string): string {
    const lang = this.effectiveLang();
    if (!lang) return base;
    return `${base}\n\nIMPORTANT: Write ALL documentation content in ${lang}. This includes prose, code comments in examples, and diagram labels. Note: page titles (H1 headings) are generated separately and will remain in English.`;
}

// 修改后：
private buildSystemPrompt(base: string): string {
    const lang = this.effectiveLang();
    if (!lang) return base;
    return `${base}\n\nIMPORTANT: Write ALL documentation content in ${lang}, including page titles and diagram labels.`;
}
```

### 步骤 4：修改 generator.ts `buildModuleTree()` —— 分组阶段也传递语言指令

**文件：** `gitnexus/src/core/wiki/generator.ts`

在 `buildModuleTree()` 方法中，将原来的：

```typescript
const response = await this.invokeLLM(
    prompt,
    GROUPING_SYSTEM_PROMPT,
    this.streamOpts('Grouping files', 15, 13),
);
```

改为使用带语言指令的 system prompt：

```typescript
const response = await this.invokeLLM(
    prompt,
    this.buildSystemPrompt(GROUPING_SYSTEM_PROMPT),
    this.streamOpts('Grouping files', 15, 13),
);
```

如果有批量分组逻辑 `batchedGrouping()`，也做同样的修改。

### 步骤 5：修改页面标题生成逻辑 —— H1 使用 LLM 输出

**文件：** `gitnexus/src/core/wiki/generator.ts`

在以下三个方法中，将硬编码的 H1 标题改为从 LLM 响应中提取：

#### 5a. `generateLeafPage()`（约第 876 行）

```typescript
// 修改前：
const pageContent = sanitizeMermaidMarkdown(`# ${node.name}\n\n${response.content}`);

// 修改后：
const cleaned = sanitizeMermaidMarkdown(response.content.trim());
const existingH1 = cleaned.match(/^#\s+(.+)$/m);
const title = existingH1 ? existingH1[1].trim() : node.name;
const pageContent = `# ${title}\n\n${cleaned.replace(/^#\s+.+\n\n?/, '')}`;
```

#### 5b. `generateParentPage()`（约第 920 行）

```typescript
// 修改前：
const pageContent = sanitizeMermaidMarkdown(`# ${node.name}\n\n${response.content}`);

// 修改后：同上逻辑
```

#### 5c. `generateOverview()`（约第 970 行）

```typescript
// 修改前：
const pageContent = sanitizeMermaidMarkdown(
    `# ${path.basename(this.repoPath)} — Wiki\n\n${response.content}`,
);

// 修改后：
const cleaned = sanitizeMermaidMarkdown(response.content.trim());
const existingH1 = cleaned.match(/^#\s+(.+)$/m);
const title = existingH1 ? existingH1[1].trim() : path.basename(this.repoPath);
const pageContent = `# ${title}\n\n${cleaned.replace(/^#\s+.+\n\n?/, '')}`;
```

### 步骤 6：修改 generator.ts `slugify()` —— 支持中文

**文件：** `gitnexus/src/core/wiki/generator.ts`

```typescript
// 修改前（第 1363-1368 行）：
private slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
}

// 修改后：
private slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5\u3000-\u9fff_\-]/g, '')
        .replace(/^-+|-+$/g, '')
        .slice(0, 100);
}
```

允许中文字符进入文件名。slug 长度上限从 60 提升到 100（中文字符通常更长）。

### 步骤 7：（可选）修改 CLI help 中的 `--lang` 提示

**文件：** `gitnexus/src/cli/i18n/zh-CN.ts`

更新中文 help 文本，将 `"chinese"` 改为 `"中文"` 以保持一致。

**文件：** `gitnexus/src/cli/i18n/en.ts` 同步更新。

---

## 三、完整改动清单

| # | 文件 | 方法/位置 | 改动内容 | 风险等级 |
|---|------|----------|---------|---------|
| 1 | `src/core/wiki/prompts.ts` | 4 个常量 | SYSTEM prompt 改为中文指令，追加语言要求 | 低 |
| 2 | `src/core/wiki/generator.ts` | `effectiveLang()` | 正则允许中文字符 | 低 |
| 3 | `src/core/wiki/generator.ts` | `buildSystemPrompt()` | 去掉"标题保持英文"说明 | 低 |
| 4 | `src/core/wiki/generator.ts` | `buildModuleTree()` + `batchedGrouping()` | 分组阶段调用 `buildSystemPrompt()` | 中 |
| 5 | `src/core/wiki/generator.ts` | `generateLeafPage()` | H1 从 LLM 响应提取 | 低 |
| 6 | `src/core/wiki/generator.ts` | `generateParentPage()` | H1 从 LLM 响应提取 | 低 |
| 7 | `src/core/wiki/generator.ts` | `generateOverview()` | H1 从 LLM 响应提取 | 低 |
| 8 | `src/core/wiki/generator.ts` | `slugify()` | 允许中文字符入文件名 | 低 |
| 9 | `src/cli/i18n/zh-CN.ts` | help 文本 | 更新语言示例 | 无 |

---

## 四、验证方式

修改完成后，运行以下命令验证：

```bash
cd gitnexus

# 1. 构建
npm run build

# 2. 对任意 git 仓库生成中文 wiki
cd /path/to/some/repo
npx gitnexus analyze          # 如果尚未分析
npx gitnexus wiki --lang chinese --force

# 3. 检查输出
#   - wiki/*.md 文件应全中文
#   - 页面 H1 标题应为中文
#   - 模块分组名应为中文
#   - index.html 可正常浏览
```

### 关键检查点

| 检查点 | 预期结果 |
|--------|---------|
| H1 标题 | 中文，如 `# 认证模块` 而非 `# Authentication` |
| 文件名 slug | 中文，如 `认证模块` 而非 `authentication` |
| 模块分组名 | 中文，如 `认证模块` 而非 `Authentication` |
| 文档正文 | 全中文，包括代码注释示例和图表标签 |
| `meta.json` | `lang` 字段为 `"chinese"` |
| 增量更新 | 再次运行不报错（语言一致检查通过） |

---

## 五、已知注意事项

1. **文件名兼容性** — 使用 UTF-8 中文文件名在某些文件系统或 Windows 下可能有问题。如果遇到问题，可回退到拼音方案。
2. **分组稳定性** — 让 LLM 生成中文模块名时，如果多次运行可能命名不一致。建议在 prompt 中加入稳定性要求（如"模块命名应反映实际功能，避免使用抽象词汇"）。
3. **跨模块引用** — 子模块页面中的链接会因 slug 变化而需要重新生成。使用 `--force` 全量重新生成时不会出现此问题，增量更新时确保所有相关页面一起重建。
4. **增量更新语言检查** — 现有代码在 `run()` 方法中检查语言一致性，修改后中文 lang 值应能通过该检查。
