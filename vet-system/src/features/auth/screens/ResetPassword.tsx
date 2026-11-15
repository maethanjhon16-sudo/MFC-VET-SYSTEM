import type { FormEvent } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { FooterPrompt } from '../../../components/ui/FooterPrompt';
import { PasswordField } from '../../../components/ui/PasswordField';
import { useForm } from '../../../hooks/useForm';
import { useRequestState } from '../../../hooks/useRequestState';
import { confirmPasswordReset } from '../api';
import { AuthSubtitle, AuthTitle } from '../AuthText';
import type { ScreenProps } from '../types';
import styles from './Form.module.css';

interface ResetPasswordProps extends Pick<ScreenProps, 'go'> {
  token: string;
  onUpdated: (role: 'owner' | 'doctor') => void;
}

/** Opened from the one-time link an administrator issues; the token comes from the URL fragment. */
export function ResetPassword({ go, token, onUpdated }: ResetPasswordProps) {
  const { values, setField } = useForm({ password: '', confirm: '' });
  const request = useRequestState();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (values.password !== values.confirm) {
      request.fail(new Error('The two passwords don’t match.'));
      return;
    }
    request.start();
    try {
      const { role } = await confirmPasswordReset({ token, password: values.password });
      request.clear();
      onUpdated(role);
    } catch (error) {
      request.fail(error);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Badge tone="sage">Account recovery</Badge>
      <AuthTitle>Choose a new password</AuthTitle>
      <AuthSubtitle>Use at least 8 characters. You’ll be signed out of any other devices.</AuthSubtitle>

      <PasswordField
        label="New password"
        name="new-password"
        autoComplete="new-password"
        value={values.password}
        onChange={(value) => setField('password', value)}
        minLength={8}
        maxLength={128}
        required
      />
      <PasswordField
        label="Confirm new password"
        name="confirm-password"
        autoComplete="new-password"
        value={values.confirm}
        onChange={(value) => setField('confirm', value)}
        minLength={8}
        maxLength={128}
        required
      />

      {request.error && <p className={styles.errorNotice} role="alert">{request.error}</p>}
      <Button type="submit" disabled={request.pending}>{request.pending ? 'Saving…' : 'Update Password'}</Button>
      <FooterPrompt prompt="Link not working?" actionLabel="Request a new one" onAction={() => go('forgot-password')} />
    </form>
  );
}
