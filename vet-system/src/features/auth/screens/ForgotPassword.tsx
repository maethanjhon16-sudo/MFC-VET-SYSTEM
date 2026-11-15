import type { FormEvent } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { FooterPrompt } from '../../../components/ui/FooterPrompt';
import { TextField } from '../../../components/ui/TextField';
import { useForm } from '../../../hooks/useForm';
import { useRequestState } from '../../../hooks/useRequestState';
import { requestPasswordReset } from '../api';
import { AuthSubtitle, AuthTitle } from '../AuthText';
import type { ScreenProps } from '../types';
import styles from './Form.module.css';

interface ForgotPasswordProps extends Pick<ScreenProps, 'go'> {
  onRequested: (email: string) => void;
}

export function ForgotPassword({ go, onRequested }: ForgotPasswordProps) {
  const { values, setField } = useForm({ email: '' });
  const request = useRequestState();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    request.start();
    try {
      const email = values.email.trim();
      await requestPasswordReset(email);
      request.clear();
      onRequested(email);
    } catch (error) {
      request.fail(error);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Badge tone="sage">Account recovery</Badge>
      <AuthTitle>Reset your password</AuthTitle>
      <AuthSubtitle>Enter the email you registered with. The clinic administrator will confirm it’s you and give you a secure link to choose a new password.</AuthSubtitle>

      <TextField
        label="Email address"
        icon="mail"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="maria.santos@email.com"
        value={values.email}
        onChange={(value) => setField('email', value)}
        required
      />

      {request.error && <p className={styles.errorNotice} role="alert">{request.error}</p>}
      <Button type="submit" disabled={request.pending}>{request.pending ? 'Sending…' : 'Request Password Reset'}</Button>
      <FooterPrompt prompt="Remembered it?" actionLabel="Back to login" onAction={() => go('owner-login')} />
    </form>
  );
}
