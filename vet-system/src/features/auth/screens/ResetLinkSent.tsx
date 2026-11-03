import { StatusScreen } from './StatusScreen';
import type { ScreenProps } from '../types';

interface ResetLinkSentProps extends Pick<ScreenProps, 'go'> {
  email: string;
}

export function ResetLinkSent({ go, email }: ResetLinkSentProps) {
  const target = email || 'your email address';
  return (
    <StatusScreen
      icon="mail-lg"
      tone="lav"
      title="Check your email"
      description={`We sent a password reset link to ${target}. It expires in 30 minutes.`}
      actions={[
        { label: 'Back to Owner Login', variant: 'primary', onClick: () => go('owner-login') },
        { label: 'Doctor Login', variant: 'secondary', onClick: () => go('doctor-login') },
      ]}
    />
  );
}
