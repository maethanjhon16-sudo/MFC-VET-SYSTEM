import { useReducer, type CSSProperties } from 'react';
import { Icon } from '../../../components/ui/Icon';
import type { IconName } from '../../../assets/icons';
import type { Pet } from '../data';
import styles from './PetCarousel.module.css';

interface CarouselState {
  index: number;
}
type CarouselAction = { type: 'PREV'; count: number } | { type: 'NEXT'; count: number } | { type: 'GO_TO'; index: number };

function carouselReducer(state: CarouselState, action: CarouselAction): CarouselState {
  switch (action.type) {
    case 'PREV':
      return { index: (state.index - 1 + action.count) % action.count };
    case 'NEXT':
      return { index: (state.index + 1) % action.count };
    case 'GO_TO':
      return { index: action.index };
    default:
      return state;
  }
}

const HEALTH_DOT: Record<Pet['health']['tone'], IconName> = {
  ok: 'dot-ok',
  warn: 'dot-warn',
  follow: 'dot-follow',
};

interface PetCarouselProps {
  pets: readonly Pet[];
  onOpenPet: (pet: Pet) => void;
}

/** Figma "Desktop Carousel · My Pets" — one pet at a time, wraps around, indicator dots. */
export function PetCarousel({ pets, onOpenPet }: PetCarouselProps) {
  const [state, dispatch] = useReducer(carouselReducer, { index: 0 });
  const count = pets.length;
  const pet = pets[state.index];
  if (!pet) return null;

  const photoStyle = { '--from': pet.gradient[0], '--to': pet.gradient[1] } as CSSProperties;

  return (
    <div className={styles.card}>
      <div className={styles.photo} style={photoStyle}>
        <button type="button" className={styles.photoButton} onClick={() => onOpenPet(pet)} aria-label={`Open ${pet.name}’s profile`}>
          <span className={styles.emoji}>{pet.emoji}</span>
        </button>
        <button type="button" className={`${styles.arrow} ${styles.prev}`} aria-label="Previous pet" onClick={() => dispatch({ type: 'PREV', count })}>
          <Icon name="carousel-prev" size={16} />
        </button>
        <button type="button" className={`${styles.arrow} ${styles.next}`} aria-label="Next pet" onClick={() => dispatch({ type: 'NEXT', count })}>
          <Icon name="carousel-next" size={16} />
        </button>
      </div>

      <button type="button" className={styles.caption} onClick={() => onOpenPet(pet)}>
        <span className={styles.name}>{pet.name}</span>
        <span className={styles.breed}>{pet.breed}</span>
        <span className={styles.age}>{pet.age}</span>
        <span className={`${styles.health} ${styles[pet.health.tone]}`}>
          <Icon name={HEALTH_DOT[pet.health.tone]} size={8} />
          {pet.health.label}
        </span>
      </button>

      <div className={styles.indicators} role="tablist" aria-label="Choose a pet">
        {pets.map((p, i) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={i === state.index}
            aria-label={p.name}
            className={`${styles.indicator} ${i === state.index ? styles.indicatorActive : ''}`}
            onClick={() => dispatch({ type: 'GO_TO', index: i })}
          />
        ))}
      </div>
    </div>
  );
}
