import { icons, type IconName } from '../../assets/icons';

interface IconProps {
  name: IconName;
  size: number;
  /** Override the rendered width when the SVG is not square (e.g. the eye icon). */
  width?: number;
  className?: string;
}

export function Icon({ name, size, width, className }: IconProps) {
  return (
    <img
      src={icons[name]}
      width={width ?? size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={className}
      style={{ display: 'block', flexShrink: 0, maxWidth: 'none' }}
    />
  );
}
