import type { ReactNode } from 'react';
import styles from './Badge.module.css';

interface BadgeProps {
  tone: 'sage' | 'lav';
  children: ReactNode;
}

export function Badge({ tone, children }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}
