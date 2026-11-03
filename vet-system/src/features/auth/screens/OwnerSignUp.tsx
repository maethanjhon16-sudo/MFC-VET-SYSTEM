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
import { AuthTitle } from '../AuthText';
import type { ScreenProps } from '../types';
import styles from './Form.module.css';

export function OwnerSignUp({ go }: Pick<ScreenProps, 'go'>) {
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

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    go('registration-confirmation');
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
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
        />
      </FieldRow>

      <FieldRow>
        <TextField
          label="Province"
          name="province"
          autoComplete="address-level1"
          placeholder="Davao del Sur"
          value={values.province}
          onChange={(value) => setField('province', value)}
        />
        <TextField
          label="City / Municipality"
          name="city"
          autoComplete="address-level2"
          placeholder="Davao City"
          value={values.city}
          onChange={(value) => setField('city', value)}
        />
      </FieldRow>

      <TextField
        label="Barangay"
        name="barangay"
        autoComplete="address-level3"
        placeholder="Poblacion District"
        value={values.barangay}
        onChange={(value) => setField('barangay', value)}
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

      <Button type="submit">Create Account</Button>
      <FooterPrompt prompt="Already have an account?" actionLabel="Log in" onAction={() => go('owner-login')} />
    </form>
  );
}
