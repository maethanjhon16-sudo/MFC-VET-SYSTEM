import { Icon } from '../../../components/ui/Icon';
import { Photo } from '../../../components/owner/Photo';
import { SERVICES, SERVICE_CHIPS } from '../data';
import { formatPeso, type OwnerNav, type ServiceCategory } from '../types';
import s from './Screens.module.css';

interface OwnerServicesProps {
  nav: OwnerNav;
  chip: ServiceCategory | 'all';
  enabledServiceIds: string[];
  onChip: (chip: ServiceCategory | 'all') => void;
}

const STEPS = [
  { icon: 'step-grid', title: '1 · Choose a service', sub: 'Pick what your pet needs' },
  { icon: 'step-calendar', title: '2 · Select date & time', sub: 'Choose a slot with your doctor' },
  { icon: 'step-check', title: '3 · Get confirmation', sub: 'We confirm by app and SMS' },
] as const;

export function OwnerServices({ nav, chip, enabledServiceIds, onChip }: OwnerServicesProps) {
  const visible = SERVICES.filter((service) =>
    enabledServiceIds.includes(service.id) && (chip === 'all' || service.category === chip),
  );
  const consultationEnabled = enabledServiceIds.includes('consultation');

  return (
    <div className={s.stack}>
      <div className={s.pageHeader}>
        <div className={s.title}>
          <span className={s.eyebrow}>ACTIONS</span>
          <h1>Veterinary services</h1>
          <p>Explore the services currently available from the clinic and request a visit.</p>
        </div>
        <div className={s.headerActions}>
          <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={nav.messages}>
            <Icon name="chat-sm" size={18} />
            Message Clinic
          </button>
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={enabledServiceIds.length === 0} onClick={() => nav.book()}>
            <Icon name="plus-white" size={18} />
            Book Appointment
          </button>
        </div>
      </div>

      <section className={`${s.banner} ${s.bannerGreen}`} style={{ height: 260 }}>
        <div className={s.ellipse} style={{ left: 330, top: -200 }}>
          <Icon name="ellipse-services" size={420} />
        </div>
        <div className={s.heroText} style={{ gap: 14, padding: 56 }}>
          <span className={`${s.badge} ${s.badgeLav}`}>Most booked</span>
          <h2 className={s.heroTitle} style={{ fontSize: 34 }}>Annual wellness check-up</h2>
          <p className={s.heroSub} style={{ width: 560, fontSize: 15, lineHeight: '23px', color: 'var(--color-sagemid)' }}>
            Full physical exam, weight check and vaccine review with a licensed veterinarian.
          </p>
          <button
            type="button"
            className={`${s.btn} ${s.btnWhite}`}
            style={{ width: 210, boxShadow: 'var(--shadow-cta)' }}
            disabled={!consultationEnabled}
            onClick={() => nav.book('consultation')}
          >
            {consultationEnabled ? 'Book Consultation' : 'Consultation unavailable'}
          </button>
        </div>
        <Photo emoji="🐕" tone="sand" size={130} width={420} height={260} />
      </section>

      <div className={s.chips} role="tablist" aria-label="Service categories">
        {SERVICE_CHIPS.map((c) => (
          <button
            key={c.key}
            type="button"
            role="tab"
            aria-selected={chip === c.key}
            className={`${s.chip} ${chip === c.key ? s.chipOn : ''}`}
            onClick={() => onChip(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className={s.servicesGrid}>
        {visible.map((svc) => (
          <article key={svc.id} className={`${s.card} ${s.serviceCard}`}>
            <div className={s.serviceTop}>
              <Photo emoji={svc.emoji} tone={svc.tone} size={33} width={64} height={64} radius={99} />
              <span className={`${s.badge} ${s.badgeGray}`}>{svc.duration}</span>
            </div>
            <div className={s.serviceText}>
              <h3>{svc.name}</h3>
              <p>{svc.blurb}</p>
            </div>
            <div className={s.price}>
              <small>from</small>
              <b>{formatPeso(svc.price)}</b>
            </div>
            <div className={s.serviceActions}>
              <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnSecondary}`} onClick={() => nav.service(svc.id)}>
                View Details
              </button>
              <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnPrimary}`} style={{ boxShadow: 'none' }} onClick={() => nav.book(svc.id)}>
                Book Service
              </button>
            </div>
          </article>
        ))}
        {visible.length === 0 && <p className={s.empty}>No services in this category yet.</p>}
      </div>

      <div className={`${s.card} ${s.steps}`}>
        {STEPS.map((step) => (
          <div key={step.title} className={s.step}>
            <span className={s.stepIcon}>
              <Icon name={step.icon} size={23} />
            </span>
            <span className={s.stepText}>
              <b>{step.title}</b>
              <span>{step.sub}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
