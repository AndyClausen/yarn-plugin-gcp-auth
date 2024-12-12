import {
  Configuration,
  ConfigurationDefinitionMap,
  miscUtils,
  Plugin,
  SettingsType,
} from '@yarnpkg/core';
import { Hooks as NpmHooks } from '@yarnpkg/plugin-npm';
import { BaseCommand } from '@yarnpkg/cli';
import { refreshToken } from './helpers/refresh-token';
import { TokenCache } from './types/token-cache';

declare module '@yarnpkg/core' {
  interface ConfigurationValueMap {
    gcpAccessToken: miscUtils.ToMapValue<TokenCache>;
  }
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

      if (process.env.DEPENDABOT) {
        console.warn('Dependabot detected, skipping GCP authentication');
        return currentHeader;
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
    class LogoutCommand extends BaseCommand {
      static paths = [['gcp-auth', 'logout']];
      async execute(): Promise<number | void> {
        this.context.stdout.write('Removing cached GCP Access Token...\n');
        await Configuration.updateHomeConfiguration({ gcpAccessToken: {} });
        this.context.stdout.write('Done!\n');
      }
    },
  ],
};

export default plugin;
