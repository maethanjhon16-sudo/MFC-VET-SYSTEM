const ORDER_STATUSES = new Set(['new', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']);

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
    new: ['preparing', 'cancelled'],
    preparing: fulfillmentMethod === 'delivery'
      ? ['out_for_delivery', 'cancelled']
      : ['delivered', 'cancelled'],
    out_for_delivery: ['delivered'],
    delivered: [],
    cancelled: [],
  };
  return transitions[currentStatus].includes(nextStatus);
}
