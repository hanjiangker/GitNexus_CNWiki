import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

describe('generateHTMLViewer localization', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wiki-html-viewer-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('uses Chinese viewer labels when wiki metadata is zh-CN', async () => {
    const wikiDir = path.join(tmpDir, 'wiki');
    await fs.mkdir(wikiDir, { recursive: true });
    await fs.writeFile(
      path.join(wikiDir, 'module_tree.json'),
      JSON.stringify([{ name: '认证模块', slug: 'auth', files: ['src/auth.ts'] }]),
    );
    await fs.writeFile(
      path.join(wikiDir, 'meta.json'),
      JSON.stringify({ lang: 'zh-CN', generatedAt: '2026-06-07T00:00:00.000Z' }),
    );
    await fs.writeFile(path.join(wikiDir, 'overview.md'), '# 项目概览\n\n参见 [认证模块](auth.md)。');
    await fs.writeFile(path.join(wikiDir, 'auth.md'), '# 认证模块\n\n调用 `loginUser()`。');

    const { generateHTMLViewer } = await import('../../src/core/wiki/html-viewer.js');
    const outputPath = await generateHTMLViewer(wikiDir, 'demo');
    const html = await fs.readFile(outputPath, 'utf-8');

    expect(html).toContain('<html lang="zh-CN">');
    expect(html).toContain('由 GitNexus 生成');
    expect(html).toContain('"overview":"概览"');
    expect(html).toContain('"modules":"模块"');
    expect(html).toContain('"auth":"# 认证模块');
  });
});
