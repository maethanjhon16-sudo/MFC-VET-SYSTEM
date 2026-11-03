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

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmitted(Date.now());
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
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
        />
        <TextField
          label="PRC license number"
          icon="shield"
          name="prcLicense"
          inputMode="numeric"
          placeholder="0012345"
          value={values.prcLicense}
          onChange={(value) => setField('prcLicense', value)}
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
        />
        <PasswordField
          label="Confirm password"
          name="confirmPassword"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={(value) => setField('confirmPassword', value)}
        />
      </FieldRow>

      <Checkbox checked={values.acceptedTerms} onChange={() => toggleField('acceptedTerms')} name="acceptedTerms">
        I agree to the Terms of Service and Privacy Policy
      </Checkbox>

      <Button type="submit">Submit for Approval</Button>
      <FooterPrompt prompt="Already registered?" actionLabel="Log in" onAction={() => go('doctor-login')} />
    </form>
  );
}
