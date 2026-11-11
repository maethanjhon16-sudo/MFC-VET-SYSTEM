import type { ReactNode } from 'react';
import { HeroPanel } from './HeroPanel';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  children: ReactNode;
  notice?: string | null;
}

/** Desktop split layout: brand hero on the left, 460px form column on the right. */
export function AuthLayout({ children, notice }: AuthLayoutProps) {
  return (
    <div className={styles.layout}>
      <HeroPanel />
      <main className={styles.formPanel}>
        <div className={styles.form}>
          {notice && <p role="status" className={styles.notice}>{notice}</p>}
          {children}
        </div>
      </main>
    </div>
  );
}
