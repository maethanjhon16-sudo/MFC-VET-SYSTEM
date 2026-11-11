import { useRef, type ReactNode } from 'react';
import { Icon } from '../ui/Icon';
import { Photo } from './Photo';
import { formatPeso, type Product, type Service } from '../../features/owner/types';
import styles from './OwnerParts.module.css';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  linkLabel?: string;
  onLink?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export function SectionHeader({ title, subtitle, linkLabel, onLink, onPrev, onNext }: SectionHeaderProps) {
  return (
    <div className={styles.sectionHeader}>
      <div className={styles.sectionTitle}>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className={styles.links}>
        {linkLabel && (
          <button type="button" className={styles.seeAll} onClick={onLink}>
            {linkLabel}
            <Icon name="chev-link" size={16} />
          </button>
        )}
        {onPrev && (
          <button type="button" className={styles.arrow} onClick={onPrev} aria-label="Previous">
            <Icon name="chev-left" size={16} />
          </button>
        )}
        {onNext && (
          <button type="button" className={styles.arrow} onClick={onNext} aria-label="Next">
            <Icon name="chev-right" size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

interface RailSectionProps {
  title: string;
  subtitle?: string;
  linkLabel?: string;
  onLink?: () => void;
  /** Extra room under the cards so card shadows are not clipped by the scroller. */
  children: ReactNode;
}

/** A titled, horizontally scrolling row with prev / next arrows (Figma "Rail"). */
export function RailSection({ title, subtitle, linkLabel, onLink, children }: RailSectionProps) {
  const rail = useRef<HTMLDivElement>(null);
  const scroll = (direction: 1 | -1) => {
    const el = rail.current;
    if (el) el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.8, 260), behavior: 'smooth' });
  };
  return (
    <section className={styles.section}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        linkLabel={linkLabel}
        onLink={onLink}
        onPrev={() => scroll(-1)}
        onNext={() => scroll(1)}
      />
      <div className={styles.rail} ref={rail}>
        <div className={styles.row}>{children}</div>
      </div>
    </section>
  );
}

export function ProductCard({ product, width, onOpen }: { product: Product; width: number; onOpen: () => void }) {
  return (
    <button type="button" className={styles.product} style={{ width }} onClick={onOpen}>
      <Photo emoji={product.emoji} tone={product.tone} size={64} width="100%" height={150} />
      <span className={styles.productBody}>
        <span className={styles.productName}>{product.name}</span>
        <span className={styles.rating}>
          <Icon name="star" size={14} />
          {product.rating.toFixed(1)}
        </span>
        <span className={styles.productPrice}>{formatPeso(product.price)}</span>
      </span>
    </button>
  );
}

export function ServiceMiniCard({ service, width, onOpen }: { service: Service; width: number; onOpen: () => void }) {
  return (
    <button type="button" className={styles.miniService} style={{ width }} onClick={onOpen}>
      <Photo emoji={service.emoji} tone={service.tone} size={29} width={56} height={56} radius={99} />
      <span className={styles.miniText}>
        <span className={styles.miniName}>{service.name}</span>
        <span className={styles.miniBlurb}>{service.blurb}</span>
      </span>
      <span className={styles.miniLink}>
        View details
        <Icon name="chev-link-sm" size={14} />
      </span>
    </button>
  );
}
