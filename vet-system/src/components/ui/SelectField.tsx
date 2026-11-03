import { useId } from 'react';
import type { IconName } from '../../assets/icons';
import { Field } from './Field';
import { Icon } from './Icon';
import control from './Control.module.css';
import styles from './SelectField.module.css';

interface SelectFieldProps {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  icon?: IconName;
  name?: string;
}

export function SelectField({ label, value, options, onChange, icon, name }: SelectFieldProps) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <div className={`${control.control} ${styles.wrap}`}>
        {icon && <Icon name={icon} size={18} />}
        <select
          id={id}
          name={name}
          className={`${control.input} ${styles.select}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <Icon name="chev-field" size={18} className={styles.chev} />
      </div>
    </Field>
  );
}
