import type { ReactNode } from 'react';
import { Icon } from '../../components/ui/Icon';
import type { IconName } from '../../assets/icons';
import { CLINIC, OWNER } from './data';
import type { OwnerScreen } from './types';
import styles from './OwnerLayout.module.css';

type NavGroup = 'home' | 'actions' | 'shop' | 'schedule' | 'menu';

const NAV_ITEMS: ReadonlyArray<{ group: NavGroup; label: string; icon: IconName; to: OwnerScreen }> = [
  { group: 'home', label: 'Home', icon: 'nav-home', to: 'owner-home' },
  { group: 'actions', label: 'Actions', icon: 'nav-grid', to: 'owner-services' },
  { group: 'shop', label: 'Shop', icon: 'nav-bag', to: 'owner-shop' },
  { group: 'schedule', label: 'Schedule', icon: 'nav-calendar', to: 'owner-schedule' },
  { group: 'menu', label: 'Menu', icon: 'nav-menu', to: 'owner-menu' },
];

/**
 * Which top-nav tab is highlighted for each screen.
 * Home / Actions / Shop / Schedule come from the Owner Home frame; the grouping of the screens below
 * is provisional until each frame is built and its active tab can be checked against Figma.
 */
const NAV_GROUP: Record<OwnerScreen, NavGroup> = {
  'owner-home': 'home',
  'owner-services': 'actions',
  'service-details': 'actions',
  'my-pets': 'actions',
  'pet-profile': 'actions',
  'pet-profile-vaccines': 'actions',
  'pet-profile-records': 'actions',
  'medical-records': 'actions',
  'vaccination-history': 'actions',
  'prescriptions-lab-results': 'actions',
  'add-pet': 'actions',
  messages: 'actions',
  conversation: 'actions',
  'conversation-sent': 'actions',
  'owner-shop': 'shop',
  'product-details': 'shop',
  cart: 'shop',
  'cart-promo-applied': 'shop',
  checkout: 'shop',
  'order-confirmation': 'shop',
  'order-history': 'shop',
  'owner-order-details': 'shop',
  'owner-schedule': 'schedule',
  'owner-schedule-past': 'schedule',
  'book-step-1-pet': 'schedule',
  'book-step-2-service': 'schedule',
  'book-step-3-date-time': 'schedule',
  'booking-confirmation': 'schedule',
  'appointment-details': 'schedule',
  'appointment-cancelled': 'schedule',
  notifications: 'menu',
  'owner-menu': 'menu',
  'my-profile': 'menu',
  'settings-privacy': 'menu',
  'help-contact': 'menu',
  'log-out-confirmation': 'menu',
};

interface OwnerLayoutProps {
  screen: OwnerScreen;
  go: (screen: OwnerScreen) => void;
  children: ReactNode;
}

export function OwnerLayout({ screen, go, children }: OwnerLayoutProps) {
  const activeGroup = NAV_GROUP[screen];

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <button type="button" className={styles.brand} onClick={() => go('owner-home')} aria-label={`${CLINIC.name} – Owner Home`}>
          <span className={styles.logoMark}>
            <Icon name="logo" size={27.206} width={33.12} />
          </span>
          <span className={styles.brandName}>{CLINIC.name}</span>
        </button>

        <nav className={styles.primaryNav} aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const active = item.group === activeGroup;
            return (
              <button
                key={item.group}
                type="button"
                className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => go(item.to)}
              >
                <Icon name={item.icon} size={20} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className={styles.actions}>
          <button type="button" className={styles.search} onClick={() => go('owner-shop')}>
            <Icon name="search" size={18} />
            Search pets, products…
          </button>
          <button type="button" className={styles.iconButton} aria-label="Cart" onClick={() => go('cart')}>
            <Icon name="cart" size={20} />
          </button>
          <button type="button" className={styles.iconButton} aria-label="Messages (unread)" onClick={() => go('messages')}>
            <Icon name="chat" size={20} />
            <span className={styles.dot} />
          </button>
          <button type="button" className={styles.iconButton} aria-label="Notifications (unread)" onClick={() => go('notifications')}>
            <Icon name="bell" size={20} />
            <span className={styles.dot} />
          </button>
          <button type="button" className={styles.profile} onClick={() => go('owner-menu')}>
            <span className={styles.avatar}>{OWNER.avatar}</span>
            {OWNER.name}
          </button>
        </div>
      </header>

      <main className={styles.content}>{children}</main>

      <footer className={styles.footer}>
        <span className={styles.footerBrand}>
          <span className={styles.footerMark}>
            <Icon name="logo" size={18.926} width={23.04} />
          </span>
          {CLINIC.name}
        </span>
        <span className={styles.footerInfo}>
          {CLINIC.address} &nbsp;·&nbsp; {CLINIC.hours}
        </span>
        <button type="button" className={styles.footerLink} onClick={() => go('help-contact')}>
          Help &amp; Contact
        </button>
      </footer>
    </div>
  );
}
