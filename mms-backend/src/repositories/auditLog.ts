import { PoolClient } from 'pg';
import { pool } from '../config/database.js';

interface CreateAuditLogInput {
  entityTable: string;
  entityId?: number | null;
  operation: string;
  changedBy?: number | null;
  changes?: Record<string, unknown> | null;
  referenceCode?: string | null;
  notes?: string | null;
  transactionId?: string | null;
  moduleName?: string;
}

export class AuditLogRepository {
  async create(input: CreateAuditLogInput, client?: PoolClient): Promise<void> {
    const executor = client ?? pool;
    await executor.query(
      `INSERT INTO audit_log (
        entity_table,
        entity_id,
        operation,
        changed_by,
        changes,
        reference_code,
        notes,
        transaction_id,
        log_module_created
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)`,
      [
        input.entityTable,
        input.entityId ?? null,
        input.operation,
        input.changedBy ?? null,
        input.changes ? JSON.stringify(input.changes) : null,
        input.referenceCode ?? null,
        input.notes ?? null,
        input.transactionId ?? null,
        input.moduleName ?? 'manage_users',
      ]
    );
  }
}
