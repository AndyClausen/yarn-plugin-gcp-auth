import { Plugin } from '@yarnpkg/core';
import { Hooks } from '@yarnpkg/plugin-npm';
import { exec } from 'child_process';

function run(cmd): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) return reject(error);
      if (stderr) return reject(new Error(stderr));
      resolve(stdout);
    });
  });
}

const plugin: Plugin<Hooks> = {
  hooks: {
    async getNpmAuthenticationHeader(currentHeader: string | undefined, registry: string) {
      if (!registry.includes("npm.pkg.dev/")) {
        return null;
      }
      let token: string;
      try {
        token = await run("gcloud auth application-default print-access-token");
      } catch (e) {
        token = await run("gcloud auth print-access-token");
      }
      return `Bearer ${token.trim()}`;
    },
  },
};

export default plugin;
