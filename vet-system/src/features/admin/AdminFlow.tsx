import { useCallback, useEffect, useReducer } from 'react';
import { approveDoctorApplication, getDoctorApplications, type DoctorApplication } from '../auth/api';
import { StaffAppointmentQueue } from '../appointments/StaffAppointmentQueue';
import styles from './AdminFlow.module.css';

interface AdminState {
  applications: DoctorApplication[];
  loading: boolean;
  approvingId: string | null;
  error: string | null;
  message: string | null;
}

type AdminAction =
  | { type: 'LOADED'; applications: DoctorApplication[] }
  | { type: 'LOAD_FAILED'; message: string }
  | { type: 'APPROVING'; id: string }
  | { type: 'APPROVED'; id: string }
  | { type: 'APPROVAL_FAILED'; message: string }
  | { type: 'DISMISS_MESSAGE' };

function adminReducer(state: AdminState, action: AdminAction): AdminState {
  switch (action.type) {
    case 'LOADED':
      return { ...state, applications: action.applications, loading: false, error: null };
    case 'LOAD_FAILED':
      return { ...state, loading: false, error: action.message };
    case 'APPROVING':
      return { ...state, approvingId: action.id, error: null, message: null };
    case 'APPROVED':
      return {
        ...state,
        applications: state.applications.filter((application) => application.id !== action.id),
        approvingId: null,
        message: 'Doctor account approved. They can now sign in.',
      };
    case 'APPROVAL_FAILED':
      return { ...state, approvingId: null, error: action.message };
    case 'DISMISS_MESSAGE':
      return { ...state, message: null };
    default:
      return state;
  }
}

interface AdminFlowProps {
  adminName: string;
  onSignOut: () => void;
}

export function AdminFlow({ adminName, onSignOut }: AdminFlowProps) {
  const [state, dispatch] = useReducer(adminReducer, {
    applications: [],
    loading: true,
    approvingId: null,
    error: null,
    message: null,
  });

  const loadApplications = useCallback(async () => {
    try {
      const { applications } = await getDoctorApplications();
      dispatch({ type: 'LOADED', applications });
    } catch (error) {
      dispatch({
        type: 'LOAD_FAILED',
        message: error instanceof Error ? error.message : 'Could not load doctor applications.',
      });
    }
  }, []);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const approve = async (id: string) => {
    dispatch({ type: 'APPROVING', id });
    try {
      await approveDoctorApplication(id);
      dispatch({ type: 'APPROVED', id });
    } catch (error) {
      dispatch({
        type: 'APPROVAL_FAILED',
        message: error instanceof Error ? error.message : 'Could not approve this doctor.',
      });
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}><span>✚</span><b>MFC PET LIFE</b><small>ADMINISTRATION</small></div>
        <div className={styles.headerRight}><span>{adminName}</span><button type="button" onClick={onSignOut}>Sign out</button></div>
      </header>
      <main className={styles.content}>
        <div className={styles.heading}>
          <div><p>CLINIC WORKSPACE</p><h1>Administrator dashboard</h1><span>Review doctor account requests and manage clinic access.</span></div>
          <button type="button" onClick={() => void loadApplications()}>↻&nbsp; Refresh</button>
        </div>
        {state.error && <div className={styles.error} role="alert">{state.error}</div>}
        {state.message && <div className={styles.success} role="status">{state.message}<button type="button" onClick={() => dispatch({ type: 'DISMISS_MESSAGE' })}>×</button></div>}
        <StaffAppointmentQueue role="admin" />
        <section className={styles.panel}>
          <div className={styles.panelHeading}><div><h2>Doctor applications</h2><p>Approve a doctor before they can access the clinical workspace.</p></div><b>{state.applications.length} pending</b></div>
          {state.loading ? <p className={styles.empty}>Loading applications…</p>
            : state.applications.length === 0 && !state.error
              ? <p className={styles.empty}>No pending applications right now.</p>
              : <div className={styles.list}>
                {state.applications.map((application) => (
                  <article className={styles.card} key={application.id}>
                    <div className={styles.doctorMark}>{application.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')}</div>
                    <div className={styles.details}>
                      <h3>{application.fullName}</h3>
                      <p>{application.specialization}</p>
                      <div><span>{application.email}</span><span>{application.phone}</span><span>PRC {application.prcLicense}</span></div>
                      <small>Submitted {new Date(application.submittedAt).toLocaleDateString()}</small>
                    </div>
                    <button type="button" disabled={state.approvingId !== null} onClick={() => void approve(application.id)}>
                      {state.approvingId === application.id ? 'Approving…' : 'Approve doctor'}
                    </button>
                  </article>
                ))}
              </div>}
        </section>
        <p className={styles.securityNote}>Only approve accounts after independently verifying the doctor’s identity and PRC license.</p>
      </main>
    </div>
  );
}
