import { useCallback, useEffect, useReducer, type FormEvent } from 'react';
import {
  cancelOwnerAppointment,
  createOwnerAppointment,
  getBookingDoctors,
  getOwnerAppointments,
  getOwnerPets,
  type Appointment,
  type BookingDoctor,
  type OwnerPet,
} from '../../auth/api';
import { SERVICES, getService } from '../data';
import type { Service } from '../types';
import styles from './AppointmentScreens.module.css';

function manilaDate(offsetDays = 0): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const dateParts = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const date = new Date(`${dateParts.year}-${dateParts.month}-${dateParts.day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function serviceMinutes(service: Service): number {
  const durations: Record<string, number> = {
    consultation: 30,
    vaccination: 30,
    deworming: 30,
    confinement: 60,
    surgery: 240,
    'lab-test': 30,
    'home-service': 60,
    grooming: 90,
  };
  return durations[service.id] ?? 30;
}

function availableTimes(
  date: string,
  duration: number,
  doctors: BookingDoctor[],
  selectedDoctorId: string,
  includePast = false,
): string[] {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  const relevantDoctors = selectedDoctorId
    ? doctors.filter((doctor) => doctor.id === selectedDoctorId)
    : doctors;
  const schedules = relevantDoctors
    .map((doctor) => doctor.availability.find((item) => item.weekday === day))
    .filter((schedule) => schedule?.isAvailable);
  const times: string[] = [];
  for (let minutes = 0; minutes + duration <= 24 * 60; minutes += 30) {
    const fitsSchedule = schedules.some((schedule) => {
      if (!schedule) return false;
      const start = Number(schedule.startsAt.slice(0, 2)) * 60 + Number(schedule.startsAt.slice(3, 5));
      const end = Number(schedule.endsAt.slice(0, 2)) * 60 + Number(schedule.endsAt.slice(3, 5));
      return minutes >= start && minutes + duration <= end;
    });
    if (!fitsSchedule) continue;
    const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    if (includePast || new Date(`${date}T${time}:00+08:00`).getTime() > Date.now()) times.push(time);
  }
  return times;
}

function displayDate(value: string): string {
  return new Date(value).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function displayTime(value: string): string {
  return new Date(`2000-01-01T${value.slice(0, 5)}:00+08:00`).toLocaleTimeString('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

interface BookingState {
  petId: string;
  serviceId: string;
  doctorId: string;
  date: string;
  time: string;
  notes: string;
  doctors: BookingDoctor[];
  pets: OwnerPet[];
  loadingDoctors: boolean;
  loadingPets: boolean;
  submitting: boolean;
  error: string | null;
}

type BookingAction =
  | { type: 'SET_FIELD'; field: 'petId' | 'serviceId' | 'doctorId' | 'date' | 'time' | 'notes'; value: string }
  | { type: 'DOCTORS_LOADED'; doctors: BookingDoctor[] }
  | { type: 'DOCTORS_FAILED'; message: string }
  | { type: 'PETS_LOADED'; pets: OwnerPet[] }
  | { type: 'PETS_FAILED'; message: string }
  | { type: 'SUBMITTING' }
  | { type: 'FAILED'; message: string };

function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value, error: null };
    case 'DOCTORS_LOADED':
      return { ...state, doctors: action.doctors, loadingDoctors: false, error: null };
    case 'DOCTORS_FAILED':
      return { ...state, loadingDoctors: false, error: action.message };
    case 'PETS_LOADED':
      return {
        ...state,
        pets: action.pets,
        petId: state.petId || action.pets[0]?.id || '',
        loadingPets: false,
      };
    case 'PETS_FAILED':
      return { ...state, loadingPets: false, error: action.message };
    case 'SUBMITTING':
      return { ...state, submitting: true, error: null };
    case 'FAILED':
      return { ...state, submitting: false, error: action.message };
    default:
      return state;
  }
}

export function AppointmentBooking({
  serviceId,
  onCancel,
  onBooked,
  onManagePets,
}: {
  serviceId: string;
  onCancel: () => void;
  onBooked: () => void;
  onManagePets: () => void;
}) {
  const service = getService(serviceId);
  const [state, dispatch] = useReducer(bookingReducer, {
    petId: '',
    serviceId: service.id,
    doctorId: '',
    date: manilaDate(1),
    time: '09:00',
    notes: '',
    doctors: [],
    pets: [],
    loadingDoctors: true,
    loadingPets: true,
    submitting: false,
    error: null,
  });
  const slots = availableTimes(
    state.date,
    serviceMinutes(getService(state.serviceId)),
    state.doctors,
    state.doctorId,
  );
  const scheduledSlots = slots.length > 0 ? slots : availableTimes(
    state.date,
    serviceMinutes(getService(state.serviceId)),
    state.doctors,
    state.doctorId,
    true,
  );
  const selectedWeekday = new Date(`${state.date}T12:00:00Z`).getUTCDay();
  const selectedDoctor = state.doctors.find((doctor) => doctor.id === state.doctorId);
  const selectedDoctorDay = selectedDoctor?.availability.find((item) => item.weekday === selectedWeekday);

  const loadDoctors = useCallback(async () => {
    try {
      const { doctors } = await getBookingDoctors();
      dispatch({ type: 'DOCTORS_LOADED', doctors });
    } catch (error) {
      dispatch({ type: 'DOCTORS_FAILED', message: errorMessage(error, 'Could not load clinic veterinarians.') });
    }
  }, []);

  const loadPets = useCallback(async () => {
    try {
      const { pets } = await getOwnerPets();
      dispatch({ type: 'PETS_LOADED', pets });
    } catch (error) {
      dispatch({ type: 'PETS_FAILED', message: errorMessage(error, 'Could not load your pet profiles.') });
    }
  }, []);

  useEffect(() => {
    void loadDoctors();
    void loadPets();
  }, [loadDoctors, loadPets]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) void loadDoctors();
    };
    const timer = window.setInterval(refreshIfVisible, 30_000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('focus', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
    };
  }, [loadDoctors]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const petId = data.get('petId');
    const selectedService = data.get('serviceId');
    const selectedDoctor = data.get('doctorId');
    const date = data.get('date');
    const time = data.get('time');
    const notes = data.get('notes');
    if (
      typeof petId !== 'string'
      || typeof selectedService !== 'string'
      || typeof selectedDoctor !== 'string'
      || typeof date !== 'string'
      || typeof time !== 'string'
      || typeof notes !== 'string'
    ) {
      dispatch({ type: 'FAILED', message: 'Complete all required booking details.' });
      return;
    }

    dispatch({ type: 'SUBMITTING' });
    try {
      await createOwnerAppointment({
        petId,
        serviceId: selectedService,
        doctorId: selectedDoctor || null,
        scheduledAt: new Date(`${date}T${time}:00+08:00`).toISOString(),
        notes,
      });
      onBooked();
    } catch (error) {
      dispatch({ type: 'FAILED', message: errorMessage(error, 'Could not submit the appointment request.') });
    }
  };

  const selectedService = getService(state.serviceId);
  const maxDate = manilaDate(90);

  if (state.loadingPets) {
    return <p className={styles.empty} aria-live="polite">Loading your pet profiles…</p>;
  }

  if (state.pets.length === 0) {
    return (
      <div className={styles.page}>
        <header className={styles.heading}>
          <div><span className={styles.eyebrow}>APPOINTMENTS</span><h1>Book an appointment</h1></div>
          <button type="button" className={styles.secondaryButton} onClick={onCancel}>My appointments</button>
        </header>
        <section className={`${styles.card} ${styles.emptyCard}`}>
          <h2>Add a pet profile first</h2>
          <p>Appointments are linked to your pet’s saved profile so the veterinarian can see the right patient.</p>
          <button type="button" className={styles.primaryButton} onClick={onManagePets}>Go to My Pets</button>
          {state.error && <p className={styles.error} role="alert">{state.error}</p>}
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>APPOINTMENTS</span>
          <h1>Book an appointment</h1>
          <p>Choose your pet’s service and preferred visit time.</p>
        </div>
        <button type="button" className={styles.secondaryButton} onClick={onCancel}>My appointments</button>
      </header>

      <form className={styles.bookingLayout} onSubmit={submit}>
        <section className={styles.card}>
          <div className={styles.sectionHeading}><span>1</span><div><h2>Visit details</h2><p>Tell us which pet needs care.</p></div></div>
          <div className={styles.fields}>
            <label className={styles.field}>
              <span>Pet</span>
              <select
                name="petId"
                required
                value={state.petId}
                onChange={(event) => dispatch({ type: 'SET_FIELD', field: 'petId', value: event.target.value })}
              >
                {state.pets.map((pet) => (
                  <option key={pet.id} value={pet.id}>
                    {pet.name} · {pet.species}{pet.breed ? `, ${pet.breed}` : ''}
                  </option>
                ))}
              </select>
              <small>Need to add another pet? Add a profile from the home page.</small>
            </label>
            <label className={styles.field}>
              <span>Service</span>
              <select
                name="serviceId"
                required
                value={state.serviceId}
                onChange={(event) => dispatch({ type: 'SET_FIELD', field: 'serviceId', value: event.target.value })}
              >
                {SERVICES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className={styles.field}>
              <span>Preferred veterinarian</span>
              <select
                name="doctorId"
                value={state.doctorId}
                onChange={(event) => dispatch({ type: 'SET_FIELD', field: 'doctorId', value: event.target.value })}
                disabled={state.loadingDoctors}
              >
                <option value="">Any available veterinarian</option>
                {state.doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.fullName}{doctor.specialization ? ` · ${doctor.specialization}` : ''}
                  </option>
                ))}
              </select>
              <small>Only approved, active clinic doctors are listed.</small>
              {selectedDoctor && (
                <small>
                  {selectedDoctorDay?.isAvailable
                    ? `${selectedDoctor.fullName} is scheduled ${displayTime(selectedDoctorDay.startsAt)}–${displayTime(selectedDoctorDay.endsAt)} on this date.`
                    : `${selectedDoctor.fullName} is not scheduled on this date.`}
                </small>
              )}
            </label>
            <div className={styles.fieldRow}>
              <label className={styles.field}>
                <span>Preferred date</span>
                <input
                  type="date"
                  name="date"
                  required
                  min={manilaDate()}
                  max={maxDate}
                  value={state.date}
                  onChange={(event) => {
                    const date = event.target.value;
                    const nextSlots = availableTimes(
                      date,
                      serviceMinutes(selectedService),
                      state.doctors,
                      state.doctorId,
                    );
                    dispatch({ type: 'SET_FIELD', field: 'date', value: date });
                    if (!nextSlots.includes(state.time) && nextSlots[0]) {
                      dispatch({ type: 'SET_FIELD', field: 'time', value: nextSlots[0] });
                    }
                  }}
                />
              </label>
              <label className={styles.field}>
                <span>Preferred time</span>
                <select
                  name="time"
                  required
                  value={slots.includes(state.time) ? state.time : slots[0] ?? ''}
                  onChange={(event) => dispatch({ type: 'SET_FIELD', field: 'time', value: event.target.value })}
                  disabled={slots.length === 0}
                >
                  {slots.length === 0 && <option value="">No available times for this date</option>}
                  {slots.map((time) => (
                    <option key={time} value={time}>
                      {new Date(`2000-01-01T${time}:00+08:00`).toLocaleTimeString('en-PH', {
                        timeZone: 'Asia/Manila',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </option>
                  ))}
                </select>
                {slots.length === 0 && (
                  <small>
                    {scheduledSlots.length === 0
                      ? 'No veterinarian is scheduled for this date and service duration.'
                      : 'No future appointment times remain on this date. Choose another date.'}
                  </small>
                )}
                <small>Appointment times use Philippine local time (UTC+8).</small>
              </label>
            </div>
            <label className={styles.field}>
              <span>Reason for visit <small>Optional</small></span>
              <textarea name="notes" maxLength={500} rows={4} placeholder="Share symptoms or anything the vet should know." />
            </label>
          </div>
        </section>

        <aside className={`${styles.card} ${styles.summary}`}>
          <span className={styles.summaryIcon}>{selectedService.emoji}</span>
          <h2>{selectedService.name}</h2>
          <p>{selectedService.blurb}</p>
          <div className={styles.summaryLine}><span>Starting price</span><b>₱{selectedService.price.toLocaleString('en-PH')}</b></div>
          <div className={styles.summaryLine}><span>Visit duration</span><b>{selectedService.duration}</b></div>
          <div className={styles.clinicNote}>
            <b>Request, not confirmed yet</b>
            <span>The clinic will review your preferred time and confirm the appointment.</span>
          </div>
          {state.error && <p className={styles.error} role="alert">{state.error}</p>}
          {state.loadingDoctors && <p className={styles.helper} aria-live="polite">Loading clinic veterinarians…</p>}
          <button type="submit" className={styles.primaryButton} disabled={state.submitting || state.loadingDoctors || slots.length === 0}>
            {state.submitting ? 'Sending request…' : 'Request appointment'}
          </button>
          <button type="button" className={styles.cancelButton} onClick={onCancel}>Cancel</button>
        </aside>
      </form>
    </div>
  );
}

interface AppointmentListState {
  appointments: Appointment[];
  loading: boolean;
  cancellingId: string | null;
  error: string | null;
  message: string | null;
}

type AppointmentListAction =
  | { type: 'LOADED'; appointments: Appointment[] }
  | { type: 'LOAD_FAILED'; message: string }
  | { type: 'CANCELLING'; id: string }
  | { type: 'CANCELLED'; id: string }
  | { type: 'CANCEL_FAILED'; message: string };

function appointmentListReducer(state: AppointmentListState, action: AppointmentListAction): AppointmentListState {
  switch (action.type) {
    case 'LOADED':
      return { ...state, appointments: action.appointments, loading: false, error: null };
    case 'LOAD_FAILED':
      return { ...state, loading: false, error: action.message };
    case 'CANCELLING':
      return { ...state, cancellingId: action.id, error: null, message: null };
    case 'CANCELLED':
      return {
        ...state,
        appointments: state.appointments.map((item) => item.id === action.id ? { ...item, status: 'cancelled' } : item),
        cancellingId: null,
        message: 'Appointment request cancelled.',
      };
    case 'CANCEL_FAILED':
      return { ...state, cancellingId: null, error: action.message };
    default:
      return state;
  }
}

const STATUS_LABEL: Record<Appointment['status'], string> = {
  pending: 'Awaiting confirmation',
  confirmed: 'Confirmed',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

export function OwnerAppointments({ onBook, onCancel }: { onBook: () => void; onCancel: () => void }) {
  const [state, dispatch] = useReducer(appointmentListReducer, {
    appointments: [],
    loading: true,
    cancellingId: null,
    error: null,
    message: null,
  });

  const load = useCallback(async () => {
    try {
      const { appointments } = await getOwnerAppointments();
      dispatch({ type: 'LOADED', appointments });
    } catch (error) {
      dispatch({ type: 'LOAD_FAILED', message: errorMessage(error, 'Could not load your appointments.') });
    }
  }, []);

  useEffect(() => {
    void load();
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) void load();
    };
    const timer = window.setInterval(refreshIfVisible, 30_000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('focus', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
    };
  }, [load]);

  const cancel = async (id: string) => {
    dispatch({ type: 'CANCELLING', id });
    try {
      await cancelOwnerAppointment(id);
      dispatch({ type: 'CANCELLED', id });
    } catch (error) {
      dispatch({ type: 'CANCEL_FAILED', message: errorMessage(error, 'Could not cancel this appointment.') });
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>YOUR VISITS</span>
          <h1>My appointments</h1>
          <p>Review appointment requests and confirmed visits.</p>
        </div>
        <div className={styles.headingActions}>
          <button type="button" className={styles.secondaryButton} onClick={() => void load()}>Refresh</button>
          <button type="button" className={styles.primaryButton} onClick={onBook}>＋&nbsp; Book appointment</button>
        </div>
      </header>
      {state.error && <p className={styles.error} role="alert">{state.error}</p>}
      {state.message && <p className={styles.success} role="status">{state.message}</p>}
      <section className={styles.list}>
        {state.loading
          ? <p className={styles.empty}>Loading your appointments…</p>
          : state.appointments.length === 0
            ? <div className={`${styles.card} ${styles.emptyCard}`}><h2>No appointments yet</h2><p>Your submitted requests and confirmed visits will appear here.</p><button type="button" className={styles.primaryButton} onClick={onBook}>Book your first visit</button></div>
            : state.appointments.map((appointment) => (
              <article className={`${styles.card} ${styles.appointment}`} key={appointment.id}>
                <div className={styles.dateMark}>
                  <span>{new Date(appointment.scheduledAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short' }).toUpperCase()}</span>
                  <b>{new Date(appointment.scheduledAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', day: 'numeric' })}</b>
                </div>
                <div className={styles.appointmentInfo}>
                  <h2>{appointment.petName} · {appointment.serviceName}</h2>
                  <p>{displayDate(appointment.scheduledAt)}</p>
                  <span>{appointment.doctorName ? `Dr. ${appointment.doctorName.replace(/^Dr\.?\s*/i, '')}` : 'Any available veterinarian'}</span>
                  {appointment.notes && <small>{appointment.notes}</small>}
                </div>
                <span className={`${styles.status} ${styles[appointment.status]}`}>{STATUS_LABEL[appointment.status]}</span>
                {appointment.status === 'pending' && (
                  <button
                    type="button"
                    className={styles.cancelRequest}
                    disabled={state.cancellingId !== null}
                    onClick={() => void cancel(appointment.id)}
                  >
                    {state.cancellingId === appointment.id ? 'Cancelling…' : 'Cancel request'}
                  </button>
                )}
              </article>
            ))}
      </section>
      <button type="button" className={styles.backButton} onClick={onCancel}>←&nbsp; Back to home</button>
    </div>
  );
}
