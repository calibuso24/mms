import { SeedRunContext, ProductSeedRecord } from './types.js';
import { formatSeedNumber, pushSummary, requireLookupId } from './helpers.js';

type MaterialRequestItemSeed = {
  material_request_item_id: number;
  material_id: number;
  material_brand_id: number | null;
  uom_id: number;
  approved_quantity: number;
};

type MaterialRequestSeed = {
  material_request_id: number;
  mr_number: string;
  project_id: number;
  items: MaterialRequestItemSeed[];
};

type PurchaseOrderItemSeed = {
  purchase_order_item_id: number;
  material_request_item_id: number | null;
  material_id: number;
  material_brand_id: number | null;
  uom_id: number;
  ordered_quantity: number;
};

type PurchaseOrderSeed = {
  purchase_order_id: number;
  po_number: string;
  project_id: number;
  supplier_id: number;
  material_request_id: number | null;
  items: PurchaseOrderItemSeed[];
};

type DeliveryAdviceItemPlan = {
  purchase_order_item_id: number;
  material_id: number;
  material_brand_id: number | null;
  uom_id: number;
  advised_quantity: number;
};

type DeliveryAdviceSeed = {
  delivery_advice_id: number;
  da_number: string;
  purchase_order_id: number;
  supplier_id: number;
  project_id: number;
  items: DeliveryAdviceItemPlan[];
};

export class WorkflowSeeder {
  async seed(context: SeedRunContext): Promise<void> {
    await this.cleanupGeneratedWorkflow(context);
    await this.seedOpeningWarehouseStocks(context);

    const materialControls = await this.seedMaterialControls(context);
    const materialRequests = await this.seedMaterialRequests(context, materialControls);
    const purchaseOrders = await this.seedPurchaseOrders(context, materialRequests);
    const deliveryAdvices = await this.seedDeliveryAdvices(context, purchaseOrders);
    await this.seedSupplierDeliveries(context, deliveryAdvices);
    await this.seedStockTransfers(context, materialRequests, purchaseOrders);
    await this.seedMaterialAdjustments(context);
    await this.seedDashboardTelemetry(context);
  }

  private async cleanupGeneratedWorkflow(context: SeedRunContext): Promise<void> {
    const seedLike = 'SEED-%';

    await context.client.query(
      `DELETE FROM supplier_delivery_advice
       WHERE supplier_delivery_id IN (
         SELECT supplier_delivery_id
         FROM supplier_delivery
         WHERE supplier_delivery_number LIKE $1
       )`,
      [seedLike]
    );

    await context.client.query(
      `DELETE FROM supplier_delivery_item
       WHERE supplier_delivery_id IN (
         SELECT supplier_delivery_id
         FROM supplier_delivery
         WHERE supplier_delivery_number LIKE $1
       )`,
      [seedLike]
    );

    await context.client.query(
      `DELETE FROM supplier_delivery
       WHERE supplier_delivery_number LIKE $1`,
      [seedLike]
    );

    await context.client.query(
      `DELETE FROM delivery_advice_item
       WHERE delivery_advice_id IN (
         SELECT delivery_advice_id
         FROM delivery_advice
         WHERE da_number LIKE $1 OR reference_code LIKE $1
       )`,
      [seedLike]
    );

    await context.client.query(
      `DELETE FROM delivery_advice
       WHERE da_number LIKE $1 OR reference_code LIKE $1`,
      [seedLike]
    );

    await context.client.query(
      `DELETE FROM stock_transfer_item
       WHERE stock_transfer_id IN (
         SELECT stock_transfer_id
         FROM stock_transfer
         WHERE stock_transfer_number LIKE $1
       )`,
      [seedLike]
    );

    await context.client.query(
      `DELETE FROM stock_transfer
       WHERE stock_transfer_number LIKE $1`,
      [seedLike]
    );

    await context.client.query(
      `DELETE FROM material_adjustment_item
       WHERE material_adjustment_id IN (
         SELECT material_adjustment_id
         FROM material_adjustment
         WHERE material_adjustment_number LIKE $1
       )`,
      [seedLike]
    );

    await context.client.query(
      `DELETE FROM material_adjustment
       WHERE material_adjustment_number LIKE $1`,
      [seedLike]
    );

    await context.client.query(
      `DELETE FROM purchase_order_item
       WHERE purchase_order_id IN (
         SELECT purchase_order_id
         FROM purchase_order
         WHERE po_number LIKE $1
       )`,
      [seedLike]
    );

    await context.client.query(
      `DELETE FROM purchase_order
       WHERE po_number LIKE $1`,
      [seedLike]
    );

    await context.client.query(
      `DELETE FROM material_request_item
       WHERE material_request_id IN (
         SELECT material_request_id
         FROM material_request
         WHERE mr_number LIKE $1
       )`,
      [seedLike]
    );

    await context.client.query(
      `DELETE FROM material_request
       WHERE mr_number LIKE $1`,
      [seedLike]
    );

    await context.client.query(
      `DELETE FROM material_control_item
       WHERE material_control_id IN (
         SELECT material_control_id
         FROM material_control
         WHERE control_code LIKE $1
       )`,
      [seedLike]
    );

    await context.client.query(
      `DELETE FROM material_control
       WHERE control_code LIKE $1`,
      [seedLike]
    );

    await context.client.query(
      `DELETE FROM stock_layer
       WHERE source_movement_id IN (
         SELECT stock_movement_id
         FROM stock_movement
         WHERE reference_code LIKE $1
       )`,
      [seedLike]
    );

    await context.client.query(
      `DELETE FROM stock_movement
       WHERE reference_code LIKE $1`,
      [seedLike]
    );

    await context.client.query(
      `DELETE FROM stock_balance
       WHERE party_id IN (
         SELECT party_id FROM party WHERE party_code LIKE $1
       )
         AND material_id IN (
           SELECT material_id FROM material WHERE product_code LIKE 'SEED-MAT-%'
         )`,
      ['SEED-%']
    );
  }

  private getBrandBackedMaterials(materials: ProductSeedRecord[]): ProductSeedRecord[] {
    return materials.filter((material) => material.materialBrandId !== null);
  }

  private async seedOpeningWarehouseStocks(context: SeedRunContext): Promise<void> {
    const movementTypeReceiptId = requireLookupId(context, 'stock_movement_type', 'receipt');
    const movementStatusCompletedId = requireLookupId(context, 'stock_movement_status', 'completed');

    const brandBacked = this.getBrandBackedMaterials(context.workflow.materials);
    const openingMaterialCount = Math.max(50, Math.min(brandBacked.length, 120));

    let createdMovements = 0;

    for (const warehouseId of context.workflow.warehouseIds) {
      const sourceSupplier = context.random.pick(context.workflow.supplierIds);
      const selectedMaterials = context.random.pickManyUnique(brandBacked, openingMaterialCount);

      for (const material of selectedMaterials) {
        const quantity = context.random.float(120, 780, 2);
        const referenceCode = `SEED-OPEN-${warehouseId}-${material.materialId}`;

        const movementResult = await context.client.query<{ stock_movement_id: number }>(
          `INSERT INTO stock_movement (
            source_id,
            destination_id,
            material_id,
            material_brand_id,
            quantity,
            uom_id,
            movement_type_id,
            status_id,
            movement_date,
            reference_code,
            notes,
            is_deleted,
            log_date_created,
            log_created_by_account_id,
            log_module_created
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            NOW() - ($9 || ' days')::interval,
            $10,
            'Opening stock for deterministic seed transfer flow',
            FALSE,
            NOW(),
            $11,
            'seed_mms'
          )
          RETURNING stock_movement_id`,
          [
            sourceSupplier,
            warehouseId,
            material.materialId,
            material.materialBrandId,
            quantity,
            material.uomId,
            movementTypeReceiptId,
            movementStatusCompletedId,
            context.random.int(30, 90),
            referenceCode,
            context.actorAccountId,
          ]
        );

        createdMovements += 1;

        await context.client.query(
          `INSERT INTO stock_balance (
            party_id,
            material_id,
            material_brand_id,
            quantity_on_hand,
            uom_id,
            is_deleted,
            log_date_created,
            log_created_by_account_id,
            log_module_created
          )
          VALUES ($1, $2, $3, $4, $5, FALSE, NOW(), $6, 'seed_mms')`,
          [warehouseId, material.materialId, material.materialBrandId, quantity, material.uomId, context.actorAccountId]
        );

        await context.client.query(
          `INSERT INTO stock_layer (
            party_id,
            material_id,
            material_brand_id,
            uom_id,
            quantity_received,
            quantity_available,
            receive_date,
            source_movement_id,
            is_deleted,
            log_date_created,
            log_created_by_account_id,
            log_module_created
          )
          VALUES (
            $1, $2, $3, $4, $5, $5,
            NOW() - ($6 || ' days')::interval,
            $7,
            FALSE,
            NOW(),
            $8,
            'seed_mms'
          )`,
          [warehouseId, material.materialId, material.materialBrandId, material.uomId, quantity, context.random.int(30, 90), movementResult.rows[0].stock_movement_id, context.actorAccountId]
        );
      }
    }

    pushSummary(context, {
      module: 'Opening Inventory',
      created: createdMovements,
      updated: 0,
      reused: 0,
      notes: 'Warehouse opening stock receipts seeded for stock transfer and inventory testing.',
    });
  }

  private async seedMaterialControls(context: SeedRunContext): Promise<number[]> {
    const statusId = requireLookupId(context, 'material_control_status', 'approved');

    const generatedControlIds: number[] = [];

    for (let i = 1; i <= context.config.counts.materialControls; i += 1) {
      const controlCode = formatSeedNumber('SEED-MC', i, 6);
      const projectId = context.workflow.projectIds[(i - 1) % context.workflow.projectIds.length];
      const budget = context.random.float(250000, 3200000, 2);

      const headerResult = await context.client.query<{ material_control_id: number }>(
        `INSERT INTO material_control (
          project_id,
          control_code,
          budget,
          total_estimated_cost,
          status_id,
          notes,
          is_deleted,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        )
        VALUES ($1, $2, $3, 0, $4, $5, FALSE, NOW(), $6, 'seed_mms')
        RETURNING material_control_id`,
        [
          projectId,
          controlCode,
          budget,
          statusId,
          `Seeded material control for project ${projectId}`,
          context.actorAccountId,
        ]
      );

      const materialControlId = headerResult.rows[0].material_control_id;
      generatedControlIds.push(materialControlId);

      const lineCount = context.random.int(4, 9);
      const selectedMaterials = context.random.pickManyUnique(context.workflow.materials, lineCount);

      let totalEstimatedCost = 0;
      for (let lineNo = 1; lineNo <= selectedMaterials.length; lineNo += 1) {
        const material = selectedMaterials[lineNo - 1];
        const estimatedQuantity = context.random.float(10, 300, 2);
        const estimatedUnitCost = context.random.float(80, 4200, 2);
        const estimatedTotalCost = Number((estimatedQuantity * estimatedUnitCost).toFixed(2));
        totalEstimatedCost += estimatedTotalCost;

        await context.client.query(
          `INSERT INTO material_control_item (
            material_control_id,
            material_id,
            estimated_quantity,
            uom_id,
            estimated_unit_cost,
            estimated_total_cost,
            remarks,
            line_no,
            is_deleted,
            log_date_created,
            log_created_by_account_id,
            log_module_created
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, NOW(), $9, 'seed_mms')`,
          [
            materialControlId,
            material.materialId,
            estimatedQuantity,
            material.uomId,
            estimatedUnitCost,
            estimatedTotalCost,
            'Initial project estimate',
            lineNo,
            context.actorAccountId,
          ]
        );
      }

      await context.client.query(
        `UPDATE material_control
         SET total_estimated_cost = $2,
             log_date_updated = NOW(),
             log_updated_by_account_id = $3,
             log_module_updated = 'seed_mms'
         WHERE material_control_id = $1`,
        [materialControlId, totalEstimatedCost, context.actorAccountId]
      );
    }

    pushSummary(context, {
      module: 'Material Control',
      created: context.config.counts.materialControls,
      updated: 0,
      reused: 0,
      notes: `Created ${context.config.counts.materialControls} controls with line-item estimates.`,
    });

    return generatedControlIds;
  }

  private async seedMaterialRequests(context: SeedRunContext, materialControlIds: number[]): Promise<MaterialRequestSeed[]> {
    const submittedId = requireLookupId(context, 'material_request_status', 'submitted');
    const approvedId = requireLookupId(context, 'material_request_status', 'approved');
    const completedId = requireLookupId(context, 'material_request_status', 'completed');

    const requests: MaterialRequestSeed[] = [];

    for (let i = 1; i <= context.config.counts.materialRequests; i += 1) {
      const mrNumber = formatSeedNumber('SEED-MR', i, 6);
      const projectId = context.workflow.projectIds[(i - 1) % context.workflow.projectIds.length];

      const statusId = i % 5 === 0 ? completedId : i % 3 === 0 ? submittedId : approvedId;
      const requestDateOffset = context.random.int(5, 85);
      const ceoApprovalRequired = context.random.bool(0.2);
      const ceoApproved = ceoApprovalRequired ? context.random.bool(0.85) : true;

      const headerResult = await context.client.query<{ material_request_id: number }>(
        `INSERT INTO material_request (
          mr_number,
          project_id,
          requested_by_account_id,
          requested_at,
          date_prepared,
          date_received,
          status_id,
          stock_checked,
          ceo_approval_required,
          ceo_approved,
          ceo_approved_by,
          ceo_approved_at,
          notes,
          is_deleted,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        )
        VALUES (
          $1,
          $2,
          $3,
          NOW() - make_interval(days => $4::int),
          NOW() - make_interval(days => ($4::int - 1)),
          NOW() - make_interval(days => ($4::int - 1)),
          $5,
          TRUE,
          $6::boolean,
          $7::boolean,
          CASE WHEN $7::boolean THEN $8::bigint ELSE NULL::bigint END,
          CASE WHEN $7::boolean THEN NOW() - make_interval(days => ($4::int - 2)) ELSE NULL END,
          $9,
          FALSE,
          NOW(),
          $3,
          'seed_mms'
        )
        RETURNING material_request_id`,
        [
          mrNumber,
          projectId,
          context.actorAccountId,
          requestDateOffset,
          statusId,
          ceoApprovalRequired,
          ceoApproved,
          context.actorAccountId,
          `Seed request generated from material control ${materialControlIds[(i - 1) % materialControlIds.length]}`,
        ]
      );

      const materialRequestId = headerResult.rows[0].material_request_id;
      const lineCount = context.random.int(3, 8);
      const selectedMaterials = context.random.pickManyUnique(context.workflow.materials, lineCount);
      const items: MaterialRequestItemSeed[] = [];

      for (const material of selectedMaterials) {
        const requestedQuantity = context.random.float(5, 180, 2);
        const approvedQuantity = Number((requestedQuantity * context.random.float(0.82, 1, 2)).toFixed(2));

        const itemResult = await context.client.query<{ material_request_item_id: number }>(
          `INSERT INTO material_request_item (
            material_request_id,
            material_id,
            requested_quantity,
            approved_quantity,
            estimated_quantity,
            area_usage,
            remarks,
            uom_id,
            notes,
            is_deleted,
            log_date_created,
            log_created_by_account_id,
            log_module_created
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, NOW(), $10, 'seed_mms')
          RETURNING material_request_item_id`,
          [
            materialRequestId,
            material.materialId,
            requestedQuantity,
            approvedQuantity,
            requestedQuantity,
            context.random.pick(['Site works', 'Structural concrete', 'MEPF installation', 'Finishing']),
            'Seeded request item',
            material.uomId,
            'For deterministic workflow testing',
            context.actorAccountId,
          ]
        );

        items.push({
          material_request_item_id: itemResult.rows[0].material_request_item_id,
          material_id: material.materialId,
          material_brand_id: material.materialBrandId,
          uom_id: material.uomId,
          approved_quantity: approvedQuantity,
        });
      }

      requests.push({
        material_request_id: materialRequestId,
        mr_number: mrNumber,
        project_id: projectId,
        items,
      });
    }

    pushSummary(context, {
      module: 'Material Request',
      created: requests.length,
      updated: 0,
      reused: 0,
      notes: 'Generated approved/submitted/completed requests with realistic line items.',
    });

    return requests;
  }

  private async seedPurchaseOrders(context: SeedRunContext, requests: MaterialRequestSeed[]): Promise<PurchaseOrderSeed[]> {
    const orderTypeId = requireLookupId(context, 'purchase_order_type', 'standard_purchase');
    const approvedStatusId = requireLookupId(context, 'purchase_order_status', 'approved');

    const eligibleRequests = requests.filter((request) => request.items.length > 0);
    const count = Math.min(context.config.counts.purchaseOrders, eligibleRequests.length);
    const selected = context.random.pickManyUnique(eligibleRequests, count);
    const purchaseOrders: PurchaseOrderSeed[] = [];

    for (let i = 1; i <= selected.length; i += 1) {
      const request = selected[i - 1];
      const supplierId = context.workflow.supplierIds[(i - 1) % context.workflow.supplierIds.length];
      const poNumber = formatSeedNumber('SEED-PO', i, 6);

      const itemSelection = context.random.pickManyUnique(
        request.items,
        Math.max(1, Math.min(request.items.length, context.random.int(2, 6)))
      );

      let totalAmount = 0;
      const poItems: PurchaseOrderItemSeed[] = [];

      const headerResult = await context.client.query<{ purchase_order_id: number }>(
        `INSERT INTO purchase_order (
          po_number,
          project_id,
          material_request_id,
          supplier_party_id,
          requested_by_account_id,
          prepared_at,
          expected_delivery_date,
          order_type_id,
          status_id,
          total_amount,
          notes,
          is_deleted,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          NOW() - ($6 || ' days')::interval,
          NOW() + ($7 || ' days')::interval,
          $8,
          $9,
          0,
          $10,
          FALSE,
          NOW(),
          $5,
          'seed_mms'
        )
        RETURNING purchase_order_id`,
        [
          poNumber,
          request.project_id,
          request.material_request_id,
          supplierId,
          context.actorAccountId,
          context.random.int(3, 45),
          context.random.int(2, 14),
          orderTypeId,
          approvedStatusId,
          `Seed PO from ${request.mr_number}`,
        ]
      );

      for (const requestItem of itemSelection) {
        const orderedQuantity = Number((requestItem.approved_quantity * context.random.float(1, 1.15, 2)).toFixed(2));
        const unitPrice = context.random.float(120, 5200, 2);
        const lineTotal = Number((orderedQuantity * unitPrice).toFixed(2));
        totalAmount += lineTotal;

        const poItemResult = await context.client.query<{ purchase_order_item_id: number }>(
          `INSERT INTO purchase_order_item (
            purchase_order_id,
            material_request_item_id,
            material_id,
            requested_quantity,
            ordered_quantity,
            received_quantity,
            uom_id,
            unit_price,
            line_total,
            supplier_reference,
            notes,
            is_deleted,
            log_date_created,
            log_created_by_account_id,
            log_module_created
          )
          VALUES (
            $1, $2, $3, $4, $5, 0, $6, $7, $8,
            $9,
            'PO line seeded for supplier delivery workflow',
            FALSE,
            NOW(),
            $10,
            'seed_mms'
          )
          RETURNING purchase_order_item_id`,
          [
            headerResult.rows[0].purchase_order_id,
            requestItem.material_request_item_id,
            requestItem.material_id,
            requestItem.approved_quantity,
            orderedQuantity,
            requestItem.uom_id,
            unitPrice,
            lineTotal,
            `${poNumber}-SUPREF-${context.random.int(1000, 9999)}`,
            context.actorAccountId,
          ]
        );

        poItems.push({
          purchase_order_item_id: poItemResult.rows[0].purchase_order_item_id,
          material_request_item_id: requestItem.material_request_item_id,
          material_id: requestItem.material_id,
          material_brand_id: requestItem.material_brand_id,
          uom_id: requestItem.uom_id,
          ordered_quantity: orderedQuantity,
        });
      }

      await context.client.query(
        `UPDATE purchase_order
         SET total_amount = $2,
             log_date_updated = NOW(),
             log_updated_by_account_id = $3,
             log_module_updated = 'seed_mms'
         WHERE purchase_order_id = $1`,
        [headerResult.rows[0].purchase_order_id, Number(totalAmount.toFixed(2)), context.actorAccountId]
      );

      purchaseOrders.push({
        purchase_order_id: headerResult.rows[0].purchase_order_id,
        po_number: poNumber,
        project_id: request.project_id,
        supplier_id: supplierId,
        material_request_id: request.material_request_id,
        items: poItems,
      });
    }

    pushSummary(context, {
      module: 'Purchase Order',
      created: purchaseOrders.length,
      updated: 0,
      reused: 0,
      notes: 'Purchase orders seeded in approved status for direct delivery posting.',
    });

    return purchaseOrders;
  }

  private async seedDeliveryAdvices(context: SeedRunContext, purchaseOrders: PurchaseOrderSeed[]): Promise<DeliveryAdviceSeed[]> {
    const completedStatusId = requireLookupId(context, 'delivery_advice_status', 'completed');

    const count = Math.min(context.config.counts.deliveryAdvices, Math.max(purchaseOrders.length, 1));
    const deliveryAdvices: DeliveryAdviceSeed[] = [];

    const remainingByPoItem = new Map<number, number>();
    for (const order of purchaseOrders) {
      for (const item of order.items) {
        remainingByPoItem.set(item.purchase_order_item_id, item.ordered_quantity);
      }
    }

    for (let i = 1; i <= count; i += 1) {
      const order = purchaseOrders[(i - 1) % purchaseOrders.length];
      const daNumber = formatSeedNumber('SEED-DA', i, 6);
      const referenceCode = `SEED-DAR-${String(i).padStart(6, '0')}`;

      const availableItems = order.items.filter((item) => (remainingByPoItem.get(item.purchase_order_item_id) ?? 0) > 0.01);
      if (availableItems.length === 0) {
        continue;
      }

      const selectedItems = context.random.pickManyUnique(
        availableItems,
        Math.max(1, Math.min(availableItems.length, context.random.int(1, 4)))
      );

      const headerResult = await context.client.query<{ delivery_advice_id: number }>(
        `INSERT INTO delivery_advice (
          purchase_order_id,
          da_number,
          reference_code,
          issued_at,
          received_at,
          status_id,
          notes,
          is_deleted,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        )
        VALUES (
          $1,
          $2,
          $3,
          NOW() - ($4 || ' days')::interval,
          NOW() - ($5 || ' days')::interval,
          $6,
          'Seed delivery advice linked to PO logistics planning',
          FALSE,
          NOW(),
          $7,
          'seed_mms'
        )
        RETURNING delivery_advice_id`,
        [
          order.purchase_order_id,
          daNumber,
          referenceCode,
          context.random.int(1, 28),
          context.random.int(0, 5),
          completedStatusId,
          context.actorAccountId,
        ]
      );

      const adviceItems: DeliveryAdviceItemPlan[] = [];
      for (const selectedItem of selectedItems) {
        const remaining = remainingByPoItem.get(selectedItem.purchase_order_item_id) ?? 0;
        const advisedQuantity = Number((remaining * context.random.float(0.35, 0.9, 2)).toFixed(2));
        const boundedAdvisedQuantity = Math.max(0.01, Math.min(remaining, advisedQuantity));

        await context.client.query(
          `INSERT INTO delivery_advice_item (
            delivery_advice_id,
            purchase_order_item_id,
            material_id,
            material_brand_id,
            uom_id,
            advised_quantity,
            received_quantity,
            notes,
            is_deleted,
            log_date_created,
            log_created_by_account_id,
            log_module_created
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            0,
            'Seed advised quantity',
            FALSE,
            NOW(),
            $7,
            'seed_mms'
          )`,
          [
            headerResult.rows[0].delivery_advice_id,
            selectedItem.purchase_order_item_id,
            selectedItem.material_id,
            selectedItem.material_brand_id,
            selectedItem.uom_id,
            boundedAdvisedQuantity,
            context.actorAccountId,
          ]
        );

        remainingByPoItem.set(selectedItem.purchase_order_item_id, Number((remaining - boundedAdvisedQuantity).toFixed(2)));

        adviceItems.push({
          purchase_order_item_id: selectedItem.purchase_order_item_id,
          material_id: selectedItem.material_id,
          material_brand_id: selectedItem.material_brand_id,
          uom_id: selectedItem.uom_id,
          advised_quantity: boundedAdvisedQuantity,
        });
      }

      deliveryAdvices.push({
        delivery_advice_id: headerResult.rows[0].delivery_advice_id,
        da_number: daNumber,
        purchase_order_id: order.purchase_order_id,
        supplier_id: order.supplier_id,
        project_id: order.project_id,
        items: adviceItems,
      });
    }

    pushSummary(context, {
      module: 'Delivery Advice',
      created: deliveryAdvices.length,
      updated: 0,
      reused: 0,
      notes: 'Delivery advice documents distributed across seeded purchase orders.',
    });

    return deliveryAdvices;
  }

  private async seedSupplierDeliveries(context: SeedRunContext, deliveryAdvices: DeliveryAdviceSeed[]): Promise<void> {
    const draftStatusId = requireLookupId(context, 'supplier_delivery_status', 'draft');

    const count = Math.min(context.config.counts.supplierDeliveries, deliveryAdvices.length);
    const selectedAdvices = context.random.pickManyUnique(deliveryAdvices, count);

    for (let i = 1; i <= selectedAdvices.length; i += 1) {
      const advice = selectedAdvices[i - 1];
      const supplierDeliveryNumber = formatSeedNumber('SEED-SD', i, 6);

      const headerResult = await context.client.query<{ supplier_delivery_id: number }>(
        `INSERT INTO supplier_delivery (
          supplier_delivery_number,
          purchase_order_id,
          supplier_id,
          project_id,
          received_by_account_id,
          delivery_date,
          status_id,
          reference_code,
          notes,
          is_deleted,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          NOW() - ($6 || ' days')::interval,
          $7,
          $8,
          'Supplier delivery seeded for posting function flow.',
          FALSE,
          NOW(),
          $5,
          'seed_mms'
        )
        RETURNING supplier_delivery_id`,
        [
          supplierDeliveryNumber,
          advice.purchase_order_id,
          advice.supplier_id,
          advice.project_id,
          context.actorAccountId,
          context.random.int(0, 20),
          draftStatusId,
          `SEED-SDREF-${String(i).padStart(6, '0')}`,
        ]
      );

      for (const adviceItem of advice.items) {
        const deliveredQuantity = adviceItem.advised_quantity;
        const rejectedQuantity = deliveredQuantity > 2 && context.random.bool(0.15)
          ? Number((deliveredQuantity * context.random.float(0.01, 0.05, 2)).toFixed(2))
          : 0;
        const acceptedQuantity = Number((deliveredQuantity - rejectedQuantity).toFixed(2));

        await context.client.query(
          `INSERT INTO supplier_delivery_item (
            supplier_delivery_id,
            purchase_order_item_id,
            material_id,
            material_brand_id,
            uom_id,
            delivered_quantity,
            accepted_quantity,
            rejected_quantity,
            notes,
            is_deleted,
            log_date_created,
            log_created_by_account_id,
            log_module_created
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            'Posted through seed flow using post_supplier_delivery function.',
            FALSE,
            NOW(),
            $9,
            'seed_mms'
          )`,
          [
            headerResult.rows[0].supplier_delivery_id,
            adviceItem.purchase_order_item_id,
            adviceItem.material_id,
            adviceItem.material_brand_id,
            adviceItem.uom_id,
            deliveredQuantity,
            acceptedQuantity,
            rejectedQuantity,
            context.actorAccountId,
          ]
        );
      }

      await context.client.query(
        `INSERT INTO supplier_delivery_advice (
          supplier_delivery_id,
          delivery_advice_id,
          notes,
          is_deleted,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        )
        VALUES ($1, $2, 'Seed supplier delivery advice link', FALSE, NOW(), $3, 'seed_mms')`,
        [headerResult.rows[0].supplier_delivery_id, advice.delivery_advice_id, context.actorAccountId]
      );

      await context.client.query(
        `SELECT post_supplier_delivery($1, $2)`,
        [headerResult.rows[0].supplier_delivery_id, context.actorAccountId]
      );
    }

    pushSummary(context, {
      module: 'Supplier Delivery',
      created: selectedAdvices.length,
      updated: 0,
      reused: 0,
      notes: 'Supplier deliveries posted to inventory using database posting function.',
    });
  }

  private async seedStockTransfers(
    context: SeedRunContext,
    requests: MaterialRequestSeed[],
    purchaseOrders: PurchaseOrderSeed[]
  ): Promise<void> {
    const transferTypeId = requireLookupId(context, 'stock_transfer_type', 'warehouse_transfer');
    const approvedStatusId = requireLookupId(context, 'stock_transfer_status', 'approved');

    const poRequestIdSet = new Set(
      purchaseOrders
        .map((order) => order.material_request_id)
        .filter((id): id is number => id !== null)
    );

    const transferEligibleRequests = requests.filter((request) => !poRequestIdSet.has(request.material_request_id));
    const count = Math.min(context.config.counts.stockTransfers, transferEligibleRequests.length);
    const selected = context.random.pickManyUnique(transferEligibleRequests, count);

    const balanceRows = await context.client.query<{
      party_id: number;
      material_id: number;
      material_brand_id: number | null;
      uom_id: number;
      quantity_on_hand: string;
    }>(
      `SELECT party_id, material_id, material_brand_id, uom_id, quantity_on_hand
       FROM stock_balance
       WHERE party_id = ANY($1::bigint[])
         AND quantity_on_hand > 0`,
      [context.workflow.warehouseIds]
    );

    const availableBalance = new Map<string, number>();
    for (const row of balanceRows.rows) {
      if (row.material_brand_id === null) {
        continue;
      }

      const key = `${row.party_id}:${row.material_id}:${row.material_brand_id}:${row.uom_id}`;
      availableBalance.set(key, Number(row.quantity_on_hand));
    }

    const brandBackedMaterialIds = new Set(
      this.getBrandBackedMaterials(context.workflow.materials).map((material) => material.materialId)
    );

    let createdTransferHeaders = 0;

    for (let i = 1; i <= selected.length; i += 1) {
      const request = selected[i - 1];
      const transferNumber = formatSeedNumber('SEED-ST', i, 6);
      const warehouseId = context.workflow.warehouseIds[(i - 1) % context.workflow.warehouseIds.length];

      const transferItems = request.items
        .filter((item) => item.material_brand_id !== null && brandBackedMaterialIds.has(item.material_id))
        .slice(0, context.random.int(1, Math.min(4, request.items.length)));

      if (transferItems.length === 0) {
        continue;
      }

      const headerResult = await context.client.query<{ stock_transfer_id: number }>(
        `INSERT INTO stock_transfer (
          stock_transfer_number,
          transfer_type_id,
          source_id,
          destination_id,
          project_id,
          material_request_id,
          prepared_by_account_id,
          transfer_date,
          status_id,
          reference_code,
          notes,
          is_deleted,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $4,
          $5,
          $6,
          NOW() - ($7 || ' days')::interval,
          $8,
          $9,
          'Seed transfer to fulfill project request from warehouse stock.',
          FALSE,
          NOW(),
          $6,
          'seed_mms'
        )
        RETURNING stock_transfer_id`,
        [
          transferNumber,
          transferTypeId,
          warehouseId,
          request.project_id,
          request.material_request_id,
          context.actorAccountId,
          context.random.int(0, 15),
          approvedStatusId,
          `SEED-STREF-${String(i).padStart(6, '0')}`,
        ]
      );

      let insertedItemCount = 0;
      for (const transferItem of transferItems) {
        if (transferItem.material_brand_id === null) {
          continue;
        }

        const balanceKey = `${warehouseId}:${transferItem.material_id}:${transferItem.material_brand_id}:${transferItem.uom_id}`;
        const currentAvailable = availableBalance.get(balanceKey) ?? 0;
        if (currentAvailable <= 0) {
          continue;
        }

        const desiredQuantity = Number((transferItem.approved_quantity * context.random.float(0.35, 0.85, 2)).toFixed(2));
        const movementQuantity = Number(Math.max(0, Math.min(currentAvailable, desiredQuantity)).toFixed(2));
        if (movementQuantity <= 0) {
          continue;
        }

        const movementResult = await context.client.query<{ stock_movement_consume: number }>(
          `SELECT stock_movement_consume(
            $1,
            $2,
            $3,
            $4,
            $5,
            'transfer',
            'completed',
            'fifo',
            $6,
            $7,
            $8
          )`,
          [
            warehouseId,
            request.project_id,
            transferItem.material_id,
            transferItem.uom_id,
            movementQuantity,
            transferNumber,
            'Seed warehouse to project transfer',
            transferItem.material_brand_id,
          ]
        );

        await context.client.query(
          `INSERT INTO stock_transfer_item (
            stock_transfer_id,
            stock_movement_id,
            material_request_item_id,
            material_id,
            material_brand_id,
            uom_id,
            quantity,
            notes,
            is_deleted,
            log_date_created,
            log_created_by_account_id,
            log_module_created
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            'Seed stock transfer item with consumed inventory movement.',
            FALSE,
            NOW(),
            $8,
            'seed_mms'
          )`,
          [
            headerResult.rows[0].stock_transfer_id,
            movementResult.rows[0].stock_movement_consume,
            transferItem.material_request_item_id,
            transferItem.material_id,
            transferItem.material_brand_id,
            transferItem.uom_id,
            movementQuantity,
            context.actorAccountId,
          ]
        );

        availableBalance.set(balanceKey, Number((currentAvailable - movementQuantity).toFixed(2)));
        insertedItemCount += 1;
      }

      if (insertedItemCount === 0) {
        await context.client.query(
          `DELETE FROM stock_transfer
           WHERE stock_transfer_id = $1`,
          [headerResult.rows[0].stock_transfer_id]
        );
        continue;
      }

      createdTransferHeaders += 1;
    }

    pushSummary(context, {
      module: 'Stock Transfer',
      created: createdTransferHeaders,
      updated: 0,
      reused: 0,
      notes: 'Warehouse transfer records posted through stock_movement_consume FIFO function.',
    });
  }

  private async seedMaterialAdjustments(context: SeedRunContext): Promise<void> {
    const pendingStatusId = requireLookupId(context, 'material_adjustment_status', 'pending');
    const approvedStatusId = requireLookupId(context, 'material_adjustment_status', 'approved');
    const completedStatusId = requireLookupId(context, 'material_adjustment_status', 'completed');
    const reasonLostId = requireLookupId(context, 'material_adjustment_reason', 'lost');
    const reasonDamagedId = requireLookupId(context, 'material_adjustment_reason', 'damaged');
    const reasonOtherId = requireLookupId(context, 'material_adjustment_reason', 'other');

    const projectStockRows = await context.client.query<{
      party_id: number;
      material_id: number;
      material_brand_id: number | null;
      uom_id: number;
      quantity_on_hand: string;
    }>(
      `SELECT sb.party_id, sb.material_id, sb.material_brand_id, sb.uom_id, sb.quantity_on_hand
       FROM stock_balance sb
       JOIN party p ON p.party_id = sb.party_id
       WHERE p.party_code LIKE 'SEED-PRJ-%'
         AND sb.quantity_on_hand > 0
       ORDER BY sb.party_id, sb.material_id`
    );

    if (projectStockRows.rowCount === 0) {
      pushSummary(context, {
        module: 'Material Adjustment',
        created: 0,
        updated: 0,
        reused: 0,
        notes: 'Skipped because no project stock records were available.',
      });
      return;
    }

    const count = Math.min(context.config.counts.materialAdjustments, projectStockRows.rowCount ?? 0);

    for (let i = 1; i <= count; i += 1) {
      const headerCode = formatSeedNumber('SEED-MA', i, 6);
      const stockRow = projectStockRows.rows[(i - 1) % projectStockRows.rows.length];
      const systemQty = Number(stockRow.quantity_on_hand);
      const adjustmentQty = Number((systemQty * context.random.float(-0.08, 0.06, 2)).toFixed(2));
      const resultingQty = Math.max(0, Number((systemQty + adjustmentQty).toFixed(2)));

      const statusId = i % 7 === 0 ? completedStatusId : i % 3 === 0 ? approvedStatusId : pendingStatusId;
      const reasonId = i % 4 === 0 ? reasonDamagedId : i % 3 === 0 ? reasonLostId : reasonOtherId;

      const headerResult = await context.client.query<{ material_adjustment_id: number }>(
        `INSERT INTO material_adjustment (
          material_adjustment_number,
          project_id,
          requested_by_account_id,
          requested_at,
          approved_by_account_id,
          approved_at,
          status_id,
          adjustment_reason_id,
          notes,
          is_deleted,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        )
        VALUES (
          $1,
          $2,
          $3,
          NOW() - ($4 || ' days')::interval,
          $5,
          CASE WHEN $6 THEN NOW() - ($4 || ' days')::interval + INTERVAL '2 hours' ELSE NULL END,
          $7,
          $8,
          'Seeded material adjustment for inventory reconciliation testing.',
          FALSE,
          NOW(),
          $3,
          'seed_mms'
        )
        RETURNING material_adjustment_id`,
        [
          headerCode,
          stockRow.party_id,
          context.actorAccountId,
          context.random.int(1, 22),
          statusId === pendingStatusId ? null : context.actorAccountId,
          statusId !== pendingStatusId,
          statusId,
          reasonId,
        ]
      );

      await context.client.query(
        `INSERT INTO material_adjustment_item (
          material_adjustment_id,
          material_id,
          material_brand_id,
          uom_id,
          system_quantity,
          adjustment_quantity,
          resulting_quantity,
          notes,
          is_deleted,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          'Deterministic seed adjustment line.',
          FALSE,
          NOW(),
          $8,
          'seed_mms'
        )`,
        [
          headerResult.rows[0].material_adjustment_id,
          stockRow.material_id,
          stockRow.material_brand_id,
          stockRow.uom_id,
          systemQty,
          adjustmentQty,
          resultingQty,
          context.actorAccountId,
        ]
      );
    }

    pushSummary(context, {
      module: 'Material Adjustment',
      created: count,
      updated: 0,
      reused: 0,
      notes: 'Material adjustment records seeded with reason/status combinations for reporting filters.',
    });
  }

  private async seedDashboardTelemetry(context: SeedRunContext): Promise<void> {
    await context.client.query(
      `DELETE FROM audit_log
       WHERE reference_code LIKE 'SEED-DASH-%'`
    );

    const operations = [
      { table: 'material_request', op: 'CREATE', notes: 'Seed dashboard activity for request creation', module: 'material_request' },
      { table: 'purchase_order', op: 'UPDATE', notes: 'Seed dashboard activity for PO updates', module: 'purchase_order' },
      { table: 'supplier_delivery', op: 'UPDATE', notes: 'Seed dashboard activity for delivery posting', module: 'supplier_delivery' },
      { table: 'stock_transfer', op: 'APPROVE', notes: 'Seed dashboard activity for transfer approvals', module: 'stock_transfer' },
      { table: 'material_adjustment', op: 'UPDATE', notes: 'Seed dashboard activity for adjustments', module: 'material_adjustment' },
      { table: 'auth', op: 'LOGIN_FAILED', notes: 'login failed for seeded account', module: 'auth' },
      { table: 'system', op: 'ERROR', notes: 'Synthetic error event for dashboard system error widget', module: 'system' },
    ] as const;

    const totalRows = Math.max(120, context.config.counts.materialRequests);

    for (let i = 1; i <= totalRows; i += 1) {
      const event = operations[(i - 1) % operations.length];
      const changedAtDays = context.random.int(0, 40);
      const changedAtHours = context.random.int(0, 23);

      await context.client.query(
        `INSERT INTO audit_log (
          entity_table,
          entity_id,
          operation,
          changed_by,
          changed_at,
          changes,
          reference_code,
          notes,
          transaction_id,
          is_deleted,
          log_module_created
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          NOW() - ($5 || ' days')::interval - ($6 || ' hours')::interval,
          $7::jsonb,
          $8,
          $9,
          NULL,
          FALSE,
          $10
        )`,
        [
          event.table,
          i,
          event.op,
          context.actorAccountId,
          changedAtDays,
          changedAtHours,
          JSON.stringify({ seed: true, ordinal: i, module: event.module }),
          `SEED-DASH-${String(i).padStart(6, '0')}`,
          event.notes,
          event.module,
        ]
      );
    }

    pushSummary(context, {
      module: 'Dashboard Telemetry',
      created: totalRows,
      updated: 0,
      reused: 0,
      notes: 'Seeded activity, failed login, and error telemetry for dashboard widgets.',
    });
  }
}
