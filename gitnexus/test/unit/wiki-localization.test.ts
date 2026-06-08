import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

const mocks = vi.hoisted(() => ({
  files: [
    { filePath: 'src/auth.ts', symbols: [{ name: 'loginUser', type: 'function' }] },
    { filePath: 'src/db.ts', symbols: [{ name: 'connectDb', type: 'function' }] },
  ],
  callLLM: vi.fn(),
}));

vi.mock('../../src/core/wiki/graph-queries.js', () => ({
  initWikiDb: vi.fn().mockResolvedValue(undefined),
  closeWikiDb: vi.fn().mockResolvedValue(undefined),
  touchWikiDb: vi.fn(),
  getFilesWithExports: vi.fn().mockResolvedValue(mocks.files),
  getAllFiles: vi.fn().mockResolvedValue(mocks.files.map((f) => f.filePath)),
  getIntraModuleCallEdges: vi.fn().mockResolvedValue([]),
  getInterModuleCallEdges: vi.fn().mockResolvedValue({ incoming: [], outgoing: [] }),
  getProcessesForFiles: vi.fn().mockResolvedValue([]),
  getAllProcesses: vi.fn().mockResolvedValue([]),
  getInterModuleEdgesForOverview: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../src/core/wiki/llm-client.js', () => ({
  callLLM: mocks.callLLM,
  estimateTokens: (value: string) => Math.ceil(value.length / 4),
}));

vi.mock('../../src/core/wiki/cursor-client.js', () => ({
  callCursorLLM: vi.fn(),
  resolveCursorConfig: vi.fn(),
}));

vi.mock('../../src/core/wiki/local-cli-client.js', () => ({
  callClaudeLLM: vi.fn(),
  callCodexLLM: vi.fn(),
  callOpenCodeLLM: vi.fn(),
  resolveLocalCLIConfig: vi.fn(),
}));

vi.mock('child_process', () => ({
  execSync: vi.fn().mockImplementation(() => {
    throw new Error('not a git repo');
  }),
  execFileSync: vi.fn(),
}));

describe('WikiGenerator localization', () => {
  let tmpDir: string;

  beforeEach(async () => {
    mocks.callLLM.mockReset();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wiki-localization-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('normalizes Chinese aliases and preserves code terms in language prompts', async () => {
    const { WikiGenerator } = await import('../../src/core/wiki/generator.js');
    const gen = new WikiGenerator(
      '/repo',
      tmpDir,
      '/lbug',
      {
        apiKey: '',
        baseUrl: '',
        model: 'test',
        maxTokens: 1000,
        temperature: 0,
        provider: 'openai',
      },
      { lang: '中文' },
    );

    expect((gen as any).effectiveLang()).toBe('zh-CN');

    const prompt = (gen as any).buildSystemPrompt('Base prompt');
    expect(prompt).toContain('Simplified Chinese');
    expect(prompt).toContain('Preserve code identifiers');
    expect(prompt).toContain('Markdown link targets exactly');
  });

  it('uses a leading H1 from the model without duplicating headings', async () => {
    const { WikiGenerator } = await import('../../src/core/wiki/generator.js');
    const gen = new WikiGenerator('/repo', tmpDir, '/lbug', {
      apiKey: '',
      baseUrl: '',
      model: 'test',
      maxTokens: 1000,
      temperature: 0,
      provider: 'openai',
    });

    const content = (gen as any).composePageContent(
      'Fallback',
      '# 认证模块\n\n正文使用 `loginUser()`。\n\n## Details',
    );

    expect(content).toBe('# 认证模块\n\n正文使用 `loginUser()`。\n\n## Details');
  });

  it('localizes Chinese module display names while preserving stable slugs', async () => {
    mocks.callLLM
      .mockResolvedValueOnce({
        content: JSON.stringify({
          Auth: ['src/auth.ts'],
          Database: ['src/db.ts'],
        }),
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({
          auth: '认证模块',
          database: '数据库模块',
        }),
      });

    const { WikiGenerator } = await import('../../src/core/wiki/generator.js');

    const storagePath = path.join(tmpDir, 'storage');
    const wikiDir = path.join(storagePath, 'wiki');
    const repoPath = path.join(tmpDir, 'repo');
    await fs.mkdir(wikiDir, { recursive: true });
    await fs.mkdir(repoPath, { recursive: true });

    const gen = new WikiGenerator(
      repoPath,
      storagePath,
      path.join(storagePath, 'lbug'),
      {
        apiKey: 'key',
        baseUrl: 'http://localhost',
        model: 'test',
        maxTokens: 1000,
        temperature: 0,
        provider: 'openai',
      },
      { reviewOnly: true, lang: 'zh-CN' },
    );

    const result = await gen.run();

    expect(mocks.callLLM).toHaveBeenCalledTimes(2);
    expect(result.moduleTree).toEqual([
      { name: '认证模块', slug: 'auth', files: ['src/auth.ts'] },
      { name: '数据库模块', slug: 'database', files: ['src/db.ts'] },
    ]);
  });
});
