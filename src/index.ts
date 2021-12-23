import {
  Configuration,
  ConfigurationDefinitionMap,
  Hooks,
  httpUtils,
  miscUtils,
  Plugin,
  SettingsType,
} from '@yarnpkg/core';
import { Hooks as NpmHooks } from '@yarnpkg/plugin-npm';
import { exec } from 'child_process';

interface Cache {
  token: string | null;
  expiresAt: number | null;
}

declare module '@yarnpkg/core' {
  interface ConfigurationValueMap {
    gcpAccessToken: miscUtils.ToMapValue<Cache>;
  }
}

interface TokenInfo {
  issued_to: string;
  audience: string;
  user_id: string;
  scope: string;
  expires_in: number;
  email: string;
  verified_email: boolean;
  access_type: string;
}

const configuration: Partial<ConfigurationDefinitionMap> = {
  gcpAccessToken: {
    description: '',
    type: SettingsType.SHAPE,
    properties: {
      token: {
        description: '',
        type: SettingsType.STRING,
        default: null,
      },
      expiresAt: {
        description: '',
        type: SettingsType.NUMBER,
        default: null,
      },
    },
  },
};

function run(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) return reject(error);
      if (stderr) return reject(new Error(stderr));
      resolve(stdout);
    });
  });
}

async function getTokenInfo(token: string, configuration: Configuration): Promise<TokenInfo> {
  const res = await httpUtils.post(
    'https://www.googleapis.com/oauth2/v1/tokeninfo',
    {
      access_token: token,
    },
    {
      configuration,
    }
  );
  return JSON.parse(res.toString());
}

const plugin: Plugin<Hooks & NpmHooks> = {
  configuration,
  hooks: {
    async getNpmAuthenticationHeader(
      currentHeader: string | undefined,
      registry: string,
      { configuration }
    ) {
      if (!registry.includes('npm.pkg.dev/')) {
        return null;
      }
      const cache = configuration.get('gcpAccessToken');
      let token: string = cache.get('token');
      if (!token || cache.get('expiresAt') < Date.now() + 1000) {
        try {
          token = await run('gcloud auth application-default print-access-token');
        } catch (e) {
          token = await run('gcloud auth print-access-token');
        }
        token = token.trim();
        const { expires_in: expiresIn } = await getTokenInfo(token, configuration);
        const expiresAt = Date.now() + expiresIn * 1000;
        const newCache: Cache = { token, expiresAt };
        Configuration.updateHomeConfiguration({ gcpAccessToken: newCache });
      }

      return `Bearer ${token}`;
    },
  },
};

export default plugin;
