import type { getOctokit } from '@actions/github';

type Octokit = ReturnType<typeof getOctokit>;

export async function renderMarkdown(
  octokit: Octokit,
  text: string,
  repository: string,
): Promise<string> {
  const response = await octokit.rest.markdown.render({
    text,
    mode: 'gfm',
    context: repository,
  });
  return response.data;
}
