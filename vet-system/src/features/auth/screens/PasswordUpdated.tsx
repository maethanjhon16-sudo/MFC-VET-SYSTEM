import { StatusScreen } from './StatusScreen';
import type { ScreenProps } from '../types';

interface PasswordUpdatedProps extends Pick<ScreenProps, 'go'> {
  role: 'owner' | 'doctor';
}

export function PasswordUpdated({ go, role }: PasswordUpdatedProps) {
  const primary = role === 'doctor'
    ? { label: 'Go to Doctor Login', to: 'doctor-login' as const }
    : { label: 'Go to Owner Login', to: 'owner-login' as const };
  return (
    <StatusScreen
      icon="check-green"
      tone="ok"
      title="Password updated"
      description="Your password has been changed and other devices were signed out. Log in with your new password."
      actions={[{ label: primary.label, variant: 'primary', onClick: () => go(primary.to) }]}
    />
  );
}
