import { PoolClient } from 'pg';
import { SeedRunContext, SeedSummary } from './types.js';

export function logStep(step: string): void {
  console.log(`[seed:mms] ${step}`);
}

export function pushSummary(context: SeedRunContext, summary: SeedSummary): void {
  context.summaries.push(summary);
}

export function buildLookupKey(type: string, code: string): string {
  return `${type}:${code}`;
}

export async function getOrCreateLookupId(
  client: PoolClient,
  context: SeedRunContext,
  lookupType: string,
  code: string,
  name: string,
  description: string,
  displayOrder: number
): Promise<number> {
  const key = buildLookupKey(lookupType, code);
  const existing = context.lookup.get(key);
  if (existing) {
    return existing;
  }

  await client.query(
    `INSERT INTO look_up (
      look_up_type,
      code,
      name,
      description,
      display_order,
      is_active,
      is_deleted,
      log_date_created,
      log_module_created
    )
    VALUES ($1, $2, $3, $4, $5, TRUE, FALSE, NOW(), 'seed_mms')
    ON CONFLICT (look_up_type, name)
    DO UPDATE SET
      code = EXCLUDED.code,
      description = EXCLUDED.description,
      display_order = EXCLUDED.display_order,
      is_active = TRUE,
      is_deleted = FALSE,
      log_date_updated = NOW(),
      log_module_updated = 'seed_mms'`,
    [lookupType, code, name, description, displayOrder]
  );

  const result = await client.query<{ look_up_id: number }>(
    `SELECT look_up_id
     FROM look_up
     WHERE look_up_type = $1 AND code = $2`,
    [lookupType, code]
  );

  if (result.rowCount === 0) {
    throw new Error(`Failed to resolve lookup id for ${lookupType}/${code}`);
  }

  const id = result.rows[0].look_up_id;
  context.lookup.set(key, id);
  return id;
}

export async function loadLookupMap(client: PoolClient): Promise<Map<string, number>> {
  const lookupMap = new Map<string, number>();

  const result = await client.query<{
    look_up_id: number;
    look_up_type: string;
    code: string | null;
  }>(
    `SELECT look_up_id, look_up_type, code
     FROM look_up
     WHERE is_deleted = FALSE`
  );

  for (const row of result.rows) {
    if (!row.code) {
      continue;
    }

    lookupMap.set(buildLookupKey(row.look_up_type, row.code), row.look_up_id);
  }

  return lookupMap;
}

export function requireLookupId(context: SeedRunContext, lookupType: string, code: string): number {
  const key = buildLookupKey(lookupType, code);
  const value = context.lookup.get(key);
  if (!value) {
    throw new Error(`Missing lookup value for ${lookupType}/${code}. Run base migrations and lookups first.`);
  }
  return value;
}

export function formatSeedNumber(prefix: string, index: number, width = 6): string {
  return `${prefix}-${String(index).padStart(width, '0')}`;
}

export function arrayChunk<T>(items: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) {
    return [items];
  }

  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }

  return chunks;
}
