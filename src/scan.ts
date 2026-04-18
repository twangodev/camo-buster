import * as fs from 'fs/promises';
import * as glob from '@actions/glob';

export function parseList(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(Boolean);
}

export interface MarkdownFile {
  path: string;
  content: string;
}

export async function readMarkdownFiles(patterns: string[]): Promise<MarkdownFile[]> {
  if (patterns.length === 0) return [];
  const globber = await glob.create(patterns.join('\n'), { matchDirectories: false });
  const paths = await globber.glob();
  return Promise.all(paths.map(async path => ({ path, content: await fs.readFile(path, 'utf8') })));
}
