import { useEffect, useReducer, type FormEvent } from 'react';
import { Icon } from '../../../components/ui/Icon';
import { Photo } from '../../../components/owner/Photo';
import { ProductCard, RailSection, SectionHeader, ServiceMiniCard } from '../../../components/owner/OwnerParts';
import { CLINIC_HOURS, getClinicGreeting } from '../../clinicInfo';
import { createOwnerPet, getOwnerAppointments, getOwnerPets, type Appointment, type OwnerPet, type PetSpecies } from '../../auth/api';
import { HOME_RECOMMENDED, MEDICAL_UPDATES, SERVICES, productsByIds } from '../data';
import type { OwnerNav } from '../types';
import s from './Screens.module.css';

const UPDATE_BG = { okbg: 'var(--color-okbg)', lav: 'var(--color-lav)', sky: 'var(--color-sky)' } as const;

type PetsState = {
  pets: OwnerPet[];
  loading: boolean;
  adding: boolean;
  saving: boolean;
  error: string | null;
  message: string | null;
};
type PetsAction =
  | { type: 'LOADED'; pets: OwnerPet[] }
  | { type: 'FAILED'; message: string }
  | { type: 'START_ADDING' }
  | { type: 'CANCEL_ADDING' }
  | { type: 'SAVING' }
  | { type: 'CREATED'; pet: OwnerPet }
  | { type: 'CREATE_FAILED'; message: string };

function petsReducer(state: PetsState, action: PetsAction): PetsState {
  switch (action.type) {
    case 'LOADED':
      return { ...state, pets: action.pets, loading: false, error: null };
    case 'FAILED':
      return { ...state, loading: false, error: action.message };
    case 'START_ADDING':
      return { ...state, adding: true, error: null, message: null };
    case 'CANCEL_ADDING':
      return { ...state, adding: false, error: null };
    case 'SAVING':
      return { ...state, saving: true, error: null, message: null };
    case 'CREATED':
      return {
        ...state,
        pets: [...state.pets, action.pet],
        adding: false,
        saving: false,
        message: `${action.pet.name}’s profile was created.`,
      };
    case 'CREATE_FAILED':
      return { ...state, saving: false, error: action.message };
    default:
      return state;
  }
}

function petAge(dateOfBirth: string | null): string {
  if (!dateOfBirth) return 'Age not provided';
  const birth = new Date(`${dateOfBirth.slice(0, 10)}T00:00:00`);
  const now = new Date();
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 12) return `${Math.max(0, months)} months old`;
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  return remainder ? `${years} yr ${remainder} mo` : `${years} ${years === 1 ? 'year' : 'years'} old`;
}

function petEmoji(species: PetSpecies): string {
  if (species === 'Dog') return '🐶';
  if (species === 'Cat') return '🐱';
  if (species === 'Bird') return '🐦';
  if (species === 'Rabbit') return '🐰';
  return '🐾';
}

function manilaToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isPetSpecies(value: string): value is PetSpecies {
  return ['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'].includes(value);
}

function OwnerPets() {
  const [state, dispatch] = useReducer(petsReducer, {
    pets: [],
    loading: true,
    adding: false,
    saving: false,
    error: null,
    message: null,
  });

  useEffect(() => {
    let active = true;
    getOwnerPets().then(({ pets }) => {
      if (active) dispatch({ type: 'LOADED', pets });
    }).catch((error: unknown) => {
      if (active) dispatch({
        type: 'FAILED',
        message: error instanceof Error ? error.message : 'Could not load your pet profiles.',
      });
    });
    return () => { active = false; };
  }, []);

  const submitPet = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = form.get('petName');
    const species = form.get('species');
    const breed = form.get('breed');
    const dateOfBirth = form.get('dateOfBirth');
    if (
      typeof name !== 'string' || typeof species !== 'string' || !isPetSpecies(species)
      || typeof breed !== 'string' || typeof dateOfBirth !== 'string'
    ) {
      dispatch({ type: 'CREATE_FAILED', message: 'Complete the pet profile details.' });
      return;
    }

    dispatch({ type: 'SAVING' });
    try {
      const { pet } = await createOwnerPet({
        name,
        species,
        breed,
        dateOfBirth: dateOfBirth || null,
      });
      dispatch({ type: 'CREATED', pet });
    } catch (error) {
      dispatch({
        type: 'CREATE_FAILED',
        message: error instanceof Error ? error.message : 'Could not save this pet profile.',
      });
    }
  };

  return (
    <>
      {state.error && <p className={s.petMessage} role="alert">{state.error}</p>}
      {state.message && <p className={s.petSuccess} role="status">{state.message}</p>}
      {state.loading && <p className={s.petMessage} aria-live="polite">Loading your pet profiles…</p>}
      {!state.loading && !state.error && state.pets.length === 0 && !state.adding && (
        <p className={s.petMessage}>Create a pet profile before booking an appointment.</p>
      )}
      {!state.loading && state.pets.map((pet) => (
        <article key={pet.id} className={s.petCard}>
          <Photo emoji={petEmoji(pet.species)} tone="sand" size={76} width="100%" height={170} />
          <span className={s.petBody}>
            <span className={s.petName}>{pet.name}</span>
            <span className={s.petInfo}>{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</span>
            <span className={s.petInfo}>{petAge(pet.dateOfBirth)}</span>
          </span>
        </article>
      ))}
      {!state.adding && (
        <button type="button" className={s.addPet} onClick={() => dispatch({ type: 'START_ADDING' })}>
          <Icon name="plus-forest-lg" size={32} />
          <b>Add a new pet</b>
          <span>Create a profile for appointment booking</span>
        </button>
      )}
      {state.adding && (
        <form className={s.petForm} onSubmit={(event) => void submitPet(event)}>
          <h3>Create a pet profile</h3>
          <label>Pet name<input name="petName" required maxLength={80} autoFocus placeholder="e.g. Bella" /></label>
          <label>Species<select name="species" defaultValue="Dog"><option>Dog</option><option>Cat</option><option>Bird</option><option>Rabbit</option><option>Other</option></select></label>
          <label>Breed <span>Optional</span><input name="breed" maxLength={80} placeholder="e.g. Aspin" /></label>
          <label>Date of birth <span>Optional</span><input type="date" name="dateOfBirth" max={manilaToday()} /></label>
          <div className={s.petFormActions}>
            <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => dispatch({ type: 'CANCEL_ADDING' })}>Cancel</button>
            <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={state.saving}>{state.saving ? 'Saving…' : 'Save pet'}</button>
          </div>
        </form>
      )}
    </>
  );
}

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
            Thoughtful care for every member of your family
          </h2>
          <p className={s.heroSub} style={{ fontSize: 15, color: 'var(--color-sagemid)' }}>
            Create a pet profile to make appointment requests and keep your visits connected.
          </p>
          <div className={s.heroActions}>
            <button type="button" className={`${s.btn} ${s.btnWhite}`} onClick={() => nav.book()}>
              Book now
            </button>
            <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => document.getElementById('owner-pets')?.scrollIntoView({ behavior: 'smooth' })}>
              Manage pets
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

      <div id="owner-pets">
        <RailSection title="My Pets">
          <OwnerPets />
        </RailSection>
      </div>

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
