import { PoolClient } from 'pg';
import { SeededRandom } from './random.js';
import { SeederConfig } from './config.js';

export type LookupMap = Map<string, number>;

export type SeedSummary = {
  module: string;
  created: number;
  updated: number;
  reused: number;
  notes?: string;
};

export type ProductSeedRecord = {
  materialId: number;
  materialCode: string;
  productName: string;
  categoryId: number;
  subCategoryId: number;
  uomId: number;
  brandId: number | null;
  materialBrandId: number | null;
};

export type PartySeedRecord = {
  partyId: number;
  partyCode: string;
  contactId: number;
  partyTypeCode: string;
};

export type WorkflowSeedContext = {
  projectIds: number[];
  supplierIds: number[];
  warehouseIds: number[];
  materials: ProductSeedRecord[];
};

export type SeedRunContext = {
  client: PoolClient;
  config: SeederConfig;
  random: SeededRandom;
  lookup: LookupMap;
  actorAccountId: number;
  now: Date;
  workflow: WorkflowSeedContext;
  summaries: SeedSummary[];
};
