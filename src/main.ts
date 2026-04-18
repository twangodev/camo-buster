import * as core from '@actions/core';
import * as github from '@actions/github';

import { extractCamoUrls } from './extract';
import { type PurgeResult, purgeAll } from './purge';
import { renderMarkdown } from './render';
import { type MarkdownFile, parseList, readMarkdownFiles } from './scan';

function formatStatus(result: PurgeResult): string {
  if (result.ok) return `OK ${result.status ?? '2xx'}`;
  if (result.status) return `FAIL ${result.status}`;
  return `FAIL ${result.error ?? 'error'}`;
}

function truncate(url: string, max = 80): string {
  return url.length <= max ? url : `${url.slice(0, max - 1)}…`;
}

async function run(): Promise<void> {
  const startedAt = Date.now();

  try {
    const filesInput = core.getInput('files');
    const urlsInput = core.getInput('urls');
    const repository = core.getInput('repository') || process.env.GITHUB_REPOSITORY || '';
    const token = core.getInput('github-token');
    const failOnError = core.getBooleanInput('fail-on-error');
    const concurrencyRaw = core.getInput('concurrency') || '4';
    const concurrency = Number.parseInt(concurrencyRaw, 10);

    if (!Number.isFinite(concurrency) || concurrency < 1) {
      core.setFailed(`concurrency must be a positive integer, got "${concurrencyRaw}"`);
      return;
    }
    if (!repository) {
      core.setFailed('repository input is required (owner/repo) and GITHUB_REPOSITORY is not set');
      return;
    }
    if (!token) {
      core.setFailed('github-token input is required');
      return;
    }

    const octokit = github.getOctokit(token);
    const fileGlobs = parseList(filesInput);
    const explicitUrls = parseList(urlsInput);

    core.startGroup('Configuration');
    core.info(`repository    : ${repository}`);
    core.info(`files         : ${fileGlobs.length ? fileGlobs.join(', ') : '(none)'}`);
    core.info(`urls          : ${explicitUrls.length} explicit URL(s)`);
    core.info(`concurrency   : ${concurrency}`);
    core.info(`fail-on-error : ${failOnError}`);
    core.endGroup();

    core.startGroup('Scanning markdown');
    const files: MarkdownFile[] = fileGlobs.length ? await readMarkdownFiles(fileGlobs) : [];
    if (fileGlobs.length && files.length === 0) {
      core.warning(`No files matched: ${fileGlobs.join(', ')}`);
    }
    for (const f of files) core.info(`  • ${f.path} (${f.content.length} bytes)`);
    if (explicitUrls.length) {
      core.info(`  • ${explicitUrls.length} explicit URL(s)`);
    }
    core.endGroup();

    const markdownBlobs: string[] = [
      ...files.map(f => f.content),
      ...(explicitUrls.length ? [explicitUrls.map(u => `![](${u})`).join('\n\n')] : []),
    ];

    if (markdownBlobs.length === 0) {
      core.warning('Nothing to scan — set the "files" or "urls" input.');
      core.setOutput('purged-count', 0);
      core.setOutput('purged-urls', '[]');
      return;
    }

    core.startGroup('Rendering markdown via GitHub API');
    const camoUrls = new Set<string>();
    for (let i = 0; i < markdownBlobs.length; i++) {
      const blob = markdownBlobs[i]!;
      const html = await renderMarkdown(octokit, blob, repository);
      const found = extractCamoUrls(html);
      core.info(`  blob ${i + 1}/${markdownBlobs.length}: ${found.length} camo URL(s)`);
      for (const u of found) camoUrls.add(u);
    }
    core.endGroup();

    const urls = [...camoUrls];
    if (urls.length === 0) {
      core.info('No camo URLs found — nothing to purge.');
      await core.summary
        .addHeading('Camo Buster', 2)
        .addRaw('No camo URLs found. Nothing to purge.', true)
        .write();
      core.setOutput('purged-count', 0);
      core.setOutput('purged-urls', '[]');
      return;
    }

    core.startGroup(`Purging ${urls.length} camo URL(s)`);
    const results = await purgeAll(urls, concurrency, undefined, result => {
      const mark = result.ok ? '✓' : '✗';
      const line = `  ${mark} ${formatStatus(result)}  ${truncate(result.url)}`;
      if (result.ok) core.info(line);
      else core.warning(line);
    });
    core.endGroup();

    const successes = results.filter(r => r.ok);
    const failures = results.filter(r => !r.ok);
    const elapsedMs = Date.now() - startedAt;

    core.setOutput('purged-count', successes.length);
    core.setOutput('purged-urls', JSON.stringify(successes.map(r => r.url)));

    const headline = `Purged ${successes.length}/${urls.length} camo URL(s)${
      failures.length ? ` (${failures.length} failed)` : ''
    } in ${elapsedMs} ms`;
    core.info(headline);

    await core.summary
      .addHeading('Camo Buster', 2)
      .addRaw(
        `Purged **${successes.length}** of **${urls.length}** camo URL(s)${
          failures.length ? ` — **${failures.length} failed**` : ''
        } in **${elapsedMs} ms**.`,
        true,
      )
      .addTable([
        [
          { data: 'Status', header: true },
          { data: 'URL', header: true },
        ],
        ...results.map(r => [r.ok ? '✅' : '❌', `<code>${r.url}</code>`]),
      ])
      .write();

    if (failures.length && failOnError) {
      core.setFailed(`${failures.length} PURGE request(s) failed`);
    } else if (failures.length) {
      core.warning(`${failures.length} PURGE request(s) failed (fail-on-error=false)`);
    }
  } catch (err) {
    core.setFailed(err instanceof Error ? err.stack || err.message : String(err));
  }
}

void run();
