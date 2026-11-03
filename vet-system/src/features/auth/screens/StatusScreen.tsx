import type { ReactNode } from 'react';
import type { IconName } from '../../../assets/icons';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { AuthSubtitle, AuthTitle } from '../AuthText';
import styles from './StatusScreen.module.css';

export interface StatusAction {
  label: string;
  variant: 'primary' | 'secondary';
  onClick: () => void;
}

interface StatusScreenProps {
  icon: IconName;
  tone: 'ok' | 'lav' | 'warn';
  title: string;
  description: string;
  actions: readonly StatusAction[];
  children?: ReactNode;
}

/** Centered icon + title + message + stacked buttons, shared by the three status frames. */
export function StatusScreen({ icon, tone, title, description, actions, children }: StatusScreenProps) {
  return (
    <div className={styles.status}>
      <div className={`${styles.iconCircle} ${styles[tone]}`}>
        <Icon name={icon} size={44} />
      </div>
      <AuthTitle centered>{title}</AuthTitle>
      <AuthSubtitle centered>{description}</AuthSubtitle>
      {children}
      {actions.map((action) => (
        <Button key={action.label} variant={action.variant} onClick={action.onClick}>
          {action.label}
        </Button>
      ))}
    </div>
  );
}
