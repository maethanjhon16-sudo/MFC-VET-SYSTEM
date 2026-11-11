import { useCallback, useEffect, useReducer } from 'react';
import { AuthFlow } from './features/auth/AuthFlow';
import type { ExitDestination } from './features/auth/types';
import { getCurrentUser, logout } from './features/auth/api';
import { OwnerFlow } from './features/owner/OwnerFlow';
import { DoctorFlow } from './features/doctor/DoctorFlow';
import { AdminFlow } from './features/admin/AdminFlow';
import styles from './App.module.css';

type AppState = { destination: ExitDestination | null; checkingSession: boolean; notice: string | null };
type AppAction =
  | { type: 'SESSION_READY'; destination: ExitDestination | null }
  | { type: 'SESSION_FAILED'; message: string }
  | { type: 'ENTER'; destination: ExitDestination }
  | { type: 'SIGN_OUT'; notice?: string };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SESSION_READY':
      return { destination: action.destination, checkingSession: false, notice: null };
    case 'SESSION_FAILED':
      return { destination: null, checkingSession: false, notice: action.message };
    case 'ENTER':
      return { destination: action.destination, checkingSession: false, notice: null };
    case 'SIGN_OUT':
      return { destination: null, checkingSession: false, notice: action.notice ?? null };
    default:
      return state;
  }
}

const DESTINATION_LABEL: Record<Exclude<ExitDestination, 'owner-home'>, string> = {
  'doctor-dashboard': 'Doctor Dashboard',
  'administrator-dashboard': 'Administrator Dashboard',
};

export function App() {
  const [state, dispatch] = useReducer(appReducer, { destination: null, checkingSession: true, notice: null });

  useEffect(() => {
    let active = true;
    getCurrentUser().then(({ user }) => {
      if (!active) return;
      const destination = user?.role === 'owner'
        ? 'owner-home'
        : user?.role === 'doctor'
          ? 'doctor-dashboard'
          : user?.role === 'admin'
            ? 'administrator-dashboard'
            : null;
      dispatch({ type: 'SESSION_READY', destination });
    }).catch((error: unknown) => {
      if (!active) return;
      dispatch({
        type: 'SESSION_FAILED',
        message: error instanceof Error ? error.message : 'Could not verify the current session.',
      });
    });
    return () => { active = false; };
  }, []);

  const enter = useCallback((destination: ExitDestination) => dispatch({ type: 'ENTER', destination }), []);
  const signOut = useCallback(async () => {
    try {
      await logout();
      dispatch({ type: 'SIGN_OUT' });
    } catch (error) {
      dispatch({
        type: 'SIGN_OUT',
        notice: error instanceof Error
          ? `${error.message} Your server session may still be active.`
          : 'Could not end the server session. Your server session may still be active.',
      });
    }
  }, []);

  if (state.checkingSession) {
    return <main className={styles.placeholder} aria-live="polite"><p>Checking your session…</p></main>;
  }

  if (state.destination === null) {
    return <AuthFlow onExit={enter} notice={state.notice} />;
  }

  // Page 2 of the Figma file: Pet Owner — Home, Services & Shop.
  if (state.destination === 'owner-home') {
    return <OwnerFlow onSignOut={signOut} />;
  }
  if (state.destination === 'doctor-dashboard') {
    return <DoctorFlow onSignOut={signOut} />;
  }
  if (state.destination === 'administrator-dashboard') {
    return <AdminFlow onSignOut={signOut} />;
  }

  return <main className={styles.placeholder}><h1>{DESTINATION_LABEL[state.destination]}</h1></main>;
}
