import test from 'node:test';
import assert from 'node:assert/strict';
import { MaterialControlItemValidator } from './validators.js';

test('valid material control item payload passes validation', () => {
  assert.doesNotThrow(() => MaterialControlItemValidator.validateCreate({
    material_control_id: 1,
    material_id: 2,
    estimated_quantity: 10,
    uom_id: 3,
    estimated_unit_cost: 2.5,
    estimated_total_cost: 25,
    remarks: 'Sample',
    line_no: 1,
  }));
});

test('invalid material control item payload throws validation error', () => {
  assert.throws(() => MaterialControlItemValidator.validateCreate({
    material_control_id: 0,
    material_id: 0,
    estimated_quantity: -1,
    uom_id: 0,
    estimated_unit_cost: -1,
    estimated_total_cost: -1,
    remarks: 'x'.repeat(3000),
    line_no: 0,
  }), /required|positive|non-negative|too long/);
});
