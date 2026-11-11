import { icons, type IconName } from '../../assets/icons';

interface IconProps {
  name: IconName;
  size: number;
  /** Override the rendered width when the SVG is not square (e.g. the eye icon). */
  width?: number;
  className?: string;
}

/**
 * A few Figma icons overflow their frame slightly (stroke caps); Figma places the SVG with a
 * negative inset inside the icon frame. Same values as the design (top right bottom left).
 */
const INSET: Partial<Record<IconName, string>> = {
  cart: '-1.39% -1.39% 0 -1.39%',
  'btn-cart': '-1.39% -1.39% 0 -1.39%',
  'btn-cart-white': '-1.39% -1.39% 0 -1.39%',
  bell: '0 0 -1.39% 0',
  'info-pin': '-1.39% 0',
  truck: '0 -0.38%',
};

export function Icon({ name, size, width, className }: IconProps) {
  const w = width ?? size;
  const inset = INSET[name];

  if (inset) {
    return (
      <span
        className={className}
        style={{ position: 'relative', display: 'block', flexShrink: 0, width: w, height: size }}
      >
        <img
          src={icons[name]}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{ position: 'absolute', inset, display: 'block', maxWidth: 'none', width: 'auto', height: 'auto' }}
        />
      </span>
    );
  }

  return (
    <img
      src={icons[name]}
      width={w}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={className}
      style={{ display: 'block', flexShrink: 0, maxWidth: 'none' }}
    />
  );
}
