import type { ReactNode } from 'react';
import { HeroPanel } from './HeroPanel';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  children: ReactNode;
}

/** Desktop split layout: brand hero on the left, 460px form column on the right. */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className={styles.layout}>
      <HeroPanel />
      <main className={styles.formPanel}>
        <div className={styles.form}>{children}</div>
      </main>
    </div>
  );
}
