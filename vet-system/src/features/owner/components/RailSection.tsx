import { useRef, type ReactNode } from 'react';
import { Icon } from '../../../components/ui/Icon';
import { SectionHeader } from './SectionHeader';
import styles from './RailSection.module.css';

interface RailSectionProps {
  title: string;
  subtitle?: string;
  link: { label: string; onClick: () => void };
  children: ReactNode;
}

/** A section header with prev/next arrows above a horizontally scrolling row of cards. */
export function RailSection({ title, subtitle, link, children }: RailSectionProps) {
  const railRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * rail.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <section className={styles.section}>
      <SectionHeader title={title} subtitle={subtitle} link={link}>
        <button type="button" className={styles.arrow} aria-label={`Previous ${title.toLowerCase()}`} onClick={() => scroll(-1)}>
          <Icon name="chev-left" size={16} />
        </button>
        <button type="button" className={styles.arrow} aria-label={`Next ${title.toLowerCase()}`} onClick={() => scroll(1)}>
          <Icon name="chev-right" size={16} />
        </button>
      </SectionHeader>
      <div ref={railRef} className={styles.rail}>
        <div className={styles.row}>{children}</div>
      </div>
    </section>
  );
}
