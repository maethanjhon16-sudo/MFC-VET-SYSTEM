import { useMemo, useReducer } from 'react';
import styles from './DoctorFlow.module.css';

type DoctorView = 'dashboard' | 'appointments' | 'calendar' | 'patients' | 'patient-details' | 'appointment-details';
type AppointmentStatus = 'Confirmed' | 'Pending' | 'Completed' | 'Declined';
type Appointment = {
  id: string;
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
  lastVisit: string;
  note: string;
};

const PATIENTS: Patient[] = [
  { id: 'milo', name: 'Milo', species: 'Dog', breed: 'Shih Tzu', age: '4 years', owner: 'Maria Santos', lastVisit: 'Oct 28, 2026', note: 'Annual wellness check. Vaccinations are up to date.' },
  { id: 'luna', name: 'Luna', species: 'Cat', breed: 'Domestic shorthair', age: '2 years', owner: 'Paolo Reyes', lastVisit: 'Nov 3, 2026', note: 'Follow-up for skin irritation. Continue prescribed treatment.' },
  { id: 'coco', name: 'Coco', species: 'Dog', breed: 'Golden Retriever', age: '6 years', owner: 'Ana Cruz', lastVisit: 'Oct 19, 2026', note: 'Dental cleaning completed. Recheck in six months.' },
  { id: 'bambi', name: 'Bambi', species: 'Rabbit', breed: 'Holland Lop', age: '1 year', owner: 'Jose Dela Cruz', lastVisit: 'Sep 14, 2026', note: 'Healthy appetite and normal activity.' },
];

function localDate(daysFromToday: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function weekdayLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
}

const INITIAL_APPOINTMENTS: Appointment[] = [
  { id: 'apt-1', owner: 'Maria Santos', pet: 'Milo', species: 'Dog', service: 'General consultation', date: localDate(0), time: '09:00 AM', status: 'Confirmed', reason: 'Annual wellness exam and vaccine review.' },
  { id: 'apt-2', owner: 'Paolo Reyes', pet: 'Luna', species: 'Cat', service: 'Skin consultation', date: localDate(0), time: '10:30 AM', status: 'Pending', reason: 'Itching and redness around the ears.' },
  { id: 'apt-3', owner: 'Ana Cruz', pet: 'Coco', species: 'Dog', service: 'Dental check-up', date: localDate(0), time: '01:00 PM', status: 'Confirmed', reason: 'Routine oral health check.' },
  { id: 'apt-4', owner: 'Jose Dela Cruz', pet: 'Bambi', species: 'Rabbit', service: 'Wellness check', date: localDate(1), time: '09:30 AM', status: 'Pending', reason: 'First wellness visit.' },
  { id: 'apt-5', owner: 'Maria Santos', pet: 'Milo', species: 'Dog', service: 'Vaccination', date: localDate(2), time: '11:00 AM', status: 'Confirmed', reason: 'Booster vaccination.' },
  { id: 'apt-6', owner: 'Ana Cruz', pet: 'Coco', species: 'Dog', service: 'Follow-up', date: localDate(-1), time: '03:00 PM', status: 'Completed', reason: 'Post-treatment follow-up.' },
];

interface DoctorState {
  view: DoctorView;
  appointments: Appointment[];
  search: string;
  selectedAppointmentId: string | null;
  selectedPatientId: string | null;
  weekOffset: number;
  message: string;
}

type DoctorAction =
  | { type: 'NAVIGATE'; view: DoctorView }
  | { type: 'SET_SEARCH'; value: string }
  | { type: 'OPEN_APPOINTMENT'; id: string }
  | { type: 'OPEN_PATIENT'; id: string }
  | { type: 'BACK' }
  | { type: 'SET_APPOINTMENT_STATUS'; id: string; status: 'Confirmed' | 'Declined' }
  | { type: 'MOVE_WEEK'; amount: number }
  | { type: 'CLEAR_MESSAGE' };

function createInitialState(): DoctorState {
  return {
    view: 'dashboard',
    appointments: INITIAL_APPOINTMENTS,
    search: '',
    selectedAppointmentId: 'apt-1',
    selectedPatientId: null,
    weekOffset: 0,
    message: '',
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
    case 'SET_APPOINTMENT_STATUS': {
      const appointment = state.appointments.find((item) => item.id === action.id);
      if (!appointment || appointment.status !== 'Pending') return state;
      const appointments = state.appointments.map((item) =>
        item.id === action.id ? { ...item, status: action.status } : item,
      );
      return {
        ...state,
        appointments,
        message: action.status === 'Confirmed' ? 'Appointment request confirmed.' : 'Appointment request declined.',
      };
    }
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
  onSignOut: () => void;
}

export function DoctorFlow({ onSignOut }: DoctorFlowProps) {
  const [state, dispatch] = useReducer(doctorReducer, undefined, createInitialState);
  const today = localDate(0);
  const pendingCount = state.appointments.filter((item) => item.status === 'Pending').length;
  const appointmentsToday = state.appointments.filter((item) => item.date === today && item.status !== 'Declined');
  const selectedAppointment = state.appointments.find((item) => item.id === state.selectedAppointmentId);
  const selectedPatient = PATIENTS.find((item) => item.id === state.selectedPatientId);
  const visiblePatients = useMemo(() => {
    const query = state.search.trim().toLowerCase();
    return PATIENTS.filter((patient) =>
      `${patient.name} ${patient.owner} ${patient.species} ${patient.breed}`.toLowerCase().includes(query),
    );
  }, [state.search]);
  const weekStart = useMemo(() => {
    const date = new Date(`${today}T12:00:00`);
    const day = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - day + state.weekOffset * 7);
    return date;
  }, [today, state.weekOffset]);
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + index);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }),
    [weekStart],
  );

  const navigate = (view: DoctorView) => dispatch({ type: 'NAVIGATE', view });
  const openAppointment = (id: string) => dispatch({ type: 'OPEN_APPOINTMENT', id });

  let title = 'Doctor Dashboard';
  if (state.view === 'appointments') title = 'Appointments';
  if (state.view === 'calendar') title = 'Appointment Calendar';
  if (state.view === 'patients') title = 'Patient Directory';
  if (state.view === 'patient-details') title = selectedPatient?.name ?? 'Patient Profile';
  if (state.view === 'appointment-details') title = 'Appointment Details';

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>✚</span>
          <span>MFC <b>PET LIFE</b><small>VETERINARY CLINIC</small></span>
        </div>
        <div className={styles.doctorCard}>
          <span className={styles.avatar}>AR</span>
          <span><b>Dr. Andrea Reyes</b><small>Veterinarian</small></span>
        </div>
        <p className={styles.navLabel}>WORKSPACE</p>
        <nav className={styles.navigation} aria-label="Doctor workspace">
          <button type="button" className={state.view === 'dashboard' ? styles.navActive : ''} onClick={() => navigate('dashboard')}><span>▦</span>Dashboard</button>
          <button type="button" className={state.view === 'appointments' || state.view === 'appointment-details' ? styles.navActive : ''} onClick={() => navigate('appointments')}><span>▣</span>Appointments{pendingCount > 0 && <i>{pendingCount}</i>}</button>
          <button type="button" className={state.view === 'calendar' ? styles.navActive : ''} onClick={() => navigate('calendar')}><span>▦</span>Calendar</button>
          <button type="button" className={state.view === 'patients' || state.view === 'patient-details' ? styles.navActive : ''} onClick={() => navigate('patients')}><span>♡</span>Patients</button>
        </nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.clinicStatus}><span /> Clinic is open <small>Until 6:00 PM</small></div>
          <button type="button" className={styles.signOut} onClick={onSignOut}><span>↪</span> Sign out</button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div><span className={styles.breadcrumb}>Workspace</span><span className={styles.breadcrumbSlash}>/</span><b>{title}</b></div>
          <div className={styles.topActions}>
            <span className={styles.todayLabel}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            <button type="button" className={styles.notification} aria-label={`Notifications, ${pendingCount} pending requests`} onClick={() => navigate('appointments')}>♧{pendingCount > 0 && <i>{pendingCount}</i>}</button>
            <button type="button" className={styles.topProfile} onClick={() => navigate('patients')}><span className={styles.avatarSmall}>AR</span> Dr. Andrea <span>⌄</span></button>
          </div>
        </header>

        <div className={styles.content}>
          {state.message && <div className={styles.message} role="status">{state.message}<button type="button" aria-label="Dismiss message" onClick={() => dispatch({ type: 'CLEAR_MESSAGE' })}>×</button></div>}

          {state.view === 'dashboard' && (
            <>
              <section className={styles.welcome}>
                <div><p className={styles.eyebrow}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</p><h1>Good morning, Dr. Andrea <span>☀</span></h1><p>Here’s what’s happening at your clinic today.</p></div>
                <button type="button" className={styles.primaryButton} onClick={() => navigate('calendar')}>＋&nbsp; View schedule</button>
              </section>

              <section className={styles.metrics} aria-label="Today's overview">
                <article className={styles.metricCard}><span className={styles.metricIcon}>▣</span><span>Appointments today</span><b>{appointmentsToday.length}</b><small>Across your schedule</small></article>
                <article className={styles.metricCard}><span className={`${styles.metricIcon} ${styles.purpleIcon}`}>◷</span><span>Pending requests</span><b>{pendingCount}</b><button type="button" className={styles.metricLink} onClick={() => navigate('appointments')}>Review requests →</button></article>
                <article className={styles.metricCard}><span className={`${styles.metricIcon} ${styles.blueIcon}`}>♡</span><span>My patients</span><b>{PATIENTS.length}</b><button type="button" className={styles.metricLink} onClick={() => navigate('patients')}>View directory →</button></article>
                <article className={styles.metricCard}><span className={`${styles.metricIcon} ${styles.goldIcon}`}>✓</span><span>Completed this week</span><b>{state.appointments.filter((item) => item.status === 'Completed').length}</b><small>Great work this week</small></article>
              </section>

              <section className={styles.dashboardGrid}>
                <article className={styles.panel}>
                  <div className={styles.panelHeader}><div><h2>Today’s appointments</h2><p>Your schedule for today</p></div><button type="button" className={styles.textButton} onClick={() => navigate('appointments')}>View all →</button></div>
                  <AppointmentTable appointments={appointmentsToday} onOpen={openAppointment} />
                </article>
                <article className={styles.panel}>
                  <div className={styles.panelHeader}><div><h2>Appointment requests</h2><p>Review and respond to new requests</p></div><span className={styles.requestCount}>{pendingCount} new</span></div>
                  <div className={styles.requestList}>
                    {state.appointments.filter((item) => item.status === 'Pending').map((item) => (
                      <div className={styles.request} key={item.id}>
                        <div className={styles.petAvatar}>{item.species === 'Dog' ? '🐕' : item.species === 'Cat' ? '🐈' : '🐇'}</div>
                        <div className={styles.requestInfo}><b>{item.pet} <span>· {item.owner}</span></b><small>{item.service} · {dateLabel(item.date)}, {item.time}</small></div>
                        <button type="button" className={styles.iconLink} aria-label={`Review ${item.pet} request`} onClick={() => openAppointment(item.id)}>›</button>
                      </div>
                    ))}
                    {pendingCount === 0 && <p className={styles.emptyNotice}>You’re all caught up. No requests need review.</p>}
                  </div>
                  <button type="button" className={styles.secondaryButton} onClick={() => navigate('appointments')}>Manage appointment requests</button>
                </article>
              </section>
            </>
          )}

          {state.view === 'appointments' && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}><div><h1>Appointments</h1><p>Review requests and manage your upcoming visits.</p></div><button type="button" className={styles.primaryButton} onClick={() => navigate('calendar')}>▦&nbsp; Open calendar</button></div>
              <div className={styles.appointmentSummary}><span><b>{pendingCount}</b> pending requests</span><span><b>{appointmentsToday.length}</b> today</span><span><b>{state.appointments.filter((item) => item.status === 'Confirmed').length}</b> confirmed</span></div>
              <AppointmentTable appointments={state.appointments.filter((item) => item.status !== 'Declined')} onOpen={openAppointment} />
            </section>
          )}

          {state.view === 'calendar' && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}><div><h1>Appointment calendar</h1><p>View your clinic schedule by week.</p></div><div className={styles.weekControls}><button type="button" aria-label="Previous week" onClick={() => dispatch({ type: 'MOVE_WEEK', amount: -1 })}>‹</button><button type="button" onClick={() => dispatch({ type: 'MOVE_WEEK', amount: -state.weekOffset })}>This week</button><button type="button" aria-label="Next week" onClick={() => dispatch({ type: 'MOVE_WEEK', amount: 1 })}>›</button></div></div>
              <div className={styles.calendar}>
                {weekDates.map((date) => {
                  const dayAppointments = state.appointments.filter((item) => item.date === date && item.status !== 'Declined');
                  return <article className={`${styles.calendarDay} ${date === today && state.weekOffset === 0 ? styles.currentDay : ''}`} key={date}>
                    <div className={styles.dayHeading}><span>{weekdayLabel(date)}</span><b>{new Date(`${date}T12:00:00`).getDate()}</b></div>
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
              <div className={styles.panelHeader}><div><h1>Patient directory</h1><p>Find patient profiles and review their recent visits.</p></div><span className={styles.patientTotal}>{PATIENTS.length} patients</span></div>
              <label className={styles.searchBox}><span>⌕</span><input value={state.search} onChange={(event) => dispatch({ type: 'SET_SEARCH', value: event.target.value })} placeholder="Search by pet, owner, or breed" aria-label="Search patients" /></label>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Patient</th><th>Owner</th><th>Breed</th><th>Age</th><th>Last visit</th><th /></tr></thead>
                  <tbody>{visiblePatients.map((patient) => <tr key={patient.id}>
                    <td><button type="button" className={styles.patientCell} onClick={() => dispatch({ type: 'OPEN_PATIENT', id: patient.id })}><span className={styles.petAvatar}>{patient.species === 'Dog' ? '🐕' : patient.species === 'Cat' ? '🐈' : '🐇'}</span><span><b>{patient.name}</b><small>{patient.species}</small></span></button></td>
                    <td>{patient.owner}</td><td>{patient.breed}</td><td>{patient.age}</td><td>{patient.lastVisit}</td>
                    <td><button type="button" className={styles.textButton} onClick={() => dispatch({ type: 'OPEN_PATIENT', id: patient.id })}>View profile →</button></td>
                  </tr>)}
                  {visiblePatients.length === 0 && <tr><td className={styles.empty} colSpan={6}>No patients found. Try a different search.</td></tr>}</tbody>
                </table>
              </div>
            </section>
          )}

          {state.view === 'patient-details' && selectedPatient && (
            <section className={styles.panel}>
              <button type="button" className={styles.backButton} onClick={() => navigate('patients')}>←&nbsp; Patient directory</button>
              <div className={styles.profileHeader}><span className={`${styles.petAvatar} ${styles.largePet}`}>{selectedPatient.species === 'Dog' ? '🐕' : selectedPatient.species === 'Cat' ? '🐈' : '🐇'}</span><div><h1>{selectedPatient.name}</h1><p>{selectedPatient.breed} · {selectedPatient.age} · {selectedPatient.species}</p><span>Patient ID: MFC-{selectedPatient.id.toUpperCase()}</span></div><button type="button" className={styles.secondaryButton} onClick={() => navigate('appointments')}>Book follow-up</button></div>
              <div className={styles.profileGrid}><article className={styles.detailCard}><h2>Owner information</h2><p><b>{selectedPatient.owner}</b><small>Pet owner</small></p><p><b>Contact through clinic</b><small>Contact details are protected</small></p></article><article className={styles.detailCard}><h2>Recent clinical notes</h2><p>{selectedPatient.note}</p><small>Last visit · {selectedPatient.lastVisit}</small></article></div>
              <div className={styles.panelHeader}><div><h2>Visit history</h2><p>Appointments for {selectedPatient.name}</p></div></div>
              <AppointmentTable appointments={state.appointments.filter((item) => item.pet === selectedPatient.name)} onOpen={openAppointment} />
            </section>
          )}

          {state.view === 'appointment-details' && selectedAppointment && (
            <section className={styles.panel}>
              <button type="button" className={styles.backButton} onClick={() => navigate('appointments')}>←&nbsp; Appointments</button>
              <div className={styles.panelHeader}><div><h1>{selectedAppointment.service}</h1><p>Appointment request · {selectedAppointment.id.toUpperCase()}</p></div><Status>{selectedAppointment.status}</Status></div>
              <div className={styles.detailGrid}>
                <article className={styles.detailCard}><h2>Visit details</h2><p><b>{selectedAppointment.pet}</b><small>{selectedAppointment.species}</small></p><p><b>{dateLabel(selectedAppointment.date)} · {selectedAppointment.time}</b><small>Requested appointment time</small></p><p><b>Reason for visit</b><small>{selectedAppointment.reason}</small></p></article>
                <article className={styles.detailCard}><h2>Pet owner</h2><p><b>{selectedAppointment.owner}</b><small>Registered pet owner</small></p><p><b>MFC PET LIFE Clinic</b><small>24 Mabini St., Davao City</small></p></article>
              </div>
              {selectedAppointment.status === 'Pending' && <div className={styles.detailActions}><button type="button" className={styles.secondaryButton} onClick={() => dispatch({ type: 'SET_APPOINTMENT_STATUS', id: selectedAppointment.id, status: 'Declined' })}>Decline request</button><button type="button" className={styles.primaryButton} onClick={() => dispatch({ type: 'SET_APPOINTMENT_STATUS', id: selectedAppointment.id, status: 'Confirmed' })}>✓&nbsp; Confirm appointment</button></div>}
              {selectedAppointment.status === 'Confirmed' && <div className={styles.confirmedNote}>This appointment is confirmed and added to your schedule.</div>}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
