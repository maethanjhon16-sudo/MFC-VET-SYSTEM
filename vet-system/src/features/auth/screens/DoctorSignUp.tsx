import type { FormEvent } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import { FieldRow } from '../../../components/ui/Field';
import { FooterPrompt } from '../../../components/ui/FooterPrompt';
import { PasswordField } from '../../../components/ui/PasswordField';
import { RoleSwitch } from '../../../components/ui/RoleSwitch';
import { SelectField } from '../../../components/ui/SelectField';
import { TextField } from '../../../components/ui/TextField';
import { useForm } from '../../../hooks/useForm';
import { useRequestState } from '../../../hooks/useRequestState';
import { register } from '../api';
import { AuthTitle } from '../AuthText';
import type { ScreenProps } from '../types';
import styles from './Form.module.css';

/** Figma shows "Small Animal Medicine" selected; the rest of the list is a placeholder set. */
export const SPECIALIZATIONS = [
  'Small Animal Medicine',
  'Large Animal Medicine',
  'Surgery',
  'Dermatology',
  'Exotic Pets',
  'Emergency & Critical Care',
] as const;

interface DoctorSignUpProps extends Pick<ScreenProps, 'go'> {
  onSubmitted: (at: number) => void;
}

export function DoctorSignUp({ go, onSubmitted }: DoctorSignUpProps) {
  const request = useRequestState();
  const { values, setField, toggleField } = useForm<{
    fullName: string;
    email: string;
    contact: string;
    prcLicense: string;
    specialization: string;
    password: string;
    confirmPassword: string;
    acceptedTerms: boolean;
  }>({
    fullName: '',
    email: '',
    contact: '',
    prcLicense: '',
    specialization: SPECIALIZATIONS[0],
    password: '',
    confirmPassword: '',
    acceptedTerms: false,
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
        role: 'doctor',
        fullName: values.fullName,
        email: values.email,
        phone: values.contact,
        prcLicense: values.prcLicense,
        specialization: values.specialization,
        password: values.password,
        acceptedTerms: values.acceptedTerms,
      });
      onSubmitted(Date.now());
    } catch (error) {
      request.fail(error);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Badge tone="lav">Vet Doctor registration</Badge>
      <AuthTitle>Doctor registration</AuthTitle>

      <RoleSwitch active="doctor" onSelect={(role) => role === 'owner' && go('owner-signup')} />

      <FieldRow>
        <TextField
          label="Full name"
          icon="user"
          name="fullName"
          autoComplete="name"
          placeholder="Dr. Andrea Reyes"
          value={values.fullName}
          onChange={(value) => setField('fullName', value)}
          required
        />
        <TextField
          label="Email address"
          icon="mail"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="dr.reyes@mfcpetlife.ph"
          value={values.email}
          onChange={(value) => setField('email', value)}
          required
        />
      </FieldRow>

      <FieldRow>
        <TextField
          label="Contact number"
          icon="phone"
          name="contact"
          type="tel"
          autoComplete="tel"
          placeholder="+63 918 555 0199"
          value={values.contact}
          onChange={(value) => setField('contact', value)}
          required
        />
        <TextField
          label="PRC license number"
          icon="shield"
          name="prcLicense"
          inputMode="numeric"
          placeholder="0012345"
          value={values.prcLicense}
          onChange={(value) => setField('prcLicense', value)}
          required
        />
      </FieldRow>

      <SelectField
        label="Specialization"
        icon="pulse-field"
        name="specialization"
        options={SPECIALIZATIONS}
        value={values.specialization}
        onChange={(value) => setField('specialization', value)}
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
      <Button type="submit" disabled={request.pending}>{request.pending ? 'Submitting…' : 'Submit for Approval'}</Button>
      <FooterPrompt prompt="Already registered?" actionLabel="Log in" onAction={() => go('doctor-login')} />
    </form>
  );
}
