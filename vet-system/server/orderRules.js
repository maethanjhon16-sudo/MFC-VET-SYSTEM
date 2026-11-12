const ORDER_STATUSES = new Set(['new', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']);

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
