import type { CSSProperties } from 'react';
import { TONES } from '../../features/owner/data';
import type { Tone } from '../../features/owner/types';
import styles from './Photo.module.css';

interface PhotoProps {
  emoji: string;
  tone: Tone;
  /** Emoji font size in px. */
  size: number;
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
}

/** Placeholder "photo" from the design: a vertical gradient with a centered emoji. */
export function Photo({ emoji, tone, size, width, height, radius, className }: PhotoProps) {
  const [from, to] = TONES[tone];
  const style = {
    '--from': from,
    '--to': to,
    width,
    height,
    borderRadius: radius,
    fontSize: size,
  } as CSSProperties;
  return (
    <div className={[styles.photo, className].filter(Boolean).join(' ')} style={style} aria-hidden="true">
      {emoji}
    </div>
  );
}
