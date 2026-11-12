import { useEffect, useReducer } from 'react';
import { Icon } from '../../../components/ui/Icon';
import { Photo } from '../../../components/owner/Photo';
import { ProductCard, RailSection, SectionHeader, ServiceMiniCard } from '../../../components/owner/OwnerParts';
import { CLINIC_HOURS, getClinicGreeting } from '../../clinicInfo';
import { getOwnerAppointments, type Appointment } from '../../auth/api';
import { HOME_RECOMMENDED, MEDICAL_UPDATES, PETS, SERVICES, productsByIds } from '../data';
import type { OwnerNav } from '../types';
import s from './Screens.module.css';

const STATUS_CLASS = { ok: s.badgeOk, warn: s.badgeWarn, lav: s.badgeLav, sky: s.badgeSky } as const;
const UPDATE_BG = { okbg: 'var(--color-okbg)', lav: 'var(--color-lav)', sky: 'var(--color-sky)' } as const;

type AppointmentPreviewState = { appointments: Appointment[]; loading: boolean; error: string | null };
type AppointmentPreviewAction =
  | { type: 'LOADED'; appointments: Appointment[] }
  | { type: 'FAILED'; message: string };

function appointmentPreviewReducer(
  state: AppointmentPreviewState,
  action: AppointmentPreviewAction,
): AppointmentPreviewState {
  switch (action.type) {
    case 'LOADED':
      return { appointments: action.appointments, loading: false, error: null };
    case 'FAILED':
      return { ...state, loading: false, error: action.message };
    default:
      return state;
  }
}

function UpcomingAppointments({ nav }: { nav: OwnerNav }) {
  const [state, dispatch] = useReducer(appointmentPreviewReducer, {
    appointments: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    getOwnerAppointments().then(({ appointments }) => {
      if (active) dispatch({ type: 'LOADED', appointments });
    }).catch((error: unknown) => {
      if (active) dispatch({
        type: 'FAILED',
        message: error instanceof Error ? error.message : 'Could not load upcoming appointments.',
      });
    });
    return () => { active = false; };
  }, []);

  const upcoming = state.appointments
    .filter((appointment) =>
      ['pending', 'confirmed'].includes(appointment.status)
      && Date.parse(appointment.scheduledAt) >= Date.now(),
    )
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))
    .slice(0, 2);

  return (
    <section className={`${s.col} ${s.colGrow}`}>
      <SectionHeader title="Upcoming appointments" linkLabel="See all" onLink={nav.appointments} />
      {state.error && <p className={s.empty} role="alert">{state.error}</p>}
      {state.loading && <p className={s.empty}>Loading appointments…</p>}
      {!state.loading && !state.error && upcoming.length === 0 && (
        <div className={`${s.card} ${s.row}`}>
          <span className={s.info}><b>No upcoming appointments</b><span>Book a visit for your pet when you’re ready.</span></span>
          <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnPrimary}`} onClick={() => nav.book()}>Book now</button>
        </div>
      )}
      {upcoming.map((appointment) => {
        const date = new Date(appointment.scheduledAt);
        const isPending = appointment.status === 'pending';
        return (
          <article key={appointment.id} className={`${s.card} ${s.row}`}>
            <span className={s.date}>
              <small>{date.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short' }).toUpperCase()}</small>
              <b>{date.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', day: 'numeric' })}</b>
            </span>
            <span className={s.info}>
              <b>{appointment.petName} · {appointment.serviceName}</b>
              <span>{appointment.doctorName ?? 'Any available veterinarian'}</span>
              <em>{date.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })}</em>
            </span>
            <span className={`${s.badge} ${isPending ? s.badgeWarn : s.badgeSky}`}>
              {isPending ? 'Pending' : 'Confirmed'}
            </span>
          </article>
        );
      })}
    </section>
  );
}

export function OwnerHome({ nav, ownerName }: { nav: OwnerNav; ownerName: string }) {
  return (
    <div className={s.stack}>
      <div className={s.pageHeader}>
        <div className={s.title}>
          <span className={s.openHours}>
            <Icon name="info-clock" size={16} />
            {CLINIC_HOURS}
          </span>
          <h1>{getClinicGreeting()}, {ownerName}</h1>
          <p>Here’s what’s happening with your pets today.</p>
        </div>
        <div className={s.headerActions}>
          <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => nav.soon('Messages')}>
            <Icon name="chat-sm" size={18} />
            Message Doctor
          </button>
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => nav.book()}>
            <Icon name="plus-white" size={18} />
            Book Appointment
          </button>
        </div>
      </div>

      <section className={`${s.banner} ${s.bannerGreen}`} style={{ height: 300 }}>
        <div className={s.ellipse} style={{ left: 300, top: -200 }}>
          <Icon name="ellipse-banner" size={420} />
        </div>
        <div className={s.ellipse} style={{ left: -80, top: 180 }}>
          <Icon name="ellipse-banner-sm" size={300} />
        </div>
        <div className={s.heroText} style={{ gap: 16, padding: '0 24px 0 56px', height: '100%' }}>
          <span className={`${s.badge} ${s.badgeLav}`}>Reminder</span>
          <h2 className={s.heroTitle} style={{ fontSize: 38, lineHeight: '46px' }}>
            Bella’s yearly check-up is due this week
          </h2>
          <p className={s.heroSub} style={{ fontSize: 15, color: 'var(--color-sagemid)' }}>
            Dr. Andrea Reyes has open slots Oct 22–24 at MFC Pet Clinic.
          </p>
          <div className={s.heroActions}>
            <button type="button" className={`${s.btn} ${s.btnWhite}`} onClick={() => nav.book()}>
              Book now
            </button>
            <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => nav.soon('Pet Profile')}>
              View Bella’s profile
            </button>
          </div>
        </div>
        <Photo emoji="🐶" tone="sand" size={170} width={460} height={300} />
      </section>

      <div className={s.quick}>
        {[
          { title: 'Appointments', sub: 'Manage your visits', icon: 'quick-calendar', bg: 'var(--color-sage)', go: nav.appointments },
          { title: 'Pet Records', sub: 'Medical history', icon: 'quick-file', bg: 'var(--color-lav)', go: () => nav.soon('Medical Records') },
          { title: 'Messages', sub: '2 unread', icon: 'quick-chat', bg: 'var(--color-sky)', go: () => nav.soon('Messages') },
          { title: 'Shop', sub: 'Food & supplies', icon: 'quick-bag', bg: 'var(--color-cream)', go: () => nav.shop() },
        ].map((q) => (
          <button key={q.title} type="button" className={`${s.card} ${s.quickCard}`} onClick={q.go}>
            <span className={s.quickIcon} style={{ background: q.bg }}>
              <Icon name={q.icon as 'quick-file'} size={24} />
            </span>
            <span className={s.quickText}>
              <b>{q.title}</b>
              <span>{q.sub}</span>
            </span>
          </button>
        ))}
      </div>

      <RailSection title="My Pets" linkLabel="See all" onLink={() => nav.soon('My Pets')}>
        {PETS.map((pet) => (
          <button key={pet.id} type="button" className={s.petCard} onClick={() => nav.soon('Pet Profile')}>
            <Photo emoji={pet.emoji} tone={pet.tone} size={76} width="100%" height={170} />
            <span className={s.petBody}>
              <span className={s.petName}>{pet.name}</span>
              <span className={s.petInfo}>{pet.info}</span>
              <span className={s.petGap} />
              <span className={`${s.badge} ${STATUS_CLASS[pet.statusTone]}`}>{pet.status}</span>
            </span>
          </button>
        ))}
        <button type="button" className={s.addPet} onClick={() => nav.soon('Add Pet')}>
          <Icon name="plus-forest-lg" size={32} />
          <b>Add a new pet</b>
          <span>Create a profile &amp; records</span>
        </button>
      </RailSection>

      <div className={s.twoCol}>
        <UpcomingAppointments nav={nav} />
        <section className={`${s.col} ${s.colFixed}`}>
          <SectionHeader title="Recent medical updates" linkLabel="See all" onLink={() => nav.soon('Medical Records')} />
          {MEDICAL_UPDATES.map((u) => (
            <button key={u.id} type="button" className={`${s.card} ${s.row} ${s.rowSm}`} onClick={() => nav.soon(u.target)}>
              <span className={s.updIcon} style={{ background: UPDATE_BG[u.tone] }}>
                <Icon name={u.icon} size={20} />
              </span>
              <span className={`${s.info} ${s.infoSm}`}>
                <b>{u.title}</b>
                <span>{u.meta}</span>
              </span>
              <Icon name="chev-row" size={18} />
            </button>
          ))}
        </section>
      </div>

      <RailSection
        title="Featured services"
        subtitle="Everything your pet needs, under one roof"
        linkLabel="All 8 services"
        onLink={() => nav.services()}
      >
        {SERVICES.map((svc) => (
          <ServiceMiniCard key={svc.id} service={svc} width={206} onOpen={() => nav.service(svc.id)} />
        ))}
      </RailSection>

      <RailSection title="Recommended for your pets" linkLabel="Visit shop" onLink={() => nav.shop()}>
        {productsByIds(HOME_RECOMMENDED).map((p) => (
          <ProductCard key={p.id} product={p} width={236} onOpen={() => nav.product(p.id)} />
        ))}
      </RailSection>
    </div>
  );
}
