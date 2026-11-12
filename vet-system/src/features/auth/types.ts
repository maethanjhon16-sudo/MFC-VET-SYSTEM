import type { AuthUser } from './api';

/** One entry per frame in the Figma "1 · AUTHENTICATION (Shared)" section. */
export type AuthScreen =
  | 'role-selection'
  | 'owner-login'
  | 'doctor-login'
  | 'admin-login'
  | 'owner-signup'
  | 'doctor-signup'
  | 'forgot-password'
  | 'registration-confirmation'
  | 'reset-link-sent'
  | 'doctor-pending-approval';

/** Screens that live outside the Authentication frame (built in later passes). */
export type ExitDestination = 'owner-home' | 'doctor-dashboard' | 'administrator-dashboard';

export interface ScreenProps {
  go: (screen: AuthScreen) => void;
  exit: (destination: ExitDestination, user?: AuthUser) => void;
}
