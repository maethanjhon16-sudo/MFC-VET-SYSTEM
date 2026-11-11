import { useCallback, useReducer } from 'react';
import { AuthFlow } from './features/auth/AuthFlow';
import type { ExitDestination } from './features/auth/types';
import { OwnerFlow } from './features/owner/OwnerFlow';
import styles from './App.module.css';

type AppState = { destination: ExitDestination | null };
type AppAction = { type: 'ENTER'; destination: ExitDestination } | { type: 'SIGN_OUT' };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ENTER':
      return { destination: action.destination };
    case 'SIGN_OUT':
      return { destination: null };
    default:
      return state;
  }
}

const DESTINATION_LABEL: Record<Exclude<ExitDestination, 'owner-home'>, string> = {
  'doctor-dashboard': 'Doctor Dashboard',
  'administrator-dashboard': 'Administrator Dashboard',
};

export function App() {
  const [state, dispatch] = useReducer(appReducer, { destination: null });
  const enter = useCallback((destination: ExitDestination) => dispatch({ type: 'ENTER', destination }), []);
  const signOut = useCallback(() => dispatch({ type: 'SIGN_OUT' }), []);

  if (state.destination === null) {
    return <AuthFlow onExit={enter} />;
  }

  // Page 2 of the Figma file: Pet Owner — Home, Services & Shop.
  if (state.destination === 'owner-home') {
    return <OwnerFlow onSignOut={signOut} />;
  }

  // Placeholder until the doctor / administrator frames are built.
  return (
    <main className={styles.placeholder}>
      <h1>{DESTINATION_LABEL[state.destination]}</h1>
      <p>This screen comes in the next pass.</p>
      <button type="button" onClick={signOut}>
        Back to authentication
      </button>
    </main>
  );
}
