import { Icon } from './Icon';
import styles from './RoleSwitch.module.css';

export type Role = 'owner' | 'doctor';

interface RoleSwitchProps {
  active: Role;
  onSelect: (role: Role) => void;
}

const OPTIONS: ReadonlyArray<{ role: Role; label: string }> = [
  { role: 'owner', label: 'Pet Owner' },
  { role: 'doctor', label: 'Vet Doctor' },
];

export function RoleSwitch({ active, onSelect }: RoleSwitchProps) {
  return (
    <div className={styles.switch} role="group" aria-label="Choose your role">
      {OPTIONS.map(({ role, label }) => {
        const isActive = role === active;
        const icon = role === 'owner'
          ? (isActive ? 'paw-forest' : 'paw-mute')
          : (isActive ? 'pulse-forest' : 'pulse-mute');
        return (
          <button
            key={role}
            type="button"
            aria-pressed={isActive}
            className={`${styles.option} ${isActive ? styles.active : ''}`}
            onClick={() => onSelect(role)}
          >
            <Icon name={icon} size={18} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
