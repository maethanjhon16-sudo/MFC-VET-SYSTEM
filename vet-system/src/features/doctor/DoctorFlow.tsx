import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { Icon } from '../../components/ui/Icon';
import {
  decideStaffAppointment,
  getStaffPatients,
  getStaffSchedule,
  type Appointment as ApiAppointment,
  type DoctorPatient,
} from '../auth/api';
import { CLINIC_ADDRESS, CLINIC_HOURS, getClinicGreeting } from '../clinicInfo';
import { DoctorWorkspacePages, type DoctorAuxiliaryView } from './DoctorWorkspacePages';
import styles from './DoctorFlow.module.css';

type DoctorView = 'dashboard' | 'appointments' | 'calendar' | 'patients' | 'patient-details' | 'appointment-details' | DoctorAuxiliaryView;
type AppointmentStatus = 'Confirmed' | 'Pending' | 'Completed' | 'Declined';
type Appointment = {
  id: string;
  petId: string | null;
  owner: string;
  pet: string;
  species: string;
  service: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  reason: string;
};
type Patient = {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: string;
  owner: string;
  ownerEmail: string;
  ownerPhone: string;
  lastVisit: string;
  note: string;
};

function localDate(daysFromToday: number): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const date = new Date(`${values.year}-${values.month}-${values.day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

function dateLabel(date: string): string {
  return new Date(`${date}T12:00:00+08:00`).toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
  });
}

function weekdayLabel(date: string): string {
  return new Date(`${date}T12:00:00+08:00`).toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
  });
}

function ageLabel(dateOfBirth: string | null): string {
  if (!dateOfBirth) return 'Age not provided';
  const birth = new Date(`${dateOfBirth.slice(0, 10)}T00:00:00`);
  const today = new Date();
  let months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months -= 1;
  if (months < 12) return `${Math.max(0, months)} months`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'year' : 'years'}`;
}

function visitDateLabel(value: string | null): string {
  if (!value) return 'No confirmed visit yet';
  return new Date(value).toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function mapPatient(patient: DoctorPatient): Patient {
  return {
    id: patient.id,
    name: patient.name,
    species: patient.species,
    breed: patient.breed || 'Breed not provided',
    age: ageLabel(patient.dateOfBirth),
    owner: patient.ownerName,
    ownerEmail: patient.ownerEmail,
    ownerPhone: patient.ownerPhone,
    lastVisit: visitDateLabel(patient.lastVisit),
    note: 'No clinical notes have been recorded for this pet yet.',
  };
}

function mapAppointment(appointment: ApiAppointment): Appointment {
  const date = new Date(appointment.scheduledAt);
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const dateValues = Object.fromEntries(dateParts.map(({ type, value }) => [type, value]));
  return {
    id: appointment.id,
    petId: appointment.petId,
    owner: appointment.ownerName ?? 'Pet owner',
    pet: appointment.petName,
    species: appointment.petSpecies ?? 'Pet',
    service: appointment.serviceName,
    date: `${dateValues.year}-${dateValues.month}-${dateValues.day}`,
    time: date.toLocaleTimeString('en-PH', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      minute: '2-digit',
    }),
    status: appointment.status === 'confirmed' ? 'Confirmed' : 'Pending',
    reason: appointment.notes || 'No visit notes provided.',
  };
}

interface DoctorState {
  view: DoctorView;
  patients: Patient[];
  appointments: Appointment[];
  search: string;
  selectedAppointmentId: string | null;
  selectedPatientId: string | null;
  weekOffset: number;
  message: string;
  appointmentsLoading: boolean;
  appointmentsError: string | null;
  patientsLoading: boolean;
  patientsError: string | null;
  savingAppointmentId: string | null;
}

type DoctorAction =
  | { type: 'NAVIGATE'; view: DoctorView }
  | { type: 'SET_SEARCH'; value: string }
  | { type: 'OPEN_APPOINTMENT'; id: string }
  | { type: 'OPEN_PATIENT'; id: string }
  | { type: 'BACK' }
  | { type: 'APPOINTMENTS_LOADED'; appointments: ApiAppointment[] }
  | { type: 'APPOINTMENTS_FAILED'; message: string }
  | { type: 'PATIENTS_LOADED'; patients: DoctorPatient[] }
  | { type: 'PATIENTS_FAILED'; message: string }
  | { type: 'SAVING_APPOINTMENT'; id: string }
  | { type: 'APPOINTMENT_DECIDED'; id: string; status: 'Confirmed' | 'Declined' }
  | { type: 'APPOINTMENT_ACTION_FAILED'; message: string }
  | { type: 'MOVE_WEEK'; amount: number }
  | { type: 'CLEAR_MESSAGE' };

function createInitialState(): DoctorState {
  return {
    view: 'dashboard',
    patients: [],
    appointments: [],
    search: '',
    selectedAppointmentId: null,
    selectedPatientId: null,
    weekOffset: 0,
    message: '',
    appointmentsLoading: true,
    appointmentsError: null,
    patientsLoading: true,
    patientsError: null,
    savingAppointmentId: null,
  };
}

function doctorReducer(state: DoctorState, action: DoctorAction): DoctorState {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, view: action.view, message: '' };
    case 'SET_SEARCH':
      return { ...state, search: action.value };
    case 'OPEN_APPOINTMENT':
      return { ...state, view: 'appointment-details', selectedAppointmentId: action.id, message: '' };
    case 'OPEN_PATIENT':
      return { ...state, view: 'patient-details', selectedPatientId: action.id, message: '' };
    case 'BACK':
      return { ...state, view: state.view === 'appointment-details' ? 'appointments' : 'patients', message: '' };
    case 'APPOINTMENTS_LOADED':
      return {
        ...state,
        appointments: action.appointments.map(mapAppointment),
        appointmentsLoading: false,
        appointmentsError: null,
      };
    case 'APPOINTMENTS_FAILED':
      return { ...state, appointmentsLoading: false, appointmentsError: action.message };
    case 'PATIENTS_LOADED':
      return { ...state, patients: action.patients.map(mapPatient), patientsLoading: false, patientsError: null };
    case 'PATIENTS_FAILED':
      return { ...state, patientsLoading: false, patientsError: action.message };
    case 'SAVING_APPOINTMENT':
      return { ...state, savingAppointmentId: action.id, appointmentsError: null };
    case 'APPOINTMENT_DECIDED':
      return {
        ...state,
        appointments: action.status === 'Confirmed'
          ? state.appointments.map((item) => item.id === action.id ? { ...item, status: 'Confirmed' } : item)
          : state.appointments.filter((item) => item.id !== action.id),
        savingAppointmentId: null,
        message: action.status === 'Confirmed' ? 'Appointment request confirmed.' : 'Appointment request declined.',
      };
    case 'APPOINTMENT_ACTION_FAILED':
      return { ...state, savingAppointmentId: null, appointmentsError: action.message };
    case 'MOVE_WEEK':
      return { ...state, weekOffset: state.weekOffset + action.amount };
    case 'CLEAR_MESSAGE':
      return { ...state, message: '' };
    default:
      return state;
  }
}

function Status({ children }: { children: AppointmentStatus }) {
  const statusClass = children.toLowerCase();
  return <span className={`${styles.status} ${styles[statusClass]}`}>{children}</span>;
}

function AppointmentTable({
  appointments,
  onOpen,
}: {
  appointments: Appointment[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr><th>Pet &amp; owner</th><th>Service</th><th>Date &amp; time</th><th>Status</th><th /></tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr key={appointment.id}>
              <td><b>{appointment.pet}</b><span>{appointment.owner} · {appointment.species}</span></td>
              <td>{appointment.service}</td>
              <td>{dateLabel(appointment.date)} · {appointment.time}</td>
              <td><Status>{appointment.status}</Status></td>
              <td><button className={styles.textButton} type="button" onClick={() => onOpen(appointment.id)}>Details</button></td>
            </tr>
          ))}
          {appointments.length === 0 && <tr><td className={styles.empty} colSpan={5}>No appointments match this view.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

interface DoctorFlowProps {
  doctorName: string;
  onSignOut: () => void;
}

export function DoctorFlow({ doctorName, onSignOut }: DoctorFlowProps) {
  const [state, dispatch] = useReducer(doctorReducer, undefined, createInitialState);
  const today = localDate(0);
  const doctorInitials = doctorName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const loadSchedule = useCallback(async () => {
    try {
      const { appointments } = await getStaffSchedule();
      dispatch({ type: 'APPOINTMENTS_LOADED', appointments });
    } catch (error) {
      dispatch({
        type: 'APPOINTMENTS_FAILED',
        message: error instanceof Error ? error.message : 'Could not load the clinic schedule.',
      });
    }
  }, []);

  const loadPatients = useCallback(async () => {
    try {
      const { patients } = await getStaffPatients();
      dispatch({ type: 'PATIENTS_LOADED', patients });
    } catch (error) {
      dispatch({
        type: 'PATIENTS_FAILED',
        message: error instanceof Error ? error.message : 'Could not load assigned patient profiles.',
      });
    }
  }, []);

  useEffect(() => {
    void loadSchedule();
    void loadPatients();
  }, [loadPatients, loadSchedule]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState !== 'visible' || !document.hasFocus()) return;
      void loadSchedule();
      void loadPatients();
    };
    const timer = window.setInterval(refreshIfVisible, 30_000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('focus', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
    };
  }, [loadPatients, loadSchedule]);

  const pendingCount = state.appointments.filter((item) => item.status === 'Pending').length;
  const appointmentsToday = state.appointments.filter((item) => item.date === today && item.status !== 'Declined');
  const upcomingConfirmed = state.appointments.filter((item) => item.date >= today && item.status === 'Confirmed').length;
  const selectedAppointment = state.appointments.find((item) => item.id === state.selectedAppointmentId);
  const selectedPatient = state.patients.find((item) => item.id === state.selectedPatientId);
  const visiblePatients = useMemo(() => {
    const query = state.search.trim().toLowerCase();
    return state.patients.filter((patient) =>
      `${patient.name} ${patient.owner} ${patient.species} ${patient.breed}`.toLowerCase().includes(query),
    );
  }, [state.patients, state.search]);
  const weekStart = useMemo(() => {
    const date = new Date(`${today}T12:00:00Z`);
    const day = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - day + state.weekOffset * 7);
    return date;
  }, [today, state.weekOffset]);
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setUTCDate(date.getUTCDate() + index);
      return date.toISOString().slice(0, 10);
    }),
    [weekStart],
  );

  const navigate = (view: DoctorView) => dispatch({ type: 'NAVIGATE', view });
  const openAppointment = (id: string) => dispatch({ type: 'OPEN_APPOINTMENT', id });
  const openPatient = (id: string) => {
    if (!state.patients.some((patient) => patient.id === id)) {
      dispatch({ type: 'NAVIGATE', view: 'patients' });
      return;
    }
    dispatch({ type: 'OPEN_PATIENT', id });
  };
  const decideAppointment = async (id: string, decision: 'confirm' | 'decline') => {
    dispatch({ type: 'SAVING_APPOINTMENT', id });
    try {
      await decideStaffAppointment(id, decision);
      await Promise.all([loadSchedule(), loadPatients()]);
      dispatch({ type: 'APPOINTMENT_DECIDED', id, status: decision === 'confirm' ? 'Confirmed' : 'Declined' });
    } catch (error) {
      dispatch({
        type: 'APPOINTMENT_ACTION_FAILED',
        message: error instanceof Error ? error.message : 'Could not update this appointment.',
      });
    }
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}><Icon name="mfc-logo" size={29} /></span>
          <span>MFC PET LIFE<small>Vet Doctor workspace</small></span>
        </div>
        <p className={styles.navLabel}>CLINICAL</p>
        <nav className={styles.navigation} aria-label="Doctor workspace">
          <button type="button" className={state.view === 'dashboard' ? styles.navActive : ''} onClick={() => navigate('dashboard')}><Icon name="nav-home" size={20} />Dashboard</button>
          <button type="button" className={state.view === 'calendar' ? styles.navActive : ''} onClick={() => navigate('calendar')}><Icon name="nav-calendar" size={20} />Calendar</button>
          <button type="button" className={state.view === 'appointments' || state.view === 'appointment-details' ? styles.navActive : ''} onClick={() => navigate('appointments')}><Icon name="bell" size={20} />Requests{pendingCount > 0 && <i>{pendingCount}</i>}</button>
          <button type="button" className={state.view === 'patients' || state.view === 'patient-details' ? styles.navActive : ''} onClick={() => navigate('patients')}><Icon name="user" size={20} />Patients</button>
          <button type="button" className={state.view === 'records' ? styles.navActive : ''} onClick={() => navigate('records')}><Icon name="file" size={20} />Clinical records</button>
          <button type="button" className={state.view === 'labs' ? styles.navActive : ''} onClick={() => navigate('labs')}><Icon name="flask" size={20} />Lab results</button>
          <button type="button" className={state.view === 'follow-ups' ? styles.navActive : ''} onClick={() => navigate('follow-ups')}><Icon name="check-green" size={20} />Follow-ups</button>
          <button type="button" className={state.view === 'inbox' ? styles.navActive : ''} onClick={() => navigate('inbox')}><Icon name="chat" size={20} />Inbox</button>
          <p className={styles.navLabel}>CLINIC OPERATIONS</p>
          <button type="button" className={state.view === 'services' ? styles.navActive : ''} onClick={() => navigate('services')}><Icon name="step-grid" size={20} />Services</button>
          <button type="button" className={state.view === 'inventory' ? styles.navActive : ''} onClick={() => navigate('inventory')}><Icon name="nav-bag" size={20} />Inventory</button>
          <button type="button" className={state.view === 'orders' ? styles.navActive : ''} onClick={() => navigate('orders')}><Icon name="cart" size={20} />Orders</button>
          <p className={styles.navLabel}>ACCOUNT</p>
          <button type="button" className={state.view === 'profile' ? styles.navActive : ''} onClick={() => navigate('profile')}><Icon name="user" size={20} />Profile</button>
          <button type="button" className={state.view === 'availability' ? styles.navActive : ''} onClick={() => navigate('availability')}><Icon name="clock" size={20} />Availability</button>
          <button type="button" className={state.view === 'settings' ? styles.navActive : ''} onClick={() => navigate('settings')}><Icon name="nav-menu" size={20} />Settings</button>
        </nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.clinicStatus}><span />Clinic hours<small>{CLINIC_HOURS}</small></div>
          <div className={styles.doctorCard}>
            <span className={styles.avatar}>{doctorInitials}</span>
            <span><b>{doctorName}</b><small>Veterinarian</small></span>
          </div>
          <button type="button" className={styles.signOut} onClick={onSignOut}><span>↪</span>Sign out</button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <label className={`${styles.searchBox} ${styles.topSearch}`}>
            <Icon name="search" size={18} />
            <input
              value={state.search}
              onFocus={() => navigate('patients')}
              onChange={(event) => dispatch({ type: 'SET_SEARCH', value: event.target.value })}
              placeholder="Search patient, pet or owner..."
              aria-label="Search patients, pets, or owners"
            />
          </label>
          <div className={styles.topActions}>
            <button type="button" className={styles.notification} aria-label={`Appointment requests, ${pendingCount} pending`} onClick={() => navigate('appointments')}>
              <Icon name="bell" size={20} />{pendingCount > 0 && <i>{pendingCount}</i>}
            </button>
            <button type="button" className={styles.topProfile} onClick={() => navigate('patients')}><span className={styles.avatarSmall}>{doctorInitials}</span>{doctorName}</button>
          </div>
        </header>

        <div className={styles.content}>
          {state.message && <div className={styles.message} role="status">{state.message}<button type="button" aria-label="Dismiss message" onClick={() => dispatch({ type: 'CLEAR_MESSAGE' })}>×</button></div>}
          {state.appointmentsError && <div className={styles.message} role="alert">{state.appointmentsError}<button type="button" aria-label="Retry loading appointments" onClick={() => void loadSchedule()}>↻</button></div>}

          {state.view === 'dashboard' && (
            <>
              <section className={styles.welcome}>
                <div>
                  <p className={styles.eyebrow}>VET DOCTOR WORKSPACE</p>
                  <h1>{getClinicGreeting()}, {doctorName}</h1>
                  <p>{new Date(`${today}T12:00:00+08:00`).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {appointmentsToday.length} appointments today</p>
                </div>
                <div className={styles.welcomeActions}>
                  <button type="button" className={styles.secondaryButton} onClick={() => navigate('patients')}><Icon name="search" size={18} />Search patient</button>
                  <button type="button" className={styles.secondaryButton} onClick={() => navigate('patients')}><Icon name="file" size={18} />Open record</button>
                  <button type="button" className={styles.primaryButton} onClick={() => navigate('appointments')}><Icon name="bell" size={18} />Appointment requests</button>
                </div>
              </section>

              <section className={styles.metrics} aria-label="Today's overview">
                <button type="button" className={styles.metricCard} onClick={() => navigate('calendar')}>
                  <span className={styles.metricIcon}><Icon name="nav-calendar" size={23} /></span>
                  <span className={styles.metricText}><span>Today's appointments</span><b>{appointmentsToday.length}</b><small>Across your schedule</small></span>
                </button>
                <button type="button" className={styles.metricCard} onClick={() => navigate('appointments')}>
                  <span className={`${styles.metricIcon} ${styles.goldIcon}`}><Icon name="bell" size={23} /></span>
                  <span className={styles.metricText}><span>Pending requests</span><b>{pendingCount}</b><small>Needs review</small></span>
                </button>
                <button type="button" className={styles.metricCard} onClick={() => navigate('patients')}>
                  <span className={`${styles.metricIcon} ${styles.purpleIcon}`}><Icon name="user" size={23} /></span>
                  <span className={styles.metricText}><span>Patient records</span><b>{state.patients.length}</b><small>In the directory</small></span>
                </button>
                <button type="button" className={styles.metricCard} onClick={() => navigate('appointments')}>
                  <span className={`${styles.metricIcon} ${styles.blueIcon}`}><Icon name="pulse-card" size={23} /></span>
                  <span className={styles.metricText}><span>Upcoming confirmed</span><b>{upcomingConfirmed}</b><small>Booked visits</small></span>
                </button>
              </section>

              <section className={styles.dashboardGrid}>
                <article className={`${styles.panel} ${styles.dashboardPanel}`}>
                  <div className={styles.panelHeader}><div><h2>Today’s schedule</h2><p>Your appointments and visit status</p></div><button type="button" className={styles.textButton} onClick={() => navigate('calendar')}>Full calendar →</button></div>
                  {state.appointmentsLoading
                    ? <p className={styles.emptyNotice}>Loading your schedule…</p>
                    : <AppointmentTable appointments={appointmentsToday} onOpen={openAppointment} />}
                </article>
                <div className={styles.dashboardRight}>
                  <article className={styles.panel}>
                    <div className={styles.panelHeader}><div><h2>Appointment requests</h2><p>Review new booking requests</p></div><span className={styles.requestCount}>{pendingCount} new</span></div>
                    <div className={styles.requestList}>
                      {state.appointments.filter((item) => item.status === 'Pending').slice(0, 4).map((item) => (
                        <div className={styles.request} key={item.id}>
                          <div className={styles.petAvatar}>{item.species === 'Dog' ? '🐕' : item.species === 'Cat' ? '🐈' : '🐇'}</div>
                          <div className={styles.requestInfo}><b>{item.pet} <span>· {item.owner}</span></b><small>{item.service} · {dateLabel(item.date)}, {item.time}</small></div>
                          <button type="button" className={styles.iconLink} aria-label={`Review ${item.pet} request`} onClick={() => openAppointment(item.id)}>›</button>
                        </div>
                      ))}
                      {pendingCount === 0 && <p className={styles.emptyNotice}>No requests need review.</p>}
                    </div>
                    <button type="button" className={styles.secondaryButton} onClick={() => navigate('appointments')}>Manage requests</button>
                  </article>
                  <article className={`${styles.panel} ${styles.clinicPanel}`}>
                    <div className={styles.panelHeader}><div><h2>Clinic information</h2><p>Today at MFC PET LIFE</p></div></div>
                    <div className={styles.clinicInfo}>
                      <p><Icon name="info-clock" size={18} /><span><b>Clinic hours</b><small>{CLINIC_HOURS}</small></span></p>
                      <p><Icon name="info-pin" size={18} /><span><b>Clinic address</b><small>{CLINIC_ADDRESS}</small></span></p>
                    </div>
                  </article>
                </div>
              </section>

              <section className={styles.recentSection}>
                <div className={styles.recentHeader}><h2>Recently accessed patient records</h2><button type="button" className={styles.textButton} onClick={() => navigate('patients')}>All patients →</button></div>
                <div className={styles.recentPatients}>
                  {state.patients.map((patient) => (
                    <button type="button" className={styles.recentPatient} key={patient.id} onClick={() => openPatient(patient.id)}>
                      <span className={`${styles.petAvatar} ${styles.recentAvatar}`}>{patient.species === 'Dog' ? '🐕' : patient.species === 'Cat' ? '🐈' : '🐇'}</span>
                      <span><b>{patient.name}</b><small>{patient.breed}</small></span>
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          {state.view === 'appointments' && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}><div><h1>Appointments</h1><p>Review requests and manage your upcoming visits.</p></div><div><button type="button" className={styles.secondaryButton} onClick={() => void loadSchedule()}>↻&nbsp; Refresh</button><button type="button" className={styles.primaryButton} onClick={() => navigate('calendar')}>▦&nbsp; Open calendar</button></div></div>
              <div className={styles.appointmentSummary}><span><b>{pendingCount}</b> pending requests</span><span><b>{appointmentsToday.length}</b> today</span><span><b>{state.appointments.filter((item) => item.status === 'Confirmed').length}</b> confirmed</span></div>
              {state.appointmentsLoading
                ? <p className={styles.emptyNotice}>Loading your appointments…</p>
                : <AppointmentTable appointments={state.appointments.filter((item) => item.status !== 'Declined')} onOpen={openAppointment} />}
            </section>
          )}

          {state.view === 'calendar' && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}><div><h1>Appointment calendar</h1><p>View your clinic schedule by week.</p></div><div className={styles.weekControls}><button type="button" aria-label="Previous week" onClick={() => dispatch({ type: 'MOVE_WEEK', amount: -1 })}>‹</button><button type="button" onClick={() => dispatch({ type: 'MOVE_WEEK', amount: -state.weekOffset })}>This week</button><button type="button" aria-label="Next week" onClick={() => dispatch({ type: 'MOVE_WEEK', amount: 1 })}>›</button></div></div>
              <div className={styles.calendar}>
                {weekDates.map((date) => {
                  const dayAppointments = state.appointments.filter((item) => item.date === date && item.status !== 'Declined');
                  return <article className={`${styles.calendarDay} ${date === today && state.weekOffset === 0 ? styles.currentDay : ''}`} key={date}>
                    <div className={styles.dayHeading}><span>{weekdayLabel(date)}</span><b>{new Date(`${date}T12:00:00Z`).getUTCDate()}</b></div>
                    <div className={styles.dayEvents}>
                      {dayAppointments.map((item) => <button type="button" className={styles.event} key={item.id} onClick={() => openAppointment(item.id)}><b>{item.time}</b><span>{item.pet}</span><small>{item.service}</small></button>)}
                      {dayAppointments.length === 0 && <span className={styles.noEvents}>No visits</span>}
                    </div>
                  </article>;
                })}
              </div>
            </section>
          )}

          {state.view === 'patients' && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}><div><h1>Patient directory</h1><p>Owners’ pet profiles appear here when an appointment is assigned to you.</p></div><div className={styles.patientActions}><span className={styles.patientTotal}>{state.patients.length} patients</span><button type="button" className={styles.secondaryButton} onClick={() => void loadPatients()} disabled={state.patientsLoading}>↻&nbsp; Refresh</button></div></div>
              {state.patientsError && <p className={styles.message} role="alert">{state.patientsError}</p>}
              <label className={styles.searchBox}><span>⌕</span><input value={state.search} onChange={(event) => dispatch({ type: 'SET_SEARCH', value: event.target.value })} placeholder="Search by pet, owner, or breed" aria-label="Search patients" /></label>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Patient</th><th>Owner</th><th>Breed</th><th>Age</th><th>Last visit</th><th /></tr></thead>
                  <tbody>{state.patientsLoading
                    ? <tr><td className={styles.empty} colSpan={6}>Loading assigned patient profiles…</td></tr>
                    : visiblePatients.map((patient) => <tr key={patient.id}>
                    <td><button type="button" className={styles.patientCell} onClick={() => openPatient(patient.id)}><span className={styles.petAvatar}>{patient.species === 'Dog' ? '🐕' : patient.species === 'Cat' ? '🐈' : '🐇'}</span><span><b>{patient.name}</b><small>{patient.species}</small></span></button></td>
                    <td>{patient.owner}</td><td>{patient.breed}</td><td>{patient.age}</td><td>{patient.lastVisit}</td>
                    <td><button type="button" className={styles.textButton} onClick={() => openPatient(patient.id)}>View profile →</button></td>
                  </tr>)}
                  {!state.patientsLoading && visiblePatients.length === 0 && <tr><td className={styles.empty} colSpan={6}>{state.search ? 'No patients found. Try a different search.' : 'No patient profiles are linked to your appointments yet.'}</td></tr>}</tbody>
                </table>
              </div>
            </section>
          )}

          {state.view === 'patient-details' && selectedPatient && (
            <section className={styles.panel}>
              <button type="button" className={styles.backButton} onClick={() => navigate('patients')}>←&nbsp; Patient directory</button>
              <div className={styles.profileHeader}><span className={`${styles.petAvatar} ${styles.largePet}`}>{selectedPatient.species === 'Dog' ? '🐕' : selectedPatient.species === 'Cat' ? '🐈' : '🐇'}</span><div><h1>{selectedPatient.name}</h1><p>{selectedPatient.breed} · {selectedPatient.age} · {selectedPatient.species}</p><span>Patient ID: MFC-{selectedPatient.id.toUpperCase()}</span></div><button type="button" className={styles.secondaryButton} onClick={() => navigate('appointments')}>Book follow-up</button></div>
              <div className={styles.profileGrid}><article className={styles.detailCard}><h2>Owner information</h2><p><b>{selectedPatient.owner}</b><small>Pet owner</small></p><p><b>{selectedPatient.ownerEmail}</b><small>{selectedPatient.ownerPhone || 'No phone number on file'}</small></p></article><article className={styles.detailCard}><h2>Clinical records</h2><p>{selectedPatient.note}</p><small>Last confirmed visit · {selectedPatient.lastVisit}</small></article></div>
              <div className={styles.panelHeader}><div><h2>Visit history</h2><p>Appointments for {selectedPatient.name}</p></div></div>
              <AppointmentTable appointments={state.appointments.filter((item) => item.petId === selectedPatient.id)} onOpen={openAppointment} />
            </section>
          )}

          {state.view === 'appointment-details' && selectedAppointment && (
            <section className={styles.panel}>
              <button type="button" className={styles.backButton} onClick={() => navigate('appointments')}>←&nbsp; Appointments</button>
              <div className={styles.panelHeader}><div><h1>{selectedAppointment.service}</h1><p>Appointment request · {selectedAppointment.id.toUpperCase()}</p></div><Status>{selectedAppointment.status}</Status></div>
              <div className={styles.detailGrid}>
                <article className={styles.detailCard}><h2>Visit details</h2><p><b>{selectedAppointment.pet}</b><small>{selectedAppointment.species}</small></p><p><b>{dateLabel(selectedAppointment.date)} · {selectedAppointment.time}</b><small>Requested appointment time</small></p><p><b>Reason for visit</b><small>{selectedAppointment.reason}</small></p></article>
                <article className={styles.detailCard}><h2>Pet owner</h2><p><b>{selectedAppointment.owner}</b><small>Registered pet owner</small></p><p><b>MFC PET LIFE Clinic</b><small>{CLINIC_ADDRESS}</small></p></article>
              </div>
              {selectedAppointment.status === 'Pending' && <div className={styles.detailActions}><button type="button" className={styles.secondaryButton} disabled={state.savingAppointmentId !== null} onClick={() => void decideAppointment(selectedAppointment.id, 'decline')}>Decline request</button><button type="button" className={styles.primaryButton} disabled={state.savingAppointmentId !== null} onClick={() => void decideAppointment(selectedAppointment.id, 'confirm')}>{state.savingAppointmentId === selectedAppointment.id ? 'Saving…' : '✓  Confirm appointment'}</button></div>}
              {selectedAppointment.status === 'Confirmed' && <div className={styles.confirmedNote}>This appointment is confirmed and added to your schedule.</div>}
            </section>
          )}

          {(['records', 'labs', 'follow-ups', 'inbox', 'services', 'inventory', 'orders', 'profile', 'availability', 'settings'] as const).includes(state.view as DoctorAuxiliaryView) && (
            <DoctorWorkspacePages
              view={state.view as DoctorAuxiliaryView}
              doctorName={doctorName}
              patients={state.patients}
              appointments={state.appointments}
              onNavigate={navigate}
              onOpenPatient={openPatient}
            />
          )}
        </div>
      </main>
    </div>
  );
}
