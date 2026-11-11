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

type ForgotPasswordProps = Pick<ScreenProps, 'go'>;

export function ForgotPassword({ go }: ForgotPasswordProps) {
  const { values, setField } = useForm({ email: '' });
  const request = useRequestState();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    request.start();
    try {
      await requestPasswordReset(values.email.trim());
    } catch (error) {
      request.fail(error);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Badge tone="sage">Account recovery</Badge>
      <AuthTitle>Reset your password</AuthTitle>
      <AuthSubtitle>Password reset by email is not available yet. Please contact the clinic administrator.</AuthSubtitle>

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
      <Button type="submit" disabled={request.pending}>{request.pending ? 'Sending…' : 'Send Reset Link'}</Button>
      <FooterPrompt prompt="Remembered it?" actionLabel="Back to login" onAction={() => go('owner-login')} />
    </form>
  );
}
