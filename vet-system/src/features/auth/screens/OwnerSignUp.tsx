import type { FormEvent } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import { FieldRow } from '../../../components/ui/Field';
import { FooterPrompt } from '../../../components/ui/FooterPrompt';
import { PasswordField } from '../../../components/ui/PasswordField';
import { RoleSwitch } from '../../../components/ui/RoleSwitch';
import { TextField } from '../../../components/ui/TextField';
import { useForm } from '../../../hooks/useForm';
import { useRequestState } from '../../../hooks/useRequestState';
import { register } from '../api';
import { AuthTitle } from '../AuthText';
import type { ScreenProps } from '../types';
import styles from './Form.module.css';

export function OwnerSignUp({ go }: Pick<ScreenProps, 'go'>) {
  const request = useRequestState();
  const { values, setField, toggleField } = useForm({
    fullName: '',
    email: '',
    contact: '',
    province: '',
    city: '',
    barangay: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false, // starts unticked, as in the design
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (values.password !== values.confirmPassword) {
      request.fail(new Error('Passwords do not match.'));
      return;
    }
    request.start();
    try {
      await register({
        role: 'owner',
        fullName: values.fullName,
        email: values.email,
        phone: values.contact,
        province: values.province,
        city: values.city,
        barangay: values.barangay,
        password: values.password,
        acceptedTerms: values.acceptedTerms,
      });
      go('registration-confirmation');
    } catch (error) {
      request.fail(error);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Badge tone="sage">Pet Owner account</Badge>
      <AuthTitle>Create account</AuthTitle>

      <RoleSwitch active="owner" onSelect={(role) => role === 'doctor' && go('doctor-signup')} />

      <TextField
        label="Full name"
        icon="user"
        name="fullName"
        autoComplete="name"
        placeholder="Maria Santos"
        value={values.fullName}
        onChange={(value) => setField('fullName', value)}
        required
      />

      <FieldRow>
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
        <TextField
          label="Contact number"
          icon="phone"
          name="contact"
          type="tel"
          autoComplete="tel"
          placeholder="+63 917 555 0142"
          value={values.contact}
          onChange={(value) => setField('contact', value)}
          required
        />
      </FieldRow>

      <FieldRow>
        <TextField
          label="Province"
          name="province"
          autoComplete="address-level1"
          placeholder="Cotabato"
          value={values.province}
          onChange={(value) => setField('province', value)}
          required
        />
        <TextField
          label="City / Municipality"
          name="city"
          autoComplete="address-level2"
          placeholder="Kidapawan City"
          value={values.city}
          onChange={(value) => setField('city', value)}
          required
        />
      </FieldRow>

      <TextField
        label="Barangay"
        name="barangay"
        autoComplete="address-level3"
        placeholder="Poblacion"
        value={values.barangay}
        onChange={(value) => setField('barangay', value)}
        required
      />

      <FieldRow>
        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          value={values.password}
          onChange={(value) => setField('password', value)}
          minLength={8}
          maxLength={128}
          required
        />
        <PasswordField
          label="Confirm password"
          name="confirmPassword"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={(value) => setField('confirmPassword', value)}
          minLength={8}
          maxLength={128}
          required
        />
      </FieldRow>

      <Checkbox checked={values.acceptedTerms} onChange={() => toggleField('acceptedTerms')} name="acceptedTerms" required>
        I agree to the Terms of Service and Privacy Policy
      </Checkbox>

      {request.error && <p className={styles.errorNotice} role="alert">{request.error}</p>}
      <Button type="submit" disabled={request.pending}>{request.pending ? 'Creating account…' : 'Create Account'}</Button>
      <FooterPrompt prompt="Already have an account?" actionLabel="Log in" onAction={() => go('owner-login')} />
    </form>
  );
}
