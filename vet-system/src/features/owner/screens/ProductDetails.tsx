import { Icon } from '../../../components/ui/Icon';
import { Photo } from '../../../components/owner/Photo';
import { ProductCard, RailSection } from '../../../components/owner/OwnerParts';
import { CLINIC_CITY } from '../../clinicInfo';
import { ALSO_LIKE, CATEGORY_LABEL, PRODUCTS, SAMPLE_REVIEWS, productsByIds } from '../data';
import type { ProductTab } from '../ownerReducer';
import { formatPeso, type OwnerNav, type Product } from '../types';
import s from './Screens.module.css';

interface ProductDetailsProps {
  nav: OwnerNav;
  product: Product;
  sizeIndex: number;
  qty: number;
  tab: ProductTab;
  thumb: number;
  onSize: (index: number) => void;
  onQty: (delta: number) => void;
  onTab: (tab: ProductTab) => void;
  onThumb: (index: number) => void;
  onAdd: () => void;
}

const DELIVERY = [
  { icon: 'truck', text: 'Free delivery on orders above ₱1,500' },
  { icon: 'info-shield', text: 'Vet-approved formula · 100% authentic' },
  { icon: 'info-clock', text: `Delivered in 2–3 days within ${CLINIC_CITY}` },
] as const;

export function ProductDetails({ nav, product, sizeIndex, qty, tab, thumb, onSize, onQty, onTab, onThumb, onAdd }: ProductDetailsProps) {
  const price = product.price * (product.sizes[sizeIndex]?.multiplier ?? 1);
  // Gallery: the product itself plus three related "photos" from the design.
  const gallery = [
    { emoji: product.emoji, tone: product.tone },
    { emoji: '🥫', tone: 'cream' as const },
    { emoji: '🐕', tone: 'sage' as const },
    { emoji: '🦴', tone: 'mint' as const },
  ];
  const shown = gallery[thumb] ?? { emoji: product.emoji, tone: product.tone };
  const related = productsByIds(ALSO_LIKE).filter((p) => p.id !== product.id);
  const recommended = [
    ...related,
    ...PRODUCTS.filter((p) => p.id !== product.id && !related.some((item) => item.id === p.id)),
  ].slice(0, 4);
  const tabs: { key: ProductTab; label: string }[] = [
    { key: 'description', label: 'Description' },
    { key: 'ingredients', label: 'Ingredients' },
    { key: 'reviews', label: `Reviews (${product.reviews})` },
  ];

  return (
    <div className={s.stack}>
      <nav className={s.breadcrumb} aria-label="Breadcrumb">
        <button type="button" className={s.crumb} onClick={() => nav.shop()}>Shop</button>
        <Icon name="crumb-chev" size={14} />
        <button type="button" className={s.crumb} onClick={() => nav.shop(product.category)}>{CATEGORY_LABEL[product.category]}</button>
        <Icon name="crumb-chev" size={14} />
        <span className={s.crumbHere}>{product.name}</span>
      </nav>

      <div className={s.productCols}>
        <div className={s.gallery}>
          <Photo emoji={shown.emoji} tone={shown.tone} size={170} width={600} height={460} radius={24} />
          <div className={s.thumbs}>
            {gallery.map((g, i) => (
              <button
                key={i}
                type="button"
                className={`${s.thumb} ${i === thumb ? s.thumbOn : ''}`}
                aria-label={`Photo ${i + 1}`}
                aria-pressed={i === thumb}
                onClick={() => onThumb(i)}
              >
                <Photo emoji={g.emoji} tone={g.tone} size={48} width="100%" height="100%" />
              </button>
            ))}
          </div>
        </div>

        <div className={s.productInfo}>
          <div className={s.ratingRow}>
            <span className={`${s.badge} ${s.badgeOk}`} style={{ color: 'var(--color-ok)' }}>In stock</span>
            <Icon name="star-lg" size={16} />
            {product.rating.toFixed(1)}
            <span>({product.reviews} reviews)</span>
          </div>
          <h1 className={s.productTitle}>{product.name}</h1>
          <p className={s.panelText}>{product.blurb}</p>
          <div className={s.bigPrice}>{formatPeso(price)}</div>

          {product.sizes.length > 1 && (
            <div className={s.sizes}>
              <b>Pack size</b>
              <div className={s.chips}>
                {product.sizes.map((sz, i) => (
                  <button key={sz.label} type="button" className={`${s.chip} ${i === sizeIndex ? s.chipOn : ''}`} aria-pressed={i === sizeIndex} onClick={() => onSize(i)}>
                    {sz.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={s.qtyRow}>
            <div className={s.stepper} role="group" aria-label="Quantity">
              <button type="button" aria-label="Decrease quantity" onClick={() => onQty(-1)}>
                <Icon name="minus" size={16} />
              </button>
              <b aria-live="polite">{qty}</b>
              <button type="button" aria-label="Increase quantity" onClick={() => onQty(1)}>
                <Icon name="plus-ink" size={16} />
              </button>
            </div>
            <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.grow}`} onClick={onAdd}>
              <Icon name="btn-cart-white" size={18} />
              Add to Cart
            </button>
            <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => nav.soon('Checkout')}>
              Buy Now
            </button>
          </div>

          <div className={`${s.card} ${s.delivery}`}>
            {DELIVERY.map((d) => (
              <div key={d.icon} className={s.deliveryLine}>
                <span className={s.infoIcon}><Icon name={d.icon} size={16} /></span>
                {d.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className={`${s.card} ${s.tabs}`}>
        <div className={s.chips} role="tablist" aria-label="Product information">
          {tabs.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={`${s.chip} ${tab === t.key ? s.chipOn : ''}`} onClick={() => onTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'description' && (
          <p className={s.tabText}>{product.blurb}</p>
        )}
        {tab === 'ingredients' && <p className={s.tabText}>{product.ingredients}</p>}
        {tab === 'reviews' && (
          <div>
            {SAMPLE_REVIEWS.map((r) => (
              <div key={r.id} className={s.review}>
                <b>{r.who} <span>· {r.pet}</span></b>
                <p>{r.text}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <RailSection title="You may also like" linkLabel="Visit shop" onLink={() => nav.shop()}>
        {recommended.map((p) => (
          <ProductCard key={p.id} product={p} width={246} onOpen={() => nav.product(p.id)} />
        ))}
      </RailSection>
    </div>
  );
}
