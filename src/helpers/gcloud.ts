import { Configuration, execUtils } from '@yarnpkg/core';

export async function gcloud(configuration: Configuration, ...args: string[]): Promise<string> {
  const { stdout } = await execUtils.execvp('gcloud', args, {
    cwd: configuration.projectCwd,
    encoding: 'utf-8',
  });

  return stdout;
}
