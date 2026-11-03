import type { FormEvent } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import { FooterPrompt } from '../../../components/ui/FooterPrompt';
import { LinkButton } from '../../../components/ui/LinkButton';
import { PasswordField } from '../../../components/ui/PasswordField';
import { RoleSwitch } from '../../../components/ui/RoleSwitch';
import { TextField } from '../../../components/ui/TextField';
import { useForm } from '../../../hooks/useForm';
import { AuthSubtitle, AuthTitle } from '../AuthText';
import type { AuthScreen, ExitDestination, ScreenProps } from '../types';
import styles from './Form.module.css';

type LoginVariant = 'owner' | 'doctor' | 'admin';

interface LoginConfig {
  badge: string;
  badgeTone: 'sage' | 'lav';
  title: string;
  subtitle: string;
  identifierPlaceholder: string;
  showRoleSwitch: boolean;
  onLogin: ExitDestination;
  footer: { prompt: string; action: string; to: AuthScreen };
}

const CONFIG: Record<LoginVariant, LoginConfig> = {
  owner: {
    badge: 'Pet Owner portal',
    badgeTone: 'sage',
    title: 'Welcome back',
    subtitle: 'Log in to manage your pets, appointments and orders.',
    identifierPlaceholder: 'maria.santos@email.com',
    showRoleSwitch: true,
    onLogin: 'owner-home',
    footer: { prompt: 'Don’t have an account?', action: 'Sign up', to: 'owner-signup' },
  },
  doctor: {
    badge: 'Vet Doctor workspace',
    badgeTone: 'lav',
    title: 'Doctor sign in',
    subtitle: 'Access patients, clinical records and your schedule.',
    identifierPlaceholder: 'dr.reyes@mfcpetlife.ph',
    showRoleSwitch: true,
    onLogin: 'doctor-dashboard',
    footer: { prompt: 'New doctor?', action: 'Request an account', to: 'doctor-signup' },
  },
  admin: {
    badge: 'Administrator workspace',
    badgeTone: 'lav',
    title: 'Administrator sign in',
    subtitle: 'Restricted to authorized clinic administrators.',
    identifierPlaceholder: 'admin@mfcpetlife.ph',
    showRoleSwitch: false,
    onLogin: 'administrator-dashboard',
    footer: { prompt: 'Not an administrator?', action: 'Choose another role', to: 'role-selection' },
  },
};

interface LoginScreenProps extends ScreenProps {
  variant: LoginVariant;
}

export function LoginScreen({ variant, go, exit }: LoginScreenProps) {
  const config = CONFIG[variant];
  const { values, setField, toggleField } = useForm({ identifier: '', password: '', remember: true });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    exit(config.onLogin);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <Badge tone={config.badgeTone}>{config.badge}</Badge>
      <AuthTitle>{config.title}</AuthTitle>
      <AuthSubtitle>{config.subtitle}</AuthSubtitle>

      {config.showRoleSwitch && (
        <RoleSwitch
          active={variant === 'doctor' ? 'doctor' : 'owner'}
          onSelect={(role) => go(role === 'owner' ? 'owner-login' : 'doctor-login')}
        />
      )}

      <TextField
        label="Email or username"
        icon="mail"
        name="identifier"
        autoComplete="username"
        value={values.identifier}
        placeholder={config.identifierPlaceholder}
        onChange={(value) => setField('identifier', value)}
      />
      <PasswordField
        label="Password"
        name="password"
        value={values.password}
        onChange={(value) => setField('password', value)}
      />

      <div className={styles.options}>
        <Checkbox checked={values.remember} onChange={() => toggleField('remember')} name="remember">
          Remember me
        </Checkbox>
        <LinkButton onClick={() => go('forgot-password')} style={{ fontSize: 13 }}>
          Forgot password?
        </LinkButton>
      </div>

      <Button type="submit">Log In</Button>
      <FooterPrompt
        prompt={config.footer.prompt}
        actionLabel={config.footer.action}
        onAction={() => go(config.footer.to)}
      />
    </form>
  );
}
