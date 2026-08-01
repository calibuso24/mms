import { randomUUID } from 'crypto';
import * as XLSX from 'xlsx';
import { pool } from '../config/database.js';
import { AuditLogRepository } from '../repositories/auditLog.js';
import { LookupRepository } from '../repositories/lookup.js';
import { PartyRepository } from '../repositories/party.js';
import { MaterialControlRepository } from '../repositories/materialControl.js';
import { MaterialControlItemRepository } from '../repositories/materialControlItem.js';
import {
  CreateMaterialControlDto,
  CreateMaterialControlItemDto,
  MaterialControlItemListQuery,
  MaterialControlListQuery,
  UpdateMaterialControlDto,
  UpdateMaterialControlItemDto,
} from '../modules/material_control/dtos.js';
import {
  MaterialControlItemListItemViewModel,
  MaterialControlItemListViewModel,
  MaterialControlListItemViewModel,
  MaterialControlListViewModel,
} from '../modules/material_control/viewModels.js';
import { MaterialControlItemValidator, MaterialControlValidator } from '../modules/material_control/validators.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';

const MODULE_NAME = 'material_control';
const PROJECT_LOOKUP_TYPE = 'party_type';
const PROJECT_LOOKUP_CODE = 'project';
const STATUS_LOOKUP_TYPE = 'material_control_status';
const TERMINAL_STATUS_CODES = new Set(['approved', 'rejected', 'cancelled', 'closed']);

interface MaterialControlImportRow {
  rowNumber: number;
  materialCode: string;
  materialDescription: string;
  category: string;
  subCategory: string;
  unitOfMeasure: string;
  quantity: string;
  remarks: string;
  validationErrors: string[];
  classification: 'existing' | 'missing' | 'duplicate' | 'invalid';
  matchedMaterialId?: number;
  matchedMaterialCode?: string;
  matchedMaterialName?: string;
  resolvedMaterialId?: number | null;
}

interface MaterialControlImportPreview {
  rows: MaterialControlImportRow[];
  summary: {
    existing: number;
    missing: number;
    duplicate: number;
    invalid: number;
  };
}

export class MaterialControlService {
  private repository = new MaterialControlRepository();
  private itemRepository = new MaterialControlItemRepository();
  private lookupRepository = new LookupRepository();
  private partyRepository = new PartyRepository();
  private auditLogRepository = new AuditLogRepository();

  async listMaterialControls(query: MaterialControlListQuery): Promise<MaterialControlListViewModel> {
    const result = await this.repository.findAllPaginated(query);
    return {
      items: result.rows.map((row) => this.mapRow(row)),
      total: result.total,
    };
  }

  async getMaterialControl(id: number): Promise<MaterialControlListItemViewModel> {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new NotFoundError('Material Control not found');
    }
    return this.mapRow(row);
  }

  async createMaterialControl(dto: CreateMaterialControlDto, createdByAccountId?: number): Promise<MaterialControlListItemViewModel> {
    MaterialControlValidator.validateCreate(dto);

    const project = await this.partyRepository.findById(dto.project_id);
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    await this.assertLookup(project.party_type_id, PROJECT_LOOKUP_TYPE, PROJECT_LOOKUP_CODE, 'project_id');
    const status = await this.requireLookup(dto.status_id, STATUS_LOOKUP_TYPE, 'status_id');

    const existing = await this.repository.findByControlCode(dto.control_code.trim());
    if (existing) {
      throw new ConflictError('Control code already exists');
    }

    const reviewFields = this.getReviewFields(status, createdByAccountId ?? null);
    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      const created = await this.repository.create(
        {
          project_id: dto.project_id,
          control_code: dto.control_code.trim(),
          budget: dto.budget,
          total_estimated_cost: dto.total_estimated_cost ?? null,
          status_id: dto.status_id,
          notes: dto.notes ?? null,
          reviewed_by_account_id: reviewFields.reviewed_by_account_id,
          log_date_reviewed: reviewFields.log_date_reviewed,
        },
        createdByAccountId ?? null,
        MODULE_NAME,
        client
      );

      await this.auditLogRepository.create(
        {
          entityTable: 'material_control',
          entityId: created.material_control_id,
          operation: 'CREATE',
          changedBy: createdByAccountId ?? null,
          changes: {
            project_id: dto.project_id,
            control_code: dto.control_code.trim(),
            budget: dto.budget,
            total_estimated_cost: dto.total_estimated_cost ?? null,
            status_id: dto.status_id,
          },
          transactionId,
          notes: 'Material Control created',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return created;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateMaterialControl(id: number, dto: UpdateMaterialControlDto, updatedByAccountId?: number): Promise<MaterialControlListItemViewModel> {
    MaterialControlValidator.validateUpdate(dto);

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Material Control not found');
    }

    if (dto.project_id !== undefined) {
      const project = await this.partyRepository.findById(dto.project_id);
      if (!project) {
        throw new NotFoundError('Project not found');
      }
      await this.assertLookup(project.party_type_id, PROJECT_LOOKUP_TYPE, PROJECT_LOOKUP_CODE, 'project_id');
    }

    let status = null as Awaited<ReturnType<typeof this.requireLookup>> | null;
    if (dto.status_id !== undefined) {
      status = await this.requireLookup(dto.status_id, STATUS_LOOKUP_TYPE, 'status_id');
    }

    if (dto.control_code !== undefined) {
      const duplicate = await this.repository.findByControlCode(dto.control_code.trim(), id);
      if (duplicate) {
        throw new ConflictError('Control code already exists');
      }
    }

    const reviewFields: {
      reviewed_by_account_id?: number | null;
      log_date_reviewed?: Date | null;
    } = status ? this.getReviewFields(status, updatedByAccountId ?? null) : {};
    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      const updated = await this.repository.update(
        id,
        {
          project_id: dto.project_id,
          control_code: dto.control_code?.trim(),
          budget: dto.budget,
          total_estimated_cost: dto.total_estimated_cost === undefined ? undefined : dto.total_estimated_cost,
          status_id: dto.status_id,
          notes: dto.notes,
          reviewed_by_account_id: reviewFields.reviewed_by_account_id,
          log_date_reviewed: reviewFields.log_date_reviewed,
        },
        updatedByAccountId ?? null,
        MODULE_NAME,
        client
      );

      await this.auditLogRepository.create(
        {
          entityTable: 'material_control',
          entityId: id,
          operation: 'UPDATE',
          changedBy: updatedByAccountId ?? null,
          changes: { ...dto },
          transactionId,
          notes: 'Material Control updated',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return updated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteMaterialControl(id: number, deletedByAccountId?: number): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Material Control not found');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.repository.softDelete(id, deletedByAccountId ?? null, MODULE_NAME, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'material_control',
          entityId: id,
          operation: 'DELETE',
          changedBy: deletedByAccountId ?? null,
          changes: {
            material_control_id: id,
            control_code: existing.control_code,
          },
          transactionId,
          notes: 'Material Control deleted',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listMaterialControlItems(query: MaterialControlItemListQuery): Promise<MaterialControlItemListViewModel> {
    const result = await this.itemRepository.findAllPaginated(query);
    return {
      items: result.rows.map((row) => this.mapItemRow(row)),
      total: result.total,
    };
  }

  async getMaterialControlItem(id: number): Promise<MaterialControlItemListItemViewModel> {
    const row = await this.itemRepository.findById(id);
    if (!row) {
      throw new NotFoundError('Material Control Item not found');
    }
    return this.mapItemRow(row);
  }

  async createMaterialControlItem(dto: CreateMaterialControlItemDto, createdByAccountId?: number): Promise<MaterialControlItemListItemViewModel> {
    MaterialControlItemValidator.validateCreate(dto);

    const control = await this.repository.findById(dto.material_control_id);
    if (!control) {
      throw new NotFoundError('Material Control not found');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      const created = await this.itemRepository.create(
        {
          material_control_id: dto.material_control_id,
          material_id: dto.material_id,
          estimated_quantity: dto.estimated_quantity,
          uom_id: dto.uom_id,
          estimated_unit_cost: dto.estimated_unit_cost ?? null,
          estimated_total_cost: dto.estimated_total_cost ?? null,
          remarks: dto.remarks ?? null,
          line_no: dto.line_no,
        },
        createdByAccountId ?? null,
        MODULE_NAME,
        client
      );

      await this.auditLogRepository.create(
        {
          entityTable: 'material_control_item',
          entityId: created.material_control_item_id,
          operation: 'CREATE',
          changedBy: createdByAccountId ?? null,
          changes: {
            material_control_id: dto.material_control_id,
            material_id: dto.material_id,
            estimated_quantity: dto.estimated_quantity,
            uom_id: dto.uom_id,
            line_no: dto.line_no,
          },
          transactionId,
          notes: 'Material Control Item created',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return created;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateMaterialControlItem(id: number, dto: UpdateMaterialControlItemDto, updatedByAccountId?: number): Promise<MaterialControlItemListItemViewModel> {
    MaterialControlItemValidator.validateUpdate(dto);

    const existing = await this.itemRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Material Control Item not found');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      const updated = await this.itemRepository.update(
        id,
        {
          material_control_id: dto.material_control_id,
          material_id: dto.material_id,
          estimated_quantity: dto.estimated_quantity,
          uom_id: dto.uom_id,
          estimated_unit_cost: dto.estimated_unit_cost,
          estimated_total_cost: dto.estimated_total_cost,
          remarks: dto.remarks,
          line_no: dto.line_no,
        },
        updatedByAccountId ?? null,
        MODULE_NAME,
        client
      );

      await this.auditLogRepository.create(
        {
          entityTable: 'material_control_item',
          entityId: id,
          operation: 'UPDATE',
          changedBy: updatedByAccountId ?? null,
          changes: { ...dto },
          transactionId,
          notes: 'Material Control Item updated',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return updated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteMaterialControlItem(id: number, deletedByAccountId?: number): Promise<void> {
    const existing = await this.itemRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Material Control Item not found');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.itemRepository.softDelete(id, deletedByAccountId ?? null, MODULE_NAME, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'material_control_item',
          entityId: id,
          operation: 'DELETE',
          changedBy: deletedByAccountId ?? null,
          changes: {
            material_control_item_id: id,
            material_control_id: existing.material_control_id,
            material_id: existing.material_id,
          },
          transactionId,
          notes: 'Material Control Item deleted',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async previewImport(fileBuffer: Buffer, originalName: string): Promise<MaterialControlImportPreview> {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Array<Record<string, unknown>>;

    if (!rows.length) {
      throw new ValidationError('The uploaded file does not contain any rows');
    }

    const expectedHeaders = ['Material Code', 'Material Description', 'Category', 'Sub Category', 'Unit of Measure', 'Quantity', 'Remarks'];
    const headerRow = rows[0] as Record<string, unknown>;
    const actualHeaders = Object.keys(headerRow).map((key) => key.trim());
    const missingHeaders = expectedHeaders.filter((header) => !actualHeaders.includes(header));

    if (missingHeaders.length > 0) {
      throw new ValidationError(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    const normalizedRows: MaterialControlImportRow[] = [];
    const seenKeys = new Set<string>();
    const existingMaterials = await this.loadExistingMaterials();

    for (let index = 1; index < rows.length; index += 1) {
      const row = rows[index] as Record<string, unknown>;
      const materialCode = String(row['Material Code'] ?? '').trim();
      const materialDescription = String(row['Material Description'] ?? '').trim();
      const category = String(row['Category'] ?? '').trim();
      const subCategory = String(row['Sub Category'] ?? '').trim();
      const unitOfMeasure = String(row['Unit of Measure'] ?? '').trim();
      const quantity = String(row['Quantity'] ?? '').trim();
      const remarks = String(row['Remarks'] ?? '').trim();

      const validationErrors: string[] = [];
      if (!materialCode) validationErrors.push('Material Code is required');
      if (!materialDescription) validationErrors.push('Material Description is required');
      if (!unitOfMeasure) validationErrors.push('Unit of Measure is required');
      if (!quantity) validationErrors.push('Quantity is required');
      const parsedQuantity = Number(quantity);
      if (quantity && (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0)) {
        validationErrors.push('Quantity must be a positive number');
      }

      const duplicateKey = [materialCode, materialDescription, unitOfMeasure].join('|').toLowerCase();
      const isDuplicateInUpload = seenKeys.has(duplicateKey);
      seenKeys.add(duplicateKey);

      let classification: MaterialControlImportRow['classification'] = 'missing';
      let matchedMaterialId: number | undefined;
      let matchedMaterialCode: string | undefined;
      let matchedMaterialName: string | undefined;
      let resolvedMaterialId: number | null | undefined = null;

      if (validationErrors.length > 0) {
        classification = 'invalid';
      } else if (isDuplicateInUpload) {
        classification = 'duplicate';
      } else {
        const existingMatch = this.findExistingMaterial(existingMaterials, {
          materialCode,
          materialDescription,
          unitOfMeasure,
          category,
          subCategory,
        });

        if (existingMatch) {
          classification = 'existing';
          matchedMaterialId = Number(existingMatch.material_id);
          matchedMaterialCode = String(existingMatch.product_code ?? '');
          matchedMaterialName = String(existingMatch.product_name ?? '');
          resolvedMaterialId = Number(existingMatch.material_id);
        }
      }

      normalizedRows.push({
        rowNumber: index + 1,
        materialCode,
        materialDescription,
        category,
        subCategory,
        unitOfMeasure,
        quantity,
        remarks,
        validationErrors,
        classification,
        matchedMaterialId,
        matchedMaterialCode,
        matchedMaterialName,
        resolvedMaterialId,
      });
    }

    return {
      rows: normalizedRows,
      summary: {
        existing: normalizedRows.filter((row) => row.classification === 'existing').length,
        missing: normalizedRows.filter((row) => row.classification === 'missing').length,
        duplicate: normalizedRows.filter((row) => row.classification === 'duplicate').length,
        invalid: normalizedRows.filter((row) => row.classification === 'invalid').length,
      },
    };
  }

  async importMaterialControlItems(materialControlId: number, previewRows: MaterialControlImportRow[], actorAccountId?: number): Promise<{ imported: number }> {
    const validRows = previewRows.filter((row) => row.classification === 'existing' || (row.classification === 'missing' && row.resolvedMaterialId));
    if (validRows.length === 0) {
      throw new ValidationError('No importable rows were resolved');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      let imported = 0;
      for (const row of validRows) {
        const materialId = row.resolvedMaterialId ?? row.matchedMaterialId;
        if (!materialId) {
          continue;
        }

        await this.itemRepository.create(
          {
            material_control_id: materialControlId,
            material_id: materialId,
            estimated_quantity: Number(row.quantity),
            uom_id: await this.resolveUomId(row.unitOfMeasure),
            estimated_unit_cost: null,
            estimated_total_cost: null,
            remarks: row.remarks || null,
            line_no: imported + 1,
          },
          actorAccountId ?? null,
          'material_control_item_import',
          client
        );
        imported += 1;
      }

      await this.auditLogRepository.create(
        {
          entityTable: 'material_control_item',
          entityId: materialControlId,
          operation: 'IMPORT',
          changedBy: actorAccountId ?? null,
          changes: { importedCount: imported, materialControlId, previewRows: validRows.length },
          transactionId,
          notes: 'Material Control items imported',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return { imported };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  buildTemplate(format: 'xlsx' | 'csv' = 'xlsx') {
    const rows = [
      ['Material Code', 'Material Description', 'Category', 'Sub Category', 'Unit of Measure', 'Quantity', 'Remarks'],
      ['MAT-001', 'Cement 42.5R', 'Building Materials', 'Cement', 'Bag', '10', 'Sample row'],
      ['MAT-002', 'Steel Rebar 12mm', 'Steel', 'Rebar', 'Ton', '2', 'Sample row'],
    ];

    if (format === 'csv') {
      const csv = rows.map((row) => row.join(',')).join('\n');
      return Buffer.from(csv, 'utf8');
    }

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Material Control Items');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  private async loadExistingMaterials() {
    const result = await pool.query(`
      SELECT
        m.material_id,
        m.product_code,
        m.product_name,
        u.uom_name,
        u.abbreviation AS uom_abbreviation
      FROM material m
      LEFT JOIN unit_of_measure u ON u.uom_id = m.stock_uom_id AND u.is_deleted = false
      WHERE m.is_deleted = false
    `);
    return result.rows;
  }

  private findExistingMaterial(existingMaterials: Array<Record<string, unknown>>, row: {
    materialCode: string;
    materialDescription: string;
    unitOfMeasure: string;
    category: string;
    subCategory: string;
  }) {
    const normalizedCode = row.materialCode.trim().toLowerCase();
    const normalizedDescription = row.materialDescription.trim().toLowerCase();
    const normalizedUom = row.unitOfMeasure.trim().toLowerCase();

    return existingMaterials.find((material) => {
      const code = String(material.product_code ?? '').trim().toLowerCase();
      const name = String(material.product_name ?? '').trim().toLowerCase();
      const uom = String(material.uom_name ?? '').trim().toLowerCase();
      const abbreviation = String(material.uom_abbreviation ?? '').trim().toLowerCase();

      if (normalizedCode && code && normalizedCode === code) return true;
      if (normalizedDescription && name && normalizedDescription === name) return true;
      if (normalizedUom && (uom === normalizedUom || abbreviation === normalizedUom)) return true;
      return false;
    });
  }

  private async resolveUomId(unitOfMeasure: string): Promise<number> {
    const result = await pool.query(
      `SELECT uom_id FROM unit_of_measure WHERE (uom_name ILIKE $1 OR abbreviation ILIKE $1) AND is_deleted = false LIMIT 1`,
      [unitOfMeasure.trim()]
    );

    if (!result.rows[0]) {
      throw new ValidationError(`Unit of measure '${unitOfMeasure}' was not found`);
    }

    return Number(result.rows[0].uom_id);
  }

  private mapRow(row: any): MaterialControlListItemViewModel {
    return {
      material_control_id: row.material_control_id,
      project_id: row.project_id,
      project_code: row.project_code,
      project_name: row.project_name,
      control_code: row.control_code,
      budget: row.budget,
      total_estimated_cost: row.total_estimated_cost ?? null,
      status_id: row.status_id,
      status_name: row.status_name,
      notes: row.notes ?? null,
      reviewed_by_account_id: row.reviewed_by_account_id ?? null,
      reviewed_by_account_name: row.reviewed_by_account_name ?? null,
      log_date_reviewed: row.log_date_reviewed ?? null,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
    };
  }

  private mapItemRow(row: any): MaterialControlItemListItemViewModel {
    return {
      material_control_item_id: row.material_control_item_id,
      material_control_id: row.material_control_id,
      material_id: row.material_id,
      material_code: row.material_code,
      material_name: row.material_name,
      estimated_quantity: row.estimated_quantity,
      uom_id: row.uom_id,
      uom_name: row.uom_name,
      uom_abbreviation: row.uom_abbreviation,
      estimated_unit_cost: row.estimated_unit_cost ?? null,
      estimated_total_cost: row.estimated_total_cost ?? null,
      remarks: row.remarks ?? null,
      line_no: row.line_no,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
    };
  }

  private async requireLookup(id: number, type: string, fieldName: string) {
    const lookup = await this.lookupRepository.findById(id);
    if (!lookup || lookup.look_up_type !== type) {
      throw new ValidationError(`${fieldName} is invalid`);
    }
    return lookup;
  }

  private async assertLookup(id: number, type: string, code: string, fieldName: string) {
    const lookup = await this.lookupRepository.findById(id);
    if (!lookup || lookup.look_up_type !== type || lookup.code !== code) {
      throw new ValidationError(`${fieldName} must reference a ${code}`);
    }
  }

  private getReviewFields(status: { code: string }, actorAccountId: number | null) {
    if (!TERMINAL_STATUS_CODES.has(status.code)) {
      return {
        reviewed_by_account_id: undefined,
        log_date_reviewed: undefined,
      };
    }

    return {
      reviewed_by_account_id: actorAccountId,
      log_date_reviewed: new Date(),
    };
  }
}