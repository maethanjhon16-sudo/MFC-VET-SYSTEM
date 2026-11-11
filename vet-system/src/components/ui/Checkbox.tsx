import type { ReactNode } from 'react';
import { Icon } from './Icon';
import styles from './Checkbox.module.css';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  name?: string;
  required?: boolean;
}

/** Figma component "Checkbox" (checked=true / checked=false) with its label. */
export function Checkbox({ checked, onChange, children, name, required = false }: CheckboxProps) {
  return (
    <label className={styles.root}>
      <input
        type="checkbox"
        name={name}
        className={styles.native}
        checked={checked}
        required={required}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={`${styles.box} ${checked ? styles.checked : ''}`}>
        {checked && <Icon name="check-white" size={14} />}
      </span>
      <span className={styles.label}>{children}</span>
    </label>
  );
}
