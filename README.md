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

# Optional, only used for running/building on GCP VMs
unsafeHttpWhitelist:
  - metadata.google.internal
```

## Commands

- `yarn gcp-auth refresh`: clears plugin cache and forces the plugin to fetch a new token.
- `yarn gcp-auth logout`: clears plugin cache, helps ensured no token left in the system.


## Notes

The plugin will first try to fetch a token from VM metadata (if you're running on gcp), then for your gcloud ADC, and *then* your normal gcloud auth.
To avoid this, log out of your ADC with `gcloud auth application-default revoke` and run `yarn gcp-auth refresh` (see [Commands](#commands)).

If you are using this plugin during a docker build in Google Cloud Build, you need to use `--network=cloudbuild` in your `.yaml` so the container has access to GCP's metadata server. Read more [here](https://cloud.google.com/build/docs/build-config-file-schema#network).
You will also need to whitelist the metadata url as shown in the .yarnrc.yml example [here](#per-project-setup).

Tokens are being cached since v1.1.0, and will be used until they expire (usually up to an hour) or until they're refreshed manually (see [Commands](#commands)).

## Local docker build

You probably won't have `gcloud` installed in your docker container, so as a workaround for testing local builds, you can pass your access token in to use as an environment variable.

> This should not be used in production, as it may bake your access token into your docker image.

```sh
docker build --tag my-image --build-arg ACCESS_TOKEN=$(gcloud auth application-default print-access-token) .
```

```Dockerfile
# in your build stage
ARG ACCESS_TOKEN
RUN yarn
```

> Advanced non-local setup would be to use [docker build secrets](https://docs.docker.com/build/building/secrets/#secret-mounts) instead:
```sh
gcp_token=$(gcloud auth application-default print-access-token) docker build --tag my-image --secret id=gcp_token  .
```

```Dockerfile
# in your build stage read secret into environment variable, install packages and logout in same layer:
RUN --mount=type=secret,id=gcp_token \
    ACCESS_TOKEN=$(cat /run/secrets/gcp_token) yarn \
    && yarn logout
```

### Credits

Big shoutout to [FishandRichardsonPC](https://github.com/FishandRichardsonPC)
who made a [similar plugin for azure](https://github.com/FishandRichardsonPC/yarn-plugin-az-cli-auth)
from which I've copied most of the structure for this project.
