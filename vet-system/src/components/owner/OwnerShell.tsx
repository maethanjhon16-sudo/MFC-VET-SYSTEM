import { useState, type FormEvent, type ReactNode } from 'react';
import { Icon } from '../ui/Icon';
import { CLINIC_ADDRESS } from '../../features/clinicInfo';
import type { NavKey, OwnerNav } from '../../features/owner/types';
import styles from './OwnerShell.module.css';

interface OwnerShellProps {
  active: NavKey | null;
  nav: OwnerNav;
  ownerName: string;
  cartCount: number;
  onSearch: (query: string) => void;
  /** Search box text, so the header stays in sync with the shop search. */
  query?: string;
  onSignOut: () => void;
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

export function OwnerShell({ active, nav, ownerName, cartCount, onSearch, query = '', onSignOut, children }: OwnerShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (key: NavKey) => {
    if (key === 'menu') {
      setMenuOpen((open) => !open);
      return;
    }
    setMenuOpen(false);
    if (key === 'home') nav.home();
    else if (key === 'actions') nav.services();
    else if (key === 'shop') nav.shop();
    else nav.appointments();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('q');
    onSearch(typeof value === 'string' ? value.trim() : '');
  };
  const initials = ownerName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

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
              <span className={item.key === 'menu' ? styles.menuWrap : undefined} key={item.key}>
                <button
                  type="button"
                  className={`${styles.navItem} ${on ? styles.navOn : ''}`}
                  aria-current={on ? 'page' : undefined}
                  aria-expanded={item.key === 'menu' ? menuOpen : undefined}
                  aria-controls={item.key === 'menu' ? 'owner-menu' : undefined}
                  onClick={() => go(item.key)}
                >
                  <Icon name={on && item.activeIcon ? item.activeIcon : item.icon} size={20} />
                  {item.label}
                </button>
                {item.key === 'menu' && menuOpen && (
                  <div className={styles.menuPopover} id="owner-menu" role="menu" aria-label="Owner menu">
                    <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); nav.profile(); }}>My profile</button>
                    <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); nav.records(); }}>Pet records</button>
                    <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); nav.orders(); }}>Order history</button>
                    <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); nav.notifications(); }}>Notifications</button>
                    <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); nav.help(); }}>Help &amp; contact</button>
                    <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); void onSignOut(); }}>Sign out</button>
                  </div>
                )}
              </span>
            );
          })}
        </nav>

        <div className={styles.actions}>
          <form className={styles.search} onSubmit={submit} role="search">
            <Icon name="search" size={18} />
            {/* key remounts the uncontrolled input when the shop query changes elsewhere */}
            <input key={query} name="q" defaultValue={query} placeholder="Search products…" aria-label="Search products" />
          </form>
          <button type="button" className={styles.iconBtn} aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ''}`} onClick={nav.cart}>
            <Icon name="cart" size={20} />
            {cartCount > 0 && <span className={styles.count}>{cartCount}</span>}
          </button>
          <button type="button" className={styles.iconBtn} aria-label="Messages" onClick={nav.messages}>
            <Icon name="chat" size={20} />
          </button>
          <button type="button" className={styles.iconBtn} aria-label="Notifications" onClick={nav.notifications}>
            <Icon name="bell" size={20} />
          </button>
          <button type="button" className={styles.profile} onClick={() => { setMenuOpen(false); nav.profile(); }}>
            <span className={styles.avatar} aria-hidden="true">{initials}</span>
            <span className={styles.profileName} title={ownerName}>{ownerName}</span>
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
        <p className={styles.location}>
          <Icon name="info-pin" size={16} />
          <span>{CLINIC_ADDRESS}</span>
        </p>
        <button type="button" className={styles.help} onClick={nav.help}>
          Help &amp; Contact
        </button>
      </footer>
    </div>
  );
}
