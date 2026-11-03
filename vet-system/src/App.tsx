import { useCallback, useReducer } from 'react';
import { AuthFlow } from './features/auth/AuthFlow';
import type { ExitDestination } from './features/auth/types';
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

const DESTINATION_LABEL: Record<ExitDestination, string> = {
  'owner-home': 'Owner Home',
  'doctor-dashboard': 'Doctor Dashboard',
  'administrator-dashboard': 'Administrator Dashboard',
};

export function App() {
  const [state, dispatch] = useReducer(appReducer, { destination: null });
  const enter = useCallback((destination: ExitDestination) => dispatch({ type: 'ENTER', destination }), []);

  if (state.destination === null) {
    return <AuthFlow onExit={enter} />;
  }

  // Placeholder until the next frames are built.
  return (
    <main className={styles.placeholder}>
      <h1>{DESTINATION_LABEL[state.destination]}</h1>
      <p>This screen comes in the next pass.</p>
      <button type="button" onClick={() => dispatch({ type: 'SIGN_OUT' })}>
        Back to authentication
      </button>
    </main>
  );
}
