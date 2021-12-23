# yarn-plugin-gcp-auth
[![Github Downloads](https://img.shields.io/github/downloads/AndyClausen/yarn-plugin-gcp-auth/total)]()

Yarn Berry plugin to use gcloud auth for authentication to Google Artifact Registry packages

## Installation

### First time setup per machine

1. Install [gcloud](https://cloud.google.com/sdk/docs/install)
2. Run `gcloud auth login` or to use ADC (Application Default Credential) run `gcloud auth application-default login`

### Per project setup

To install the latest release use
```sh
yarn plugin import https://github.com/AndyClausen/yarn-plugin-gcp-auth/releases/latest/download/plugin-gcp-auth.js
```
or to install a specific version use
```sh
yarn plugin import https://github.com/AndyClausen/yarn-plugin-gcp-auth/releases/download/X.Y.Z/plugin-gcp-auth.js
```

Then you will need to setup your .yarnrc.yml file to connect with Google Artifact Registry

Example:
```yaml
npmScopes:
  <org>:
    npmAlwaysAuth: true
    npmPublishRegistry: "https://<location>-npm.pkg.dev/<org>/<repository>/"
    npmRegistryServer: "https://<location>-npm.pkg.dev/<org>/<repository>/"
```

## Notes

The plugin will first try to fetch a token for your ADC and *then* your normal auth. To avoid this, log out of your ADC with `gcloud auth application-default revoke`.

Also, tokens are being cached since v1.1.0, and will be used until they expire (usually up to an hour).


### Credits

Big shoutout to [FishandRichardsonPC](https://github.com/FishandRichardsonPC)
who made a [similar plugin for azure](https://github.com/FishandRichardsonPC/yarn-plugin-az-cli-auth)
from which I've copied the vast majority of the project.