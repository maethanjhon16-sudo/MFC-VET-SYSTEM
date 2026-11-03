import { Icon } from '../../../components/ui/Icon';
import { StatusScreen } from './StatusScreen';
import type { ScreenProps } from '../types';
import styles from './DoctorPendingApproval.module.css';

interface DoctorPendingApprovalProps extends ScreenProps {
  submittedAt: number | null;
}

export function formatSubmittedAt(timestamp: number | null): string {
  if (timestamp === null) return 'Just now';
  const date = new Date(timestamp);
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}

export function DoctorPendingApproval({ go, exit, submittedAt }: DoctorPendingApprovalProps) {
  return (
    <StatusScreen
      icon="clock"
      tone="warn"
      title="Registration pending"
      description="Awaiting administrator approval. You can preview the workspace in the meantime."
      actions={[
        { label: 'Preview Doctor Workspace', variant: 'primary', onClick: () => exit('doctor-dashboard') },
        { label: 'Back to Login', variant: 'secondary', onClick: () => go('doctor-login') },
      ]}
    >
      <ol className={styles.card} aria-label="Approval status">
        <li className={styles.step}>
          <span className={`${styles.dot} ${styles.done}`}>
            <Icon name="check-white" size={14} />
          </span>
          <span className={styles.text}>
            <span className={styles.stepTitle}>Application submitted</span>
            <span className={styles.stepNote}>{formatSubmittedAt(submittedAt)}</span>
          </span>
        </li>
        <li className={styles.step}>
          <span className={styles.dot}>2</span>
          <span className={styles.text}>
            <span className={styles.stepTitle}>Credential review</span>
            <span className={styles.stepNote}>In progress · Admin team</span>
          </span>
        </li>
        <li className={styles.step}>
          <span className={styles.dot}>3</span>
          <span className={styles.text}>
            <span className={styles.stepTitle}>Account activated</span>
            <span className={styles.stepNote}>You will be notified by email</span>
          </span>
        </li>
      </ol>
    </StatusScreen>
  );
}
