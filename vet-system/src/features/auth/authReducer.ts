import type { AuthScreen } from './types';

export interface AuthState {
  screen: AuthScreen;
  /** Email entered on Forgot Password, shown on Reset Link Sent. */
  resetEmail: string;
  /** Epoch ms when the doctor application was submitted (Doctor Pending Approval). */
  doctorSubmittedAt: number | null;
}

export type AuthAction =
  | { type: 'NAVIGATE'; to: AuthScreen }
  | { type: 'RESET_LINK_REQUESTED'; email: string }
  | { type: 'DOCTOR_APPLICATION_SUBMITTED'; at: number };

export function createInitialState(screen: AuthScreen = 'role-selection'): AuthState {
  return { screen, resetEmail: '', doctorSubmittedAt: null };
}

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, screen: action.to };
    case 'RESET_LINK_REQUESTED':
      return { ...state, resetEmail: action.email, screen: 'reset-link-sent' };
    case 'DOCTOR_APPLICATION_SUBMITTED':
      return { ...state, doctorSubmittedAt: action.at, screen: 'doctor-pending-approval' };
    default:
      return state;
  }
}
