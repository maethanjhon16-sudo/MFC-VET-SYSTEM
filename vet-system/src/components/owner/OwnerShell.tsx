import type { FormEvent, ReactNode } from 'react';
import { Icon } from '../ui/Icon';
import { OWNER } from '../../features/owner/data';
import type { NavKey, OwnerNav } from '../../features/owner/types';
import styles from './OwnerShell.module.css';

interface OwnerShellProps {
  active: NavKey | null;
  nav: OwnerNav;
  cartCount: number;
  onSearch: (query: string) => void;
  /** Search box text, so the header stays in sync with the shop search. */
  query?: string;
  children: ReactNode;
}

interface NavItem {
  key: NavKey;
  label: string;
  icon: 'nav-home' | 'nav-grid' | 'nav-bag' | 'nav-calendar' | 'nav-menu';
  activeIcon?: 'nav-home-on' | 'nav-grid-on' | 'nav-bag-on';
}

const ITEMS: NavItem[] = [
  { key: 'home', label: 'Home', icon: 'nav-home', activeIcon: 'nav-home-on' },
  { key: 'actions', label: 'Actions', icon: 'nav-grid', activeIcon: 'nav-grid-on' },
  { key: 'shop', label: 'Shop', icon: 'nav-bag', activeIcon: 'nav-bag-on' },
  { key: 'schedule', label: 'Schedule', icon: 'nav-calendar' },
  { key: 'menu', label: 'Menu', icon: 'nav-menu' },
];

export function OwnerShell({ active, nav, cartCount, onSearch, query = '', children }: OwnerShellProps) {
  const go = (key: NavKey) => {
    if (key === 'home') nav.home();
    else if (key === 'actions') nav.services();
    else if (key === 'shop') nav.shop();
    else nav.soon(key === 'schedule' ? 'Owner Schedule' : 'Owner Menu');
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('q');
    onSearch(typeof value === 'string' ? value.trim() : '');
  };

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <button type="button" className={styles.brand} onClick={nav.home} aria-label="MFC PET LIFE — Owner Home">
          <span className={styles.logoMark}>
            <Icon name="mfc-logo" size={27.206} width={33.12} />
          </span>
          <span className={styles.brandName}>MFC PET LIFE</span>
        </button>

        <nav className={styles.primary} aria-label="Primary">
          {ITEMS.map((item) => {
            const on = item.key === active;
            return (
              <button
                key={item.key}
                type="button"
                className={`${styles.navItem} ${on ? styles.navOn : ''}`}
                aria-current={on ? 'page' : undefined}
                onClick={() => go(item.key)}
              >
                <Icon name={on && item.activeIcon ? item.activeIcon : item.icon} size={20} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className={styles.actions}>
          <form className={styles.search} onSubmit={submit} role="search">
            <Icon name="search" size={18} />
            {/* key remounts the uncontrolled input when the shop query changes elsewhere */}
            <input key={query} name="q" defaultValue={query} placeholder="Search pets, products…" aria-label="Search pets, products" />
          </form>
          <button type="button" className={styles.iconBtn} aria-label="Cart" onClick={() => nav.soon('Cart')}>
            <Icon name="cart" size={20} />
            {cartCount > 0 && <span className={styles.count}>{cartCount}</span>}
          </button>
          <button type="button" className={styles.iconBtn} aria-label="Messages" onClick={() => nav.soon('Messages')}>
            <Icon name="chat" size={20} />
            <span className={styles.dot} />
          </button>
          <button type="button" className={styles.iconBtn} aria-label="Notifications" onClick={() => nav.soon('Notifications')}>
            <Icon name="bell" size={20} />
            <span className={styles.dot} />
          </button>
          <button type="button" className={styles.profile} onClick={() => nav.soon('Owner Menu')}>
            <span className={styles.avatar}>{OWNER.emoji}</span>
            {OWNER.name}
          </button>
        </div>
      </header>

      <main className={styles.content}>{children}</main>

      <footer className={styles.footer}>
        <div className={styles.footBrand}>
          <span className={styles.logoSm}>
            <Icon name="mfc-logo-sm" size={18.926} width={23.04} />
          </span>
          MFC PET LIFE
        </div>
        <p>24 Mabini St., Poblacion District, Davao City&nbsp; ·&nbsp; Open Mon–Sat 8:00 AM – 6:00 PM</p>
        <button type="button" className={styles.help} onClick={() => nav.soon('Help & Contact')}>
          Help &amp; Contact
        </button>
      </footer>
    </div>
  );
}
