import { LinkButton } from './LinkButton';
import styles from './FooterPrompt.module.css';

interface FooterPromptProps {
  prompt: string;
  actionLabel: string;
  onAction: () => void;
}

/** "Muted question  Purple action" row used at the bottom of every auth form. */
export function FooterPrompt({ prompt, actionLabel, onAction }: FooterPromptProps) {
  return (
    <p className={styles.row}>
      <span className={styles.prompt}>{prompt}</span>
      <LinkButton onClick={onAction}>{actionLabel}</LinkButton>
    </p>
  );
}
