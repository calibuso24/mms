import { ConflictError, ValidationError } from '../../utils/errors.js';

function parseTimestamp(value: string, fieldName: string): number {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new ValidationError(`${fieldName} must be a valid ISO timestamp`);
  }
  return parsed;
}

export function assertOptimisticConcurrency(
  entityName: string,
  expectedUpdatedAt: string | null | undefined,
  actualUpdatedAt: string | null | undefined
): void {
  if (expectedUpdatedAt === undefined || expectedUpdatedAt === null || expectedUpdatedAt === '') {
    return;
  }

  if (!actualUpdatedAt) {
    throw new ConflictError(`${entityName} changed since it was opened. Refresh and try again.`);
  }

  const expectedMs = parseTimestamp(expectedUpdatedAt, 'expected_updated_at');
  const actualMs = parseTimestamp(String(actualUpdatedAt), 'updated_at');

  if (expectedMs === actualMs) {
    return;
  }

  // Accept second-level equality to avoid false conflicts caused by precision/representation differences.
  if (Math.trunc(expectedMs / 1000) === Math.trunc(actualMs / 1000)) {
    return;
  }

  throw new ConflictError(`${entityName} was updated by another user. Refresh and try again.`);
}
