import { useCallback, useEffect, useReducer } from 'react';
import { AuthFlow } from './features/auth/AuthFlow';
import type { ExitDestination } from './features/auth/types';
import { getCurrentUser, logout, type AuthUser } from './features/auth/api';
import { OwnerFlow } from './features/owner/OwnerFlow';
import { DoctorFlow } from './features/doctor/DoctorFlow';
import { AdminFlow } from './features/admin/AdminFlow';
import styles from './App.module.css';

type AppState = {
  destination: ExitDestination | null;
  user: AuthUser | null;
  checkingSession: boolean;
  notice: string | null;
};
type AppAction =
  | { type: 'SESSION_READY'; destination: ExitDestination | null; user: AuthUser | null }
  | { type: 'SESSION_FAILED'; message: string }
  | { type: 'ENTER'; user: AuthUser }
  | { type: 'UPDATE_USER_NAME'; fullName: string }
  | { type: 'SIGN_OUT'; notice?: string };

function destinationFor(user: AuthUser | null): ExitDestination | null {
  if (user?.role === 'owner') return 'owner-home';
  if (user?.role === 'doctor') return 'doctor-dashboard';
  if (user?.role === 'admin') return 'administrator-dashboard';
  return null;
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SESSION_READY':
      return { destination: action.destination, user: action.user, checkingSession: false, notice: null };
    case 'SESSION_FAILED':
      return { destination: null, user: null, checkingSession: false, notice: action.message };
    case 'ENTER':
      return { destination: destinationFor(action.user), user: action.user, checkingSession: false, notice: null };
    case 'UPDATE_USER_NAME':
      return state.user ? { ...state, user: { ...state.user, fullName: action.fullName } } : state;
    case 'SIGN_OUT':
      return { destination: null, user: null, checkingSession: false, notice: action.notice ?? null };
    default:
      return state;
  }
}

const DESTINATION_LABEL: Record<ExitDestination, string> = {
  'owner-home': 'Pet Owner Home',
  'doctor-dashboard': 'Doctor Dashboard',
  'administrator-dashboard': 'Administrator Dashboard',
};

export function App() {
  const [state, dispatch] = useReducer(appReducer, {
    destination: null,
    user: null,
    checkingSession: true,
    notice: null,
  });

  useEffect(() => {
    let active = true;
    getCurrentUser().then(({ user }) => {
      if (!active) return;
      dispatch({ type: 'SESSION_READY', destination: destinationFor(user), user });
    }).catch((error: unknown) => {
      if (!active) return;
      dispatch({
        type: 'SESSION_FAILED',
        message: error instanceof Error ? error.message : 'Could not verify the current session.',
      });
    });
    return () => { active = false; };
  }, []);

  const enter = useCallback(async (_destination: ExitDestination, signedInUser?: AuthUser) => {
    try {
      const user = signedInUser ?? (await getCurrentUser()).user;
      if (!user) throw new Error('Your sign-in session could not be found. Please log in again.');
      dispatch({ type: 'ENTER', user });
    } catch (error) {
      dispatch({
        type: 'SESSION_FAILED',
        message: error instanceof Error ? error.message : 'Could not verify the current session.',
      });
    }
  }, []);
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
  if (state.destination === 'owner-home' && state.user?.role === 'owner') {
    return (
      <OwnerFlow
        ownerId={state.user.id}
        ownerName={state.user.fullName}
        onOwnerNameUpdated={(fullName) => dispatch({ type: 'UPDATE_USER_NAME', fullName })}
        onSignOut={signOut}
      />
    );
  }
  if (state.destination === 'doctor-dashboard' && state.user?.role === 'doctor') {
    return <DoctorFlow doctorName={state.user.fullName} onSignOut={signOut} />;
  }
  if (state.destination === 'administrator-dashboard' && state.user?.role === 'admin') {
    return <AdminFlow adminName={state.user.fullName} onSignOut={signOut} />;
  }

  return <main className={styles.placeholder}><h1>{DESTINATION_LABEL[state.destination]}</h1></main>;
}
