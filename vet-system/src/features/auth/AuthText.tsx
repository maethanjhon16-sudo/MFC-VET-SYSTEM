import type { ReactNode } from 'react';
import styles from './AuthText.module.css';

export function AuthTitle({ children, centered }: { children: ReactNode; centered?: boolean }) {
  return <h1 className={`${styles.title} ${centered ? styles.centered : ''}`}>{children}</h1>;
}

export function AuthSubtitle({ children, centered }: { children: ReactNode; centered?: boolean }) {
  return <p className={`${styles.subtitle} ${centered ? styles.centeredSubtitle : ''}`}>{children}</p>;
}
