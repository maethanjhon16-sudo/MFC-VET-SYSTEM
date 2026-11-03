import { StatusScreen } from './StatusScreen';
import type { ScreenProps } from '../types';

export function RegistrationConfirmation({ go, exit }: ScreenProps) {
  return (
    <StatusScreen
      icon="check-green"
      tone="ok"
      title="All set!"
      description="Your Pet Owner account has been created. Welcome to the MFC PET LIFE family."
      actions={[
        { label: 'Go to Pet Owner Home', variant: 'primary', onClick: () => exit('owner-home') },
        { label: 'Back to Login', variant: 'secondary', onClick: () => go('owner-login') },
      ]}
    />
  );
}
