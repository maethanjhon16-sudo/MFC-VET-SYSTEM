import { useCallback, useReducer } from 'react';
import { AuthLayout } from './AuthLayout';
import { authReducer, createInitialState } from './authReducer';
import { DoctorPendingApproval } from './screens/DoctorPendingApproval';
import { DoctorSignUp } from './screens/DoctorSignUp';
import { ForgotPassword } from './screens/ForgotPassword';
import { LoginScreen } from './screens/LoginScreen';
import { OwnerSignUp } from './screens/OwnerSignUp';
import { PasswordUpdated } from './screens/PasswordUpdated';
import { RegistrationConfirmation } from './screens/RegistrationConfirmation';
import { ResetLinkSent } from './screens/ResetLinkSent';
import { ResetPassword } from './screens/ResetPassword';
import { RoleSelection } from './screens/RoleSelection';
import type { AuthUser } from './api';
import type { AuthScreen, ExitDestination } from './types';

interface AuthFlowProps {
  initialScreen?: AuthScreen;
  /** Called when the user leaves Authentication (e.g. after logging in). */
  onExit: (destination: ExitDestination, user?: AuthUser) => void;
  notice?: string | null;
  /** One-time token from an administrator-issued reset link. */
  resetToken?: string | null;
}

export function AuthFlow({ initialScreen = 'role-selection', onExit, notice, resetToken = null }: AuthFlowProps) {
  const [state, dispatch] = useReducer(authReducer, initialScreen, createInitialState);

  const go = useCallback((to: AuthScreen) => dispatch({ type: 'NAVIGATE', to }), []);
  const nav = { go, exit: onExit };

  return (
    <AuthLayout notice={notice}>
      {(() => {
        switch (state.screen) {
          case 'role-selection':
            return <RoleSelection go={go} />;
          case 'owner-login':
            return <LoginScreen variant="owner" {...nav} />;
          case 'doctor-login':
            return <LoginScreen variant="doctor" {...nav} />;
          case 'admin-login':
            return <LoginScreen variant="admin" {...nav} />;
          case 'owner-signup':
            return <OwnerSignUp go={go} />;
          case 'doctor-signup':
            return (
              <DoctorSignUp
                go={go}
                onSubmitted={(at) => dispatch({ type: 'DOCTOR_APPLICATION_SUBMITTED', at })}
              />
            );
          case 'forgot-password':
            return <ForgotPassword go={go} onRequested={(email) => dispatch({ type: 'RESET_LINK_REQUESTED', email })} />;
          case 'registration-confirmation':
            return <RegistrationConfirmation {...nav} />;
          case 'reset-link-sent':
            return <ResetLinkSent go={go} email={state.resetEmail} />;
          case 'reset-password':
            return resetToken
              ? <ResetPassword go={go} token={resetToken} onUpdated={(role) => dispatch({ type: 'PASSWORD_UPDATED', role })} />
              : <ForgotPassword go={go} onRequested={(email) => dispatch({ type: 'RESET_LINK_REQUESTED', email })} />;
          case 'password-updated':
            return <PasswordUpdated go={go} role={state.resetRole} />;
          case 'doctor-pending-approval':
            return <DoctorPendingApproval {...nav} submittedAt={state.doctorSubmittedAt} />;
        }
      })()}
    </AuthLayout>
  );
}
