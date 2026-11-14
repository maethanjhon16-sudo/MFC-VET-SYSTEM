import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionOrderStatus, getInventoryShortages } from './orderRules.js';

test('aggregates cart sizes before checking product stock', () => {
  const items = [
    { productId: 'dog-food', quantity: 3 },
    { productId: 'dog-food', quantity: 2 },
    { productId: 'cat-food', quantity: 1 },
  ];
  const inventory = [
    { product_id: 'dog-food', quantity: 4 },
    { product_id: 'cat-food', quantity: 1 },
  ];

  assert.deepEqual(getInventoryShortages(items, inventory), [
    { productId: 'dog-food', available: 4, requested: 5 },
  ]);
});

test('treats products without an inventory row as unavailable', () => {
  assert.deepEqual(getInventoryShortages([{ productId: 'missing', quantity: 1 }], []), [
    { productId: 'missing', available: 0, requested: 1 },
  ]);
});

test('requires a pending order to be confirmed before preparation', () => {
  assert.equal(canTransitionOrderStatus('pending', 'confirmed', 'clinic_pickup'), true);
  assert.equal(canTransitionOrderStatus('pending', 'cancelled', 'delivery'), true);
  assert.equal(canTransitionOrderStatus('pending', 'preparing', 'clinic_pickup'), false);
});

test('uses fulfillment method to choose the correct ready status and completion', () => {
  assert.equal(canTransitionOrderStatus('confirmed', 'preparing', 'clinic_pickup'), true);
  assert.equal(canTransitionOrderStatus('preparing', 'ready_for_pickup', 'clinic_pickup'), true);
  assert.equal(canTransitionOrderStatus('preparing', 'out_for_delivery', 'delivery'), true);
  assert.equal(canTransitionOrderStatus('preparing', 'out_for_delivery', 'clinic_pickup'), false);
  assert.equal(canTransitionOrderStatus('ready_for_pickup', 'completed', 'clinic_pickup'), true);
  assert.equal(canTransitionOrderStatus('out_for_delivery', 'completed', 'delivery'), true);
});

test('prevents transitions from terminal statuses', () => {
  assert.equal(canTransitionOrderStatus('completed', 'cancelled', 'delivery'), false);
  assert.equal(canTransitionOrderStatus('cancelled', 'preparing', 'clinic_pickup'), false);
  assert.equal(canTransitionOrderStatus('unknown', 'preparing', 'delivery'), false);
  assert.equal(canTransitionOrderStatus('preparing', 'completed', 'unknown'), false);
});
