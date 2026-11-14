const ORDER_STATUSES = new Set([
  'pending',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'completed',
  'cancelled',
]);

export function getInventoryShortages(items, inventory) {
  const requested = new Map();
  for (const item of items) {
    requested.set(item.productId, (requested.get(item.productId) ?? 0) + item.quantity);
  }
  const availableByProduct = new Map(inventory.map((item) => [item.product_id, item.quantity]));
  return [...requested].flatMap(([productId, quantity]) => {
    const available = availableByProduct.get(productId) ?? 0;
    return available < quantity ? [{ productId, available, requested: quantity }] : [];
  });
}

export function canTransitionOrderStatus(currentStatus, nextStatus, fulfillmentMethod) {
  if (!ORDER_STATUSES.has(currentStatus) || !ORDER_STATUSES.has(nextStatus)) return false;
  if (!['clinic_pickup', 'delivery'].includes(fulfillmentMethod)) return false;

  const transitions = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: fulfillmentMethod === 'delivery'
      ? ['out_for_delivery', 'cancelled']
      : ['ready_for_pickup', 'cancelled'],
    ready_for_pickup: ['completed'],
    out_for_delivery: ['completed'],
    completed: [],
    cancelled: [],
  };
  return transitions[currentStatus].includes(nextStatus);
}
