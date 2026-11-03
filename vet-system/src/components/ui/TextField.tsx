import { useId, type HTMLInputTypeAttribute } from 'react';
import type { IconName } from '../../assets/icons';
import { Field } from './Field';
import { Icon } from './Icon';
import control from './Control.module.css';

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: IconName;
  type?: HTMLInputTypeAttribute;
  name?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'numeric';
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  icon,
  type = 'text',
  name,
  autoComplete,
  inputMode,
}: TextFieldProps) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <div className={control.control}>
        {icon && <Icon name={icon} size={18} />}
        <input
          id={id}
          name={name}
          type={type}
          className={control.input}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </Field>
  );
}
