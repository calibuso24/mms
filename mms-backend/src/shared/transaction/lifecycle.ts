import { ConflictError } from '../../utils/errors.js';

export interface TransactionLifecycleDefinition {
  moduleName: string;
  transitions: Record<string, readonly string[]>;
}

export class TransactionLifecycleManager {
  constructor(private readonly definition: TransactionLifecycleDefinition) {}

  getAllowedNextStatuses(currentStatusCode: string): readonly string[] {
    return this.definition.transitions[currentStatusCode] ?? [];
  }

  assertCanTransition(currentStatusCode: string, targetStatusCode: string): void {
    const allowed = this.getAllowedNextStatuses(currentStatusCode);
    if (!allowed.includes(targetStatusCode)) {
      throw new ConflictError(
        `Invalid ${this.definition.moduleName} status transition from ${currentStatusCode} to ${targetStatusCode}`
      );
    }
  }
}
