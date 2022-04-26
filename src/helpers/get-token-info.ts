import { Configuration, httpUtils } from '@yarnpkg/core';
import { TokenInfo } from '../types/token-info';

export async function getTokenInfo(
  configuration: Configuration,
  token: string
): Promise<TokenInfo> {
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
