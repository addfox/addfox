type EnvProbe = {
  mode: string | undefined;
  browser: string | undefined;
  manifestVersion: string | undefined;
  publicLabel: string | undefined;
  publicApiUrl: string | undefined;
  privateToken: string | undefined;
  internalFlag: string | undefined;
};

export function collectEnvProbe(): EnvProbe {
  return {
    mode: process.env.NODE_ENV,
    browser: import.meta.env.BROWSER,
    manifestVersion: import.meta.env.MANIFEST_VERSION,
    publicLabel: process.env.ADDFOX_PUBLIC_LABEL,
    publicApiUrl: process.env.ADDFOX_PUBLIC_API_URL,
    privateToken: process.env.ADDFOX_PRIVATE_TOKEN,
    internalFlag: process.env.ADDFOX_INTERNAL_FLAG,
  };
}

export function formatEnvProbe(prefix: string): string {
  return `${prefix} ${JSON.stringify(collectEnvProbe(), null, 2)}`;
}
