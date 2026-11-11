import { getProduct } from '../data';
import { formatPeso, type CartLine, type OwnerNav } from '../types';
import s from './Screens.module.css';

interface ComingSoonProps {
  nav: OwnerNav;
  label: string;
  cart: CartLine[];
  onSignOut: () => void;
}

/**
 * Stand-in for frames that live in other sections of the Figma file
 * (Schedule, Cart, Messages, Pet Profile, Book flow, …).
 */
export function ComingSoon({ nav, label, cart, onSignOut }: ComingSoonProps) {
  const isCart = label === 'Cart';
  const total = cart.reduce((sum, l) => {
    const p = getProduct(l.productId);
    return sum + p.price * (p.sizes[l.sizeIndex]?.multiplier ?? 1) * l.qty;
  }, 0);

  return (
    <section className={`${s.card} ${s.soon}`}>
      <h1>{label}</h1>
      <p>This screen belongs to a later section of the design and will be built in the next pass.</p>
      {isCart && cart.length > 0 && (
        <ul className={s.cartList} aria-label="Items in your cart">
          {cart.map((l) => {
            const p = getProduct(l.productId);
            return (
              <li key={`${l.productId}-${l.sizeIndex}`}>
                <span>
                  {p.name}
                  {p.sizes.length > 1 ? ` · ${p.sizes[l.sizeIndex]?.label}` : ''} × {l.qty}
                </span>
                <span>{formatPeso(p.price * (p.sizes[l.sizeIndex]?.multiplier ?? 1) * l.qty)}</span>
              </li>
            );
          })}
          <li><b>Total</b><b>{formatPeso(total)}</b></li>
        </ul>
      )}
      {isCart && cart.length === 0 && <p>Your cart is empty.</p>}
      <div className={s.headerActions} style={{ marginTop: 12 }}>
        <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={onSignOut}>
          Sign out
        </button>
        <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={nav.home}>
          Back to Home
        </button>
      </div>
    </section>
  );
}
