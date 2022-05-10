import { Configuration, httpUtils } from '@yarnpkg/core';
import { getTokenInfo } from './get-token-info';
import { TokenCache } from '../types/token-cache';
import { gcloud } from './gcloud';

export async function refreshToken(configuration: Configuration): Promise<string> {
  let token: string, expiresIn: number;

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
    token = token.trim();
  } catch {
    try {
      token = await gcloud(configuration, 'auth', 'application-default', 'print-access-token');
    } catch {
      token = await gcloud(configuration, 'auth', 'print-access-token');
    }

    token = token
      .trim()
      .split('\n')
      .filter((s) => s && s !== '')
      .pop();

    ({ expires_in: expiresIn } = await getTokenInfo(configuration, token));
  }
  const expiresAt = Date.now() + expiresIn * 1000;
  const newCache: TokenCache = { token, expiresAt };
  await Configuration.updateHomeConfiguration({ gcpAccessToken: newCache });
  return token;
}
