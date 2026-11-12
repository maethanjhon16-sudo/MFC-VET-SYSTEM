import { useCallback, useEffect, useReducer } from 'react';
import {
  decideStaffAppointment,
  getStaffAppointments,
  getStaffDoctors,
  type Appointment,
  type BookingDoctor,
} from '../auth/api';
import styles from './StaffAppointmentQueue.module.css';

type QueueState = {
  appointments: Appointment[];
  doctors: BookingDoctor[];
  loading: boolean;
  savingId: string | null;
  error: string | null;
  message: string | null;
};

type QueueAction =
  | { type: 'LOADED'; appointments: Appointment[]; doctors: BookingDoctor[] }
  | { type: 'LOAD_FAILED'; message: string }
  | { type: 'SAVING'; id: string }
  | { type: 'DECIDED'; id: string; decision: 'confirm' | 'decline' }
  | { type: 'SAVE_FAILED'; message: string }
  | { type: 'CLEAR_MESSAGE' };

function queueReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case 'LOADED':
      return { ...state, appointments: action.appointments, doctors: action.doctors, loading: false, error: null };
    case 'LOAD_FAILED':
      return { ...state, loading: false, error: action.message };
    case 'SAVING':
      return { ...state, savingId: action.id, error: null, message: null };
    case 'DECIDED':
      return {
        ...state,
        appointments: state.appointments.filter((item) => item.id !== action.id),
        savingId: null,
        message: action.decision === 'confirm' ? 'Appointment confirmed and added to the schedule.' : 'Appointment request declined.',
      };
    case 'SAVE_FAILED':
      return { ...state, savingId: null, error: action.message };
    case 'CLEAR_MESSAGE':
      return { ...state, message: null };
    default:
      return state;
  }
}

function localDate(value: string): string {
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

export function StaffAppointmentQueue({
  role,
  onChanged,
}: {
  role: 'admin' | 'doctor';
  onChanged?: () => void;
}) {
  const [state, dispatch] = useReducer(queueReducer, {
    appointments: [],
    doctors: [],
    loading: true,
    savingId: null,
    error: null,
    message: null,
  });
  const isAdmin = role === 'admin';

  const load = useCallback(async () => {
    try {
      const [{ appointments }, { doctors }] = await Promise.all([
        getStaffAppointments(),
        isAdmin ? getStaffDoctors() : Promise.resolve({ doctors: [] }),
      ]);
      dispatch({ type: 'LOADED', appointments, doctors });
    } catch (error) {
      dispatch({
        type: 'LOAD_FAILED',
        message: error instanceof Error ? error.message : 'Could not load appointment requests.',
      });
    }
  }, [isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (appointment: Appointment, decision: 'confirm' | 'decline', selectElement?: HTMLSelectElement) => {
    const doctorId = isAdmin
      ? selectElement?.value || appointment.doctorId || state.doctors[0]?.id
      : undefined;
    if (decision === 'confirm' && isAdmin && !doctorId) {
      dispatch({ type: 'SAVE_FAILED', message: 'Approve a doctor account before confirming an appointment.' });
      return;
    }

    dispatch({ type: 'SAVING', id: appointment.id });
    try {
      await decideStaffAppointment(appointment.id, decision, doctorId);
      dispatch({ type: 'DECIDED', id: appointment.id, decision });
      onChanged?.();
    } catch (error) {
      dispatch({
        type: 'SAVE_FAILED',
        message: error instanceof Error ? error.message : 'Could not update this appointment request.',
      });
    }
  };

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>ONLINE BOOKINGS</span>
          <h2>Appointment requests</h2>
          <p>Review requested times and confirm after checking the clinic schedule.</p>
        </div>
        <button type="button" className={styles.refresh} onClick={() => void load()}>↻ Refresh</button>
      </header>
      {state.error && <p className={styles.error} role="alert">{state.error}</p>}
      {state.message && <p className={styles.success} role="status">{state.message}<button type="button" onClick={() => dispatch({ type: 'CLEAR_MESSAGE' })}>×</button></p>}
      {state.loading
        ? <p className={styles.empty}>Loading appointment requests…</p>
        : state.appointments.length === 0
          ? <p className={styles.empty}>No pending online appointment requests.</p>
          : <div className={styles.list}>
            {state.appointments.map((appointment) => {
              const doctorId = appointment.doctorId ?? state.doctors[0]?.id ?? '';
              return (
                <article className={styles.request} key={appointment.id}>
                  <div className={styles.petIcon}>🐾</div>
                  <div className={styles.details}>
                    <h3>{appointment.petName} · {appointment.serviceName}</h3>
                    <p>{localDate(appointment.scheduledAt)}</p>
                    <span>Owner: {appointment.ownerName} · {appointment.ownerPhone}</span>
                    {appointment.notes && <small>Visit note: {appointment.notes}</small>}
                    {appointment.doctorName && <small>Requested doctor: {appointment.doctorName}</small>}
                    {isAdmin && (
                      <label className={styles.assign}>
                        Assign veterinarian
                        <select
                          defaultValue={doctorId}
                          aria-label={`Assign a veterinarian for ${appointment.petName}`}
                          disabled={state.doctors.length === 0}
                        >
                          {state.doctors.length === 0 && <option value="">No active doctors available</option>}
                          {state.doctors.map((doctor) => (
                            <option key={doctor.id} value={doctor.id}>
                              {doctor.fullName}{doctor.specialization ? ` · ${doctor.specialization}` : ''}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.decline}
                      disabled={state.savingId !== null}
                      onClick={() => void decide(appointment, 'decline')}
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      className={styles.confirm}
                      disabled={state.savingId !== null || (isAdmin && state.doctors.length === 0)}
                      onClick={(event) => {
                        const select = event.currentTarget.closest('article')?.querySelector('select') ?? undefined;
                        void decide(appointment, 'confirm', select);
                      }}
                    >
                      {state.savingId === appointment.id ? 'Saving…' : 'Confirm'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>}
    </section>
  );
}
