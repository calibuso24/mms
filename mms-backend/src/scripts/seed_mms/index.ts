import { pool } from '../../config/database.js';
import { loadSeederConfig } from './config.js';
import { logStep, getOrCreateLookupId, loadLookupMap } from './helpers.js';
import { SeededRandom } from './random.js';
import { SeedRunContext } from './types.js';
import { ProductSeeder } from './productSeeder.js';
import { PartySeeder } from './partySeeder.js';
import { WorkflowSeeder } from './workflowSeeder.js';

async function resolveSeedActorAccountId(): Promise<number> {
  const client = await pool.connect();

  try {
    const existingResult = await client.query<{ account_id: number }>(
      `SELECT account_id
       FROM account
       WHERE is_deleted = FALSE
       ORDER BY account_id
       LIMIT 1`
    );

    if (existingResult.rowCount && existingResult.rows[0]) {
      return existingResult.rows[0].account_id;
    }

    const insertResult = await client.query<{ account_id: number }>(
      `INSERT INTO account (
        user_name,
        full_name,
        is_active,
        is_deleted,
        log_date_created,
        log_module_created
      )
      VALUES ('seed.operator', 'Seed Operator', TRUE, FALSE, NOW(), 'seed_mms')
      ON CONFLICT (user_name)
      WHERE is_deleted = FALSE
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        is_active = TRUE,
        is_deleted = FALSE,
        log_date_updated = NOW(),
        log_module_updated = 'seed_mms'
      RETURNING account_id`
    );

    return insertResult.rows[0].account_id;
  } finally {
    client.release();
  }
}

async function ensureRequiredLookups(context: SeedRunContext): Promise<void> {
  const lookupSeeds: Array<{ type: string; code: string; name: string; description: string; displayOrder: number }> = [
    {
      type: 'purchase_order_type',
      code: 'standard_purchase',
      name: 'Standard Purchase',
      description: 'Standard purchase order for procurement from approved suppliers.',
      displayOrder: 1,
    },
    {
      type: 'stock_transfer_type',
      code: 'warehouse_transfer',
      name: 'Warehouse Transfer',
      description: 'Standard warehouse transfer movement.',
      displayOrder: 5,
    },
    {
      type: 'stock_transfer_status',
      code: 'approved',
      name: 'Approved',
      description: 'Stock transfer has been approved.',
      displayOrder: 3,
    },
    {
      type: 'supplier_delivery_status',
      code: 'draft',
      name: 'Draft',
      description: 'Supplier delivery is prepared and not yet posted.',
      displayOrder: 1,
    },
    {
      type: 'supplier_delivery_status',
      code: 'posted',
      name: 'Posted',
      description: 'Supplier delivery has been posted to inventory.',
      displayOrder: 2,
    },
    {
      type: 'delivery_advice_status',
      code: 'completed',
      name: 'Completed',
      description: 'Delivery advice has been completed/received.',
      displayOrder: 3,
    },
    {
      type: 'material_adjustment_status',
      code: 'pending',
      name: 'Pending',
      description: 'Adjustment request is pending approval.',
      displayOrder: 1,
    },
    {
      type: 'material_adjustment_status',
      code: 'approved',
      name: 'Approved',
      description: 'Adjustment request has been approved.',
      displayOrder: 2,
    },
    {
      type: 'material_adjustment_status',
      code: 'completed',
      name: 'Completed',
      description: 'Adjustment has been applied and recorded.',
      displayOrder: 4,
    },
    {
      type: 'material_adjustment_reason',
      code: 'lost',
      name: 'Lost',
      description: 'Material lost from site and adjusted out of stock.',
      displayOrder: 1,
    },
    {
      type: 'material_adjustment_reason',
      code: 'damaged',
      name: 'Damaged',
      description: 'Material damaged and removed from stock.',
      displayOrder: 2,
    },
    {
      type: 'material_adjustment_reason',
      code: 'other',
      name: 'Other',
      description: 'Other approved inventory adjustment reason.',
      displayOrder: 4,
    },
  ];

  for (const lookupSeed of lookupSeeds) {
    await getOrCreateLookupId(
      context.client,
      context,
      lookupSeed.type,
      lookupSeed.code,
      lookupSeed.name,
      lookupSeed.description,
      lookupSeed.displayOrder
    );
  }
}

async function main(): Promise<void> {
  const config = loadSeederConfig(process.argv.slice(2));
  const actorAccountId = await resolveSeedActorAccountId();

  logStep(`Configuration loaded. seed=${config.seed}, dryRun=${config.dryRun}`);
  logStep(`Module counts: ${JSON.stringify(config.counts)}`);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const context: SeedRunContext = {
      client,
      config,
      random: new SeededRandom(config.seed),
      lookup: await loadLookupMap(client),
      actorAccountId,
      now: new Date(),
      workflow: {
        projectIds: [],
        supplierIds: [],
        warehouseIds: [],
        materials: [],
      },
      summaries: [],
    };

    logStep('Ensuring workflow lookup values exist.');
    await ensureRequiredLookups(context);

    logStep('Seeding product management master data.');
    const productSeeder = new ProductSeeder();
    context.workflow.materials = await productSeeder.seed(context);

    logStep('Seeding project/supplier/warehouse party data.');
    const partySeeder = new PartySeeder();
    const parties = await partySeeder.seed(context);
    context.workflow.projectIds = parties.projects.map((party) => party.partyId);
    context.workflow.supplierIds = parties.suppliers.map((party) => party.partyId);
    context.workflow.warehouseIds = parties.warehouses.map((party) => party.partyId);

    logStep('Seeding workflow transactions and inventory documents.');
    const workflowSeeder = new WorkflowSeeder();
    await workflowSeeder.seed(context);

    if (config.dryRun) {
      await client.query('ROLLBACK');
      logStep('Dry run enabled. Transaction rolled back.');
    } else {
      await client.query('COMMIT');
      logStep('Seed transaction committed successfully.');
    }

    logStep('Seed summary:');
    for (const summary of context.summaries) {
      console.log(
        `[seed:mms] ${summary.module}: created=${summary.created}, updated=${summary.updated}, reused=${summary.reused}${summary.notes ? ` | ${summary.notes}` : ''}`
      );
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[seed:mms] Failed and rolled back.', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[seed:mms] Fatal error', error);
  process.exit(1);
});
