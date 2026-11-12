import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionOrderStatus } from './orderRules.js';

test('allows an order to enter preparation or be cancelled when new', () => {
  assert.equal(canTransitionOrderStatus('new', 'preparing', 'clinic_pickup'), true);
  assert.equal(canTransitionOrderStatus('new', 'cancelled', 'delivery'), true);
  assert.equal(canTransitionOrderStatus('new', 'delivered', 'clinic_pickup'), false);
});

test('uses fulfillment method to choose the next preparing status', () => {
  assert.equal(canTransitionOrderStatus('preparing', 'delivered', 'clinic_pickup'), true);
  assert.equal(canTransitionOrderStatus('preparing', 'out_for_delivery', 'delivery'), true);
  assert.equal(canTransitionOrderStatus('preparing', 'out_for_delivery', 'clinic_pickup'), false);
});

test('prevents transitions from terminal statuses', () => {
  assert.equal(canTransitionOrderStatus('out_for_delivery', 'delivered', 'delivery'), true);
  assert.equal(canTransitionOrderStatus('delivered', 'cancelled', 'delivery'), false);
  assert.equal(canTransitionOrderStatus('cancelled', 'preparing', 'clinic_pickup'), false);
  assert.equal(canTransitionOrderStatus('unknown', 'preparing', 'delivery'), false);
  assert.equal(canTransitionOrderStatus('preparing', 'delivered', 'unknown'), false);
});
