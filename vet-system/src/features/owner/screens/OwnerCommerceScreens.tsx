import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { createOwnerOrder, getOwnerOrders, getOwnerProfile, type OwnerOrder } from '../../auth/api';
import { getProduct } from '../data';
import { formatPeso, type CartLine, type OwnerNav } from '../types';
import s from './Screens.module.css';

function commerceError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function orderDate(value: string): string {
  return new Date(value).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function OwnerCart({
  cart,
  onQuantity,
  onRemove,
  onClear,
  onContinueShopping,
  onOrderPlaced,
  stockLevels,
  inventoryReady,
  inventoryError,
}: {
  cart: CartLine[];
  onQuantity: (line: CartLine, quantity: number) => void;
  onRemove: (line: CartLine) => void;
  onClear: () => void;
  onContinueShopping: () => void;
  onOrderPlaced: () => void;
  stockLevels: Record<string, number>;
  inventoryReady: boolean;
  inventoryError: string | null;
}) {
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'clinic_pickup' | 'delivery'>('clinic_pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getOwnerProfile().then(({ profile }) => {
      if (!active) return;
      setContactPhone(profile.phone);
      setDeliveryAddress([profile.barangay, profile.city, profile.province].filter(Boolean).join(', '));
    }).catch((profileError: unknown) => {
      if (active) setError(commerceError(profileError, 'Could not load your saved contact details.'));
    });
    return () => { active = false; };
  }, []);

  const total = useMemo(() => cart.reduce((sum, line) => {
    const product = getProduct(line.productId);
    return sum + Math.round(product.price * (product.sizes[line.sizeIndex]?.multiplier ?? 1)) * line.qty;
  }, 0), [cart]);
  const stockWarnings = useMemo(() => {
    if (cart.length === 0) return [];
    if (!inventoryReady) return ['Current product stock is not available yet.'];
    const requested = new Map<string, number>();
    for (const line of cart) requested.set(line.productId, (requested.get(line.productId) ?? 0) + line.qty);
    return [...requested].flatMap(([productId, quantity]) => {
      const available = stockLevels[productId] ?? 0;
      return available < quantity
        ? [`${getProduct(productId).name}: ${available} available, ${quantity} in your cart.`]
        : [];
    });
  }, [cart, inventoryReady, stockLevels]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (cart.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await createOwnerOrder({
        items: cart.map((line) => ({
          productId: line.productId,
          sizeIndex: line.sizeIndex,
          quantity: line.qty,
        })),
        fulfillmentMethod,
        deliveryAddress: fulfillmentMethod === 'delivery' ? deliveryAddress.trim() : '',
        contactPhone: contactPhone.trim(),
      });
      onClear();
      onOrderPlaced();
    } catch (submitError) {
      setError(commerceError(submitError, 'Could not place your order request.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={s.stack}>
      <header className={s.pageHeader}>
        <div className={s.title}>
          <span className={s.eyebrow}>SHOPPING BAG</span>
          <h1>Your cart</h1>
          <p>Review items and send an order request to the clinic.</p>
        </div>
        <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={onContinueShopping}>Continue shopping</button>
      </header>
      {error && <p className={s.pageError} role="alert">{error}</p>}
      {stockWarnings.length > 0 && <p className={s.pageError} role="alert">
        {inventoryError ?? `Please update your cart before checkout. ${stockWarnings.join(' ')}`}
      </p>}
      {cart.length === 0 ? (
        <section className={`${s.card} ${s.emptyCard}`}>
          <h2>Your cart is empty</h2>
          <p>Explore food, grooming, and wellness products selected for pets.</p>
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={onContinueShopping}>Browse the shop</button>
        </section>
      ) : (
        <div className={s.checkoutLayout}>
          <section className={`${s.card} ${s.cartItems}`}>
            <div className={s.sectionTitle}><h2>Items ({cart.reduce((sum, line) => sum + line.qty, 0)})</h2><button type="button" onClick={onClear}>Clear cart</button></div>
            {cart.map((line) => {
              const product = getProduct(line.productId);
              const size = product.sizes[line.sizeIndex];
              const unitPrice = Math.round(product.price * (size?.multiplier ?? 1));
              const otherVariantQuantity = cart
                .filter((other) => other.productId === line.productId && other.sizeIndex !== line.sizeIndex)
                .reduce((sum, other) => sum + other.qty, 0);
              const maxLineQuantity = Math.max(0, (stockLevels[line.productId] ?? 0) - otherVariantQuantity);
              return (
                <article className={s.cartItem} key={`${line.productId}-${line.sizeIndex}`}>
                  <div className={s.cartProductImage} aria-hidden="true">{product.emoji}</div>
                  <div className={s.cartProductInfo}>
                    <h3>{product.name}</h3>
                    {size && product.sizes.length > 1 && <small>Size: {size.label}</small>}
                    <b>{formatPeso(unitPrice)}</b>
                  </div>
                  <div className={s.cartItemActions}>
                    <div className={s.stepper} role="group" aria-label={`Quantity of ${product.name}`}>
                      <button type="button" aria-label="Decrease quantity" disabled={line.qty <= 1} onClick={() => onQuantity(line, line.qty - 1)}>−</button>
                      <b>{line.qty}</b>
                      <button type="button" aria-label="Increase quantity" disabled={!inventoryReady || line.qty >= Math.min(20, maxLineQuantity)} onClick={() => onQuantity(line, line.qty + 1)}>＋</button>
                    </div>
                    <button type="button" className={s.removeItem} onClick={() => onRemove(line)}>Remove</button>
                  </div>
                  <strong className={s.cartLineTotal}>{formatPeso(unitPrice * line.qty)}</strong>
                </article>
              );
            })}
          </section>
          <form className={`${s.card} ${s.checkoutCard}`} onSubmit={(event) => void submit(event)}>
            <h2>Order details</h2>
            <label>How would you like to receive your order?
              <select value={fulfillmentMethod} onChange={(event) => setFulfillmentMethod(event.target.value as 'clinic_pickup' | 'delivery')}>
                <option value="clinic_pickup">Pick up at the clinic · Pay at pickup</option>
                <option value="delivery">Delivery · Cash on delivery</option>
              </select>
            </label>
            {fulfillmentMethod === 'delivery' && (
              <label>Delivery address
                <textarea value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} maxLength={500} rows={3} required placeholder="House number, street, barangay, city" />
              </label>
            )}
            <label>Contact phone
              <input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} maxLength={32} required placeholder="Your contact number" />
            </label>
            <div className={s.orderTotals}>
              <span>Items subtotal <b>{formatPeso(total)}</b></span>
              <span>Delivery fee <b>{fulfillmentMethod === 'delivery' ? 'Confirmed by clinic' : '₱0'}</b></span>
              <strong>Estimated total <b>{formatPeso(total)}{fulfillmentMethod === 'delivery' ? ' + delivery' : ''}</b></strong>
            </div>
            <p className={s.checkoutNotice}>Stock is checked and reserved when you submit. The clinic confirms the delivery fee and fulfillment. No online payment details are collected.</p>
            <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={submitting || stockWarnings.length > 0 || !contactPhone.trim() || (fulfillmentMethod === 'delivery' && !deliveryAddress.trim())}>
              {submitting ? 'Sending order…' : 'Place order request'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

const ORDER_STATUS: Record<OwnerOrder['status'], string> = {
  new: 'Received',
  preparing: 'Preparing',
  out_for_delivery: 'Out for delivery',
  delivered: 'Completed',
  cancelled: 'Cancelled',
};

export function OwnerOrders({ nav }: { nav: OwnerNav }) {
  const [orders, setOrders] = useState<OwnerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { orders: loaded } = await getOwnerOrders();
      setOrders(loaded);
      setError(null);
    } catch (loadError) {
      setError(commerceError(loadError, 'Could not load your order history.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) void load();
    };
    const timer = window.setInterval(refreshIfVisible, 30_000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [load]);

  return (
    <div className={s.stack}>
      <header className={s.pageHeader}>
        <div className={s.title}>
          <span className={s.eyebrow}>SHOP</span>
          <h1>Order history</h1>
          <p>Track order requests and clinic fulfillment updates.</p>
        </div>
        <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => nav.shop()}>Shop products</button>
      </header>
      {error && <p className={s.pageError} role="alert">{error}</p>}
      {loading && <p className={s.empty} aria-live="polite">Loading your orders…</p>}
      {!loading && !error && orders.length === 0 && (
        <section className={`${s.card} ${s.emptyCard}`}>
          <h2>No orders yet</h2>
          <p>When you place an order request, it will appear here with its latest status.</p>
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => nav.shop()}>Browse the shop</button>
        </section>
      )}
      <section className={s.orderList}>
        {orders.map((order) => (
          <article className={`${s.card} ${s.orderCard}`} key={order.id}>
            <div className={s.orderCardHeader}>
              <div><small>ORDER</small><h2>#{order.id.slice(0, 8).toUpperCase()}</h2><time>{orderDate(order.createdAt)}</time></div>
              <span className={`${s.badge} ${order.status === 'cancelled' ? s.badgeWarn : order.status === 'delivered' ? s.badgeOk : s.badgeSage}`}>{ORDER_STATUS[order.status]}</span>
            </div>
            <ul className={s.orderItemList}>
              {order.items.map((item, index) => (
                <li key={`${item.productId}-${index}`}>
                  <span>{item.quantity} × {item.productName}</span>
                  <b>{formatPeso(Number(item.unitPrice) * item.quantity)}</b>
                </li>
              ))}
            </ul>
            <div className={s.orderCardFooter}>
              <span>{order.fulfillmentMethod === 'delivery' ? `Delivery · ${order.deliveryAddress}` : 'Clinic pickup'}<small>{order.contactPhone} · {order.paymentMethod === 'cash_on_delivery' ? 'Cash on delivery' : 'Pay at clinic'}</small></span>
              <b>{formatPeso(Number(order.totalAmount))}</b>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
