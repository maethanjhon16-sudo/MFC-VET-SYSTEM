import type { FormEvent } from 'react';
import { Icon } from '../../../components/ui/Icon';
import { Photo } from '../../../components/owner/Photo';
import { ProductCard, RailSection } from '../../../components/owner/OwnerParts';
import { CATEGORY_LABEL, PRODUCTS, SHOP_ACCESSORIES, SHOP_CHIPS, SHOP_FEATURED, SHOP_FOOD, SORTS, productsByIds } from '../data';
import type { SortKey } from '../data';
import type { OwnerNav, Product, ProductCategory } from '../types';
import s from './Screens.module.css';

interface OwnerShopProps {
  nav: OwnerNav;
  chip: ProductCategory | 'all';
  query: string;
  sort: SortKey;
  sortOpen: boolean;
  cartCount: number;
  onChip: (chip: ProductCategory | 'all') => void;
  onQuery: (query: string) => void;
  onSort: (sort: SortKey) => void;
  onToggleSort: () => void;
}

function sortProducts(list: Product[], sort: SortKey): Product[] {
  const copy = [...list];
  if (sort === 'Price: low to high') copy.sort((a, b) => a.price - b.price);
  else if (sort === 'Price: high to low') copy.sort((a, b) => b.price - a.price);
  else if (sort === 'Top rated') copy.sort((a, b) => b.rating - a.rating);
  else copy.sort((a, b) => b.reviews - a.reviews);
  return copy;
}

export function OwnerShop({ nav, chip, query, sort, sortOpen, cartCount, onChip, onQuery, onSort, onToggleSort }: OwnerShopProps) {
  const filtering = chip !== 'all' || query.trim() !== '' || sort !== 'Popular';
  const q = query.trim().toLowerCase();
  const results = sortProducts(
    PRODUCTS.filter((p) => (chip === 'all' || p.category === chip) && (q === '' || `${p.name} ${CATEGORY_LABEL[p.category]}`.toLowerCase().includes(q))),
    sort,
  );

  const submit = (event: FormEvent) => event.preventDefault();

  return (
    <div className={s.stack}>
      <div className={s.pageHeader}>
        <div className={s.title}>
          <span className={s.eyebrow}>SHOP</span>
          <h1>Pet shop</h1>
          <p>Food, vitamins, grooming and accessories — delivered from the clinic.</p>
        </div>
        <div className={s.headerActions}>
          <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => nav.soon('Cart')}>
            <Icon name="btn-cart" size={18} />
            View Cart{cartCount > 0 ? ` (${cartCount})` : ''}
          </button>
          <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => nav.soon('Order History')}>
            <Icon name="btn-bag" size={18} />
            Order History
          </button>
        </div>
      </div>

      <form className={s.searchRow} onSubmit={submit} role="search">
        <label className={s.searchBox}>
          <Icon name="search" size={18} />
          <input
            type="search"
            value={query}
            placeholder="Search food, vitamins, grooming…"
            aria-label="Search the shop"
            onChange={(e) => onQuery(e.target.value)}
          />
        </label>
        <button type="button" className={`${s.btn} ${s.btn50} ${s.btnSecondary}`} onClick={() => nav.soon('Filters')}>
          <Icon name="filter" size={18} />
          Filters
        </button>
        <div className={s.sortWrap}>
          <button
            type="button"
            className={`${s.btn} ${s.btn50} ${s.btnSecondary}`}
            aria-haspopup="listbox"
            aria-expanded={sortOpen}
            onClick={onToggleSort}
          >
            Sort: {sort}
            <span className={sortOpen ? s.chevOpen : undefined}>
              <Icon name="chev-down" size={18} />
            </span>
          </button>
          {sortOpen && (
            <div className={s.sortMenu} role="listbox" aria-label="Sort products">
              {SORTS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={option === sort}
                  className={`${s.sortOption} ${option === sort ? s.sortOn : ''}`}
                  onClick={() => onSort(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </form>

      <div className={s.chips} role="tablist" aria-label="Product categories">
        {SHOP_CHIPS.map((c) => (
          <button
            key={c.key}
            type="button"
            role="tab"
            aria-selected={chip === c.key}
            className={`${s.chip} ${chip === c.key ? s.chipOn : ''}`}
            onClick={() => onChip(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {filtering ? (
        <section className={s.stack} style={{ gap: 18 }}>
          <div className={s.title}>
            <h1 style={{ fontSize: 22 }}>
              {results.length} {results.length === 1 ? 'product' : 'products'}
              {q ? ` for “${query.trim()}”` : ''}
            </h1>
          </div>
          {results.length > 0 ? (
            <div className={s.productGrid}>
              {results.map((p) => (
                <ProductCard key={p.id} product={p} width={246} onOpen={() => nav.product(p.id)} />
              ))}
            </div>
          ) : (
            <p className={s.empty}>Nothing matches yet — try another word or category.</p>
          )}
        </section>
      ) : (
        <>
          <section className={`${s.banner} ${s.bannerBrown}`} style={{ height: 240 }}>
            <div className={s.ellipse} style={{ left: 420, top: -160 }}>
              <Icon name="ellipse-shop" size={380} />
            </div>
            <div className={s.heroText} style={{ gap: 14, padding: 56 }}>
              <span className={`${s.badge} ${s.badgeSky}`}>This week</span>
              <h2 className={s.heroTitle} style={{ fontSize: 34 }}>Free delivery on orders above ₱1,500</h2>
              <p className={s.heroSub} style={{ width: 560, fontSize: 15, lineHeight: '23px', color: '#eadbc4' }}>
                Premium dog &amp; cat food, vitamins and grooming essentials — restocked weekly.
              </p>
              <button type="button" className={`${s.btn} ${s.btnWhite}`} style={{ width: 190 }} onClick={() => onChip('dog-food')}>
                Shop Dog Food
              </button>
            </div>
            <Photo emoji="🛍️" tone="cream" size={120} width={400} height={240} />
          </section>

          <RailSection title="Featured picks" linkLabel="See all" onLink={() => onChip('all')}>
            {productsByIds(SHOP_FEATURED).map((p) => <ProductCard key={p.id} product={p} width={246} onOpen={() => nav.product(p.id)} />)}
          </RailSection>
          <RailSection title="Dog & cat food" linkLabel="See all" onLink={() => onChip('dog-food')}>
            {productsByIds(SHOP_FOOD).map((p) => <ProductCard key={p.id} product={p} width={246} onOpen={() => nav.product(p.id)} />)}
          </RailSection>
          <RailSection title="Vitamins, grooming & accessories" linkLabel="See all" onLink={() => onChip('vitamins')}>
            {productsByIds(SHOP_ACCESSORIES).map((p) => <ProductCard key={p.id} product={p} width={246} onOpen={() => nav.product(p.id)} />)}
          </RailSection>
        </>
      )}
    </div>
  );
}
