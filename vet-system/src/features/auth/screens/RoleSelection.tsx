import type { IconName } from '../../../assets/icons';
import { Icon } from '../../../components/ui/Icon';
import { FooterPrompt } from '../../../components/ui/FooterPrompt';
import { AuthSubtitle, AuthTitle } from '../AuthText';
import type { AuthScreen, ScreenProps } from '../types';
import styles from './RoleSelection.module.css';

interface RoleCard {
  title: string;
  description: string;
  icon: IconName;
  tone: 'sage' | 'lav';
  to: AuthScreen;
}

const ROLES: readonly RoleCard[] = [
  {
    title: 'Pet Owner',
    description: 'Manage pets, book visits, shop supplies.',
    icon: 'paw-card',
    tone: 'sage',
    to: 'owner-login',
  },
  {
    title: 'Vet Doctor',
    description: 'Patients, clinical records & schedule.',
    icon: 'pulse-card',
    tone: 'lav',
    to: 'doctor-login',
  },
];

export function RoleSelection({ go }: Pick<ScreenProps, 'go'>) {
  return (
    <div className={styles.stack}>
      <AuthTitle>Welcome! Who are you?</AuthTitle>
      <AuthSubtitle>Choose your role to continue to your MFC PET LIFE workspace.</AuthSubtitle>

      {ROLES.map((role) => (
        <button key={role.title} type="button" className={styles.card} onClick={() => go(role.to)}>
          <span className={`${styles.iconBox} ${styles[role.tone]}`}>
            <Icon name={role.icon} size={30} />
          </span>
          <span className={styles.text}>
            <span className={styles.cardTitle}>{role.title}</span>
            <span className={styles.cardDescription}>{role.description}</span>
          </span>
          <Icon name="chev" size={22} />
        </button>
      ))}

      <div className={styles.footer}>
        <FooterPrompt prompt="New to MFC PET LIFE?" actionLabel="Create account" onAction={() => go('owner-signup')} />
        <FooterPrompt prompt="Clinic administrator?" actionLabel="Admin sign-in" onAction={() => go('admin-login')} />
      </div>
    </div>
  );
}
