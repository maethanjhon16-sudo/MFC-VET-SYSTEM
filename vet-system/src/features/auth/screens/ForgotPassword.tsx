import type { FormEvent } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { FooterPrompt } from '../../../components/ui/FooterPrompt';
import { TextField } from '../../../components/ui/TextField';
import { useForm } from '../../../hooks/useForm';
import { AuthSubtitle, AuthTitle } from '../AuthText';
import type { ScreenProps } from '../types';
import styles from './Form.module.css';

interface ForgotPasswordProps extends Pick<ScreenProps, 'go'> {
  onRequested: (email: string) => void;
}

export function ForgotPassword({ go, onRequested }: ForgotPasswordProps) {
  const { values, setField } = useForm({ email: '' });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onRequested(values.email.trim());
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <Badge tone="sage">Account recovery</Badge>
      <AuthTitle>Reset your password</AuthTitle>
      <AuthSubtitle>Enter the email linked to your account and we’ll send a reset link.</AuthSubtitle>

      <TextField
        label="Email address"
        icon="mail"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="maria.santos@email.com"
        value={values.email}
        onChange={(value) => setField('email', value)}
      />

      <Button type="submit">Send Reset Link</Button>
      <FooterPrompt prompt="Remembered it?" actionLabel="Back to login" onAction={() => go('owner-login')} />
    </form>
  );
}
