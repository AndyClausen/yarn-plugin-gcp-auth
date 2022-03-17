import {
  Configuration,
  ConfigurationDefinitionMap,
  httpUtils,
  miscUtils,
  Plugin,
  SettingsType,
  execUtils,
} from '@yarnpkg/core';
import { Hooks as NpmHooks } from '@yarnpkg/plugin-npm';
import { BaseCommand } from '@yarnpkg/cli';

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

async function refreshToken(configuration: Configuration): Promise<string> {
  let token, expiresIn;

  async function gcloud(args: string[]): Promise<string> {
    const { stdout } = await execUtils.execvp('gcloud', args, {
      cwd: configuration.projectCwd,
      encoding: 'utf-8',
    });

    return stdout;
  }

  try {
    // First check if we're in a GCP VM
    // Use `httpUtils.request` instead of `httpUtils.get` to avoid caching.
    const res = await httpUtils.request(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
      null,
      {
        configuration,
        headers: {
          'Metadata-Flavor': 'Google',
        },
        jsonResponse: true,
      }
    );

    ({ access_token: token, expires_in: expiresIn } = res.body);
  } catch {
    try {
      token = await gcloud(['auth', 'application-default', 'print-access-token']);
    } catch {
      token = await gcloud(['auth', 'print-access-token']);
    }

    ({ expires_in: expiresIn } = await getTokenInfo(token, configuration));
  }
  token = token.trim();
  const expiresAt = Date.now() + expiresIn * 1000;
  const newCache: Cache = { token, expiresAt };
  await Configuration.updateHomeConfiguration({ gcpAccessToken: newCache });
  return token;
}

const plugin: Plugin<NpmHooks> = {
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
        token = await refreshToken(configuration);
      }

      return `Bearer ${token}`;
    },
  },
  commands: [
    class RefreshCommand extends BaseCommand {
      static paths = [['gcp-auth', 'refresh']];
      async execute(): Promise<number | void> {
        this.context.stdout.write('Discarding plugin cache...\n');
        await Configuration.updateHomeConfiguration({ gcpAccessToken: {} });
        this.context.stdout.write('Rebuilding...\n');
        await refreshToken(await Configuration.find(this.context.cwd, this.context.plugins));
        this.context.stdout.write('Done!\n');
      }
    },
  ],
};

export default plugin;
