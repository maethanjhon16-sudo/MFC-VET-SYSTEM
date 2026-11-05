import type { CSSProperties } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import type { IconName } from '../../../assets/icons';
import { PetCarousel } from '../components/PetCarousel';
import { RailSection } from '../components/RailSection';
import { SectionHeader } from '../components/SectionHeader';
import {
  FEATURED_SERVICES,
  MEDICAL_UPDATES,
  OWNER,
  PETS,
  RECOMMENDED_PRODUCTS,
  UPCOMING_APPOINTMENTS,
  formatPeso,
} from '../data';
import type { OwnerScreen, OwnerScreenProps } from '../types';
import styles from './OwnerHome.module.css';

const QUICK_ACTIONS: ReadonlyArray<{
  label: string;
  hint: string;
  icon: IconName;
  bg: string;
  to: OwnerScreen;
}> = [
  { label: 'Appointments', hint: 'Manage your visits', icon: 'qa-calendar', bg: 'var(--color-sage)', to: 'owner-schedule' },
  { label: 'Pet Records', hint: 'Medical history', icon: 'qa-file', bg: 'var(--color-lav)', to: 'medical-records' },
  { label: 'Messages', hint: '2 unread', icon: 'qa-chat', bg: 'var(--color-sky)', to: 'messages' },
  { label: 'Shop', hint: 'Food & supplies', icon: 'qa-bag', bg: 'var(--color-cream)', to: 'owner-shop' },
];

const gradient = ([from, to]: [string, string]) => ({ '--from': from, '--to': to }) as CSSProperties;

/** Figma frame "Owner Home" (250:19685). */
export function OwnerHome({ go }: OwnerScreenProps) {
  const bella = PETS[0];

  return (
    <>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>
          <h1>Good morning, {OWNER.name}</h1>
          <p>Here’s what’s happening with your pets today.</p>
        </div>
        <div className={styles.pageActions}>
          <Button variant="secondary" size="compact" onClick={() => go('messages')}>
            <Icon name="chat-sm" size={18} />
            Message Doctor
          </Button>
          <Button size="compact" onClick={() => go('book-step-1-pet')}>
            <Icon name="plus" size={18} />
            Book Appointment
          </Button>
        </div>
      </div>

      <section className={styles.banner}>
        <span className={`${styles.ellipse} ${styles.ellipseTop}`}>
          <Icon name="banner-ellipse-top" size={420} />
        </span>
        <span className={`${styles.ellipse} ${styles.ellipseBottom}`}>
          <Icon name="banner-ellipse-bottom" size={300} />
        </span>
        <div className={styles.heroText}>
          <Badge tone="lav">Reminder</Badge>
          <h2>Bella’s yearly check-up is due this week</h2>
          <p>Dr. Andrea Reyes has open slots Oct 22–24 at MFC Pet Clinic.</p>
          <div className={styles.heroActions}>
            <Button variant="onDark" size="compact" onClick={() => go('book-step-1-pet')}>
              Book now
            </Button>
            <Button variant="ghostOnDark" size="compact" onClick={() => go('pet-profile')}>
              View Bella’s profile
            </Button>
          </div>
        </div>
        <div className={styles.heroPhoto} style={gradient(['#efdcbd', '#d2b283'])}>
          {bella?.emoji}
        </div>
      </section>

      <div className={styles.quickActions}>
        {QUICK_ACTIONS.map((action) => (
          <button key={action.label} type="button" className={styles.quick} onClick={() => go(action.to)}>
            <span className={styles.quickIcon} style={{ background: action.bg }}>
              <Icon name={action.icon} size={24} />
            </span>
            <span className={styles.quickText}>
              <strong>{action.label}</strong>
              <span>{action.hint}</span>
            </span>
          </button>
        ))}
      </div>

      <section className={styles.block}>
        <SectionHeader title="My Pets" link={{ label: 'See all', onClick: () => go('my-pets') }} />
        <PetCarousel pets={PETS} onOpenPet={() => go('pet-profile')} />
      </section>

      <div className={styles.twoColumn}>
        <section className={`${styles.block} ${styles.upcoming}`}>
          <SectionHeader title="Upcoming appointments" link={{ label: 'See all', onClick: () => go('owner-schedule') }} />
          {UPCOMING_APPOINTMENTS.map((a) => (
            <button key={a.id} type="button" className={styles.appointment} onClick={() => go('appointment-details')}>
              <span className={styles.date}>
                <span className={styles.month}>{a.month}</span>
                <span className={styles.day}>{a.day}</span>
              </span>
              <span className={styles.appointmentInfo}>
                <strong>{a.title}</strong>
                <span>{a.doctor}</span>
                <span className={styles.time}>{a.time}</span>
              </span>
              <Badge tone={a.status.tone}>{a.status.label}</Badge>
            </button>
          ))}
        </section>

        <section className={`${styles.block} ${styles.updates}`}>
          <SectionHeader title="Recent medical updates" link={{ label: 'See all', onClick: () => go('medical-records') }} />
          {MEDICAL_UPDATES.map((u) => (
            <button key={u.id} type="button" className={styles.update} onClick={() => go(u.to)}>
              <span className={styles.updateIcon} style={{ background: `var(--color-${u.iconBg})` }}>
                <Icon name={u.icon} size={20} />
              </span>
              <span className={styles.updateText}>
                <strong>{u.title}</strong>
                <span>{u.meta}</span>
              </span>
              <Icon name="chev-gray" size={18} />
            </button>
          ))}
        </section>
      </div>

      <RailSection
        title="Featured services"
        subtitle="Everything your pet needs, under one roof"
        link={{ label: `All ${FEATURED_SERVICES.length} services`, onClick: () => go('owner-services') }}
      >
        {FEATURED_SERVICES.map((s) => (
          <button key={s.id} type="button" className={styles.service} onClick={() => go('service-details')}>
            <span className={styles.serviceIcon} style={gradient(s.gradient)}>
              {s.emoji}
            </span>
            <span className={styles.serviceText}>
              <strong>{s.name}</strong>
              <span>{s.blurb}</span>
            </span>
            <span className={styles.serviceLink}>
              View details
              <Icon name="chev-purple-sm" size={14} />
            </span>
          </button>
        ))}
      </RailSection>

      <RailSection
        title="Recommended for your pets"
        link={{ label: 'Visit shop', onClick: () => go('owner-shop') }}
      >
        {RECOMMENDED_PRODUCTS.map((p) => (
          <button key={p.id} type="button" className={styles.product} onClick={() => go('product-details')}>
            <span className={styles.productPhoto} style={gradient(p.gradient)}>
              {p.emoji}
            </span>
            <span className={styles.productBody}>
              <strong>{p.name}</strong>
              <span className={styles.rating}>
                <Icon name="star" size={14} />
                {p.rating}
              </span>
              <span className={styles.price}>{formatPeso(p.price)}</span>
            </span>
          </button>
        ))}
      </RailSection>
    </>
  );
}
