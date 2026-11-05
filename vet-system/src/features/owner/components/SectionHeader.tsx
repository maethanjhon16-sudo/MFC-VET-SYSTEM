import type { ReactNode } from 'react';
import { Icon } from '../../../components/ui/Icon';
import styles from './SectionHeader.module.css';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Purple "See all ›" style link. */
  link?: { label: string; onClick: () => void };
  /** Extra controls rendered after the link (e.g. rail arrows). */
  children?: ReactNode;
}

export function SectionHeader({ title, subtitle, link, children }: SectionHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.title}>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {(link || children) && (
        <div className={styles.links}>
          {link && (
            <button type="button" className={styles.link} onClick={link.onClick}>
              {link.label}
              <Icon name="chev-purple" size={16} />
            </button>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
