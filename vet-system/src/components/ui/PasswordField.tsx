import { useId, useReducer } from 'react';
import { Field } from './Field';
import { Icon } from './Icon';
import control from './Control.module.css';
import styles from './PasswordField.module.css';

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  name?: string;
  autoComplete?: 'current-password' | 'new-password';
}

type VisibilityAction = { type: 'TOGGLE_VISIBILITY' };

export function visibilityReducer(visible: boolean, action: VisibilityAction): boolean {
  return action.type === 'TOGGLE_VISIBILITY' ? !visible : visible;
}

/** Figma component "Password · Input" — variants Visible=No / Visible=Yes. */
export function PasswordField({
  label,
  value,
  onChange,
  placeholder = '••••••••••',
  name,
  autoComplete = 'current-password',
}: PasswordFieldProps) {
  const id = useId();
  const [visible, dispatch] = useReducer(visibilityReducer, false);

  return (
    <Field label={label} htmlFor={id}>
      <div className={control.control}>
        <Icon name="lock" size={18} />
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          className={`${control.input} ${styles.input}`}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className={styles.toggle}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => dispatch({ type: 'TOGGLE_VISIBILITY' })}
        >
          {/* The Figma eye SVG is ~2.8% wider than tall */}
          <Icon name={visible ? 'eye-off' : 'eye'} size={18} width={18.5} />
        </button>
      </div>
    </Field>
  );
}
