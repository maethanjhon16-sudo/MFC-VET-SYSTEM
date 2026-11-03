import type { ButtonHTMLAttributes } from 'react';
import styles from './LinkButton.module.css';

export function LinkButton({ className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={[styles.link, className].filter(Boolean).join(' ')} {...rest} />;
}
