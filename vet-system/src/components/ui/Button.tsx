import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'onDark' | 'ghostOnDark';
  /** `compact` = auto-width 48px button used for in-page actions (the form buttons stay full-width). */
  size?: 'default' | 'compact';
}

export function Button({ variant = 'primary', size = 'default', type = 'button', className, ...rest }: ButtonProps) {
  const classes = [styles.button, styles[variant], size === 'compact' && styles.compact, className].filter(Boolean).join(' ');
  return <button type={type} className={classes} {...rest} />;
}
