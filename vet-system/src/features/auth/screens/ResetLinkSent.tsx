import { StatusScreen } from './StatusScreen';
import type { ScreenProps } from '../types';

interface ResetLinkSentProps extends Pick<ScreenProps, 'go'> {
  email: string;
}

export function ResetLinkSent({ go, email }: ResetLinkSentProps) {
  const target = email || 'that email address';
  return (
    <StatusScreen
      icon="mail-lg"
      tone="lav"
      title="Request received"
      description={`If ${target} belongs to an account, the clinic administrator has been notified. They’ll verify it’s you and send you a secure reset link, which works once and expires after 60 minutes.`}
      actions={[
        { label: 'Back to Owner Login', variant: 'primary', onClick: () => go('owner-login') },
        { label: 'Doctor Login', variant: 'secondary', onClick: () => go('doctor-login') },
      ]}
    />
  );
}
