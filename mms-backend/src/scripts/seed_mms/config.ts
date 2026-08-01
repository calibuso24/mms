export type SeederConfig = {
  seed: number;
  dryRun: boolean;
  counts: {
    products: number;
    projects: number;
    suppliers: number;
    materialControls: number;
    materialRequests: number;
    purchaseOrders: number;
    deliveryAdvices: number;
    supplierDeliveries: number;
    stockTransfers: number;
    materialAdjustments: number;
  };
};

const DEFAULT_CONFIG: SeederConfig = {
  seed: 20260801,
  dryRun: false,
  counts: {
    products: 250,
    projects: 40,
    suppliers: 30,
    materialControls: 120,
    materialRequests: 240,
    purchaseOrders: 160,
    deliveryAdvices: 180,
    supplierDeliveries: 140,
    stockTransfers: 120,
    materialAdjustments: 120,
  },
};

function parseIntValue(rawValue: string | undefined, fallback: number): number {
  if (!rawValue || rawValue.trim() === '') {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

function toEnvName(key: keyof SeederConfig['counts']): string {
  const fromCamel = key.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
  return `MMS_SEED_${fromCamel}`;
}

export function loadSeederConfig(argv: string[]): SeederConfig {
  const config: SeederConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as SeederConfig;

  for (const key of Object.keys(config.counts) as Array<keyof SeederConfig['counts']>) {
    const envName = toEnvName(key);
    config.counts[key] = parseIntValue(process.env[envName], config.counts[key]);
  }

  config.seed = parseIntValue(process.env.MMS_SEED_VALUE, config.seed);
  config.dryRun = process.env.MMS_SEED_DRY_RUN === '1' || process.env.MMS_SEED_DRY_RUN === 'true';

  for (const arg of argv) {
    if (!arg.startsWith('--')) {
      continue;
    }

    const [rawKey, rawValue] = arg.slice(2).split('=');
    if (!rawKey) {
      continue;
    }

    if (rawKey === 'seed') {
      config.seed = parseIntValue(rawValue, config.seed);
      continue;
    }

    if (rawKey === 'dry-run') {
      config.dryRun = rawValue === undefined || rawValue === '1' || rawValue === 'true';
      continue;
    }

    if (rawKey in config.counts) {
      const countKey = rawKey as keyof SeederConfig['counts'];
      config.counts[countKey] = parseIntValue(rawValue, config.counts[countKey]);
    }
  }

  return config;
}
