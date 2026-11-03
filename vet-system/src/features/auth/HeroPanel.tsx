import { Icon } from '../../components/ui/Icon';
import { icons } from '../../assets/icons';
import styles from './HeroPanel.module.css';

const PET_PHOTOS = [
  { emoji: '🐶', tone: 'tan' },
  { emoji: '🐱', tone: 'violet' },
  { emoji: '🐰', tone: 'violet' },
  { emoji: '🐕', tone: 'tan' },
] as const;

const HIGHLIGHTS = ['🩺 Licensed vets', '📅 Easy booking', '🛍️ Pet shop'] as const;

/** Left-hand brand panel — identical on all 10 Authentication screens. */
export function HeroPanel() {
  return (
    <aside className={styles.hero}>
      <img src={icons['hero-ellipse-top']} alt="" aria-hidden="true" className={styles.ellipseTop} />
      <img src={icons['hero-ellipse-bottom']} alt="" aria-hidden="true" className={styles.ellipseBottom} />

      <div className={styles.logoMark}>
        <Icon name="logo" size={82.8} width={100.8} />
      </div>
      <p className={styles.brand}>MFC PET LIFE</p>
      <p className={styles.quote}>“Our pet is also a family, invest in their health”</p>

      <div className={styles.photos}>
        {PET_PHOTOS.map(({ emoji, tone }) => (
          <div key={emoji} className={`${styles.photo} ${styles[tone]}`} aria-hidden="true">
            {emoji}
          </div>
        ))}
      </div>

      <ul className={styles.highlights}>
        {HIGHLIGHTS.map((text) => (
          <li key={text} className={styles.pill}>
            {text}
          </li>
        ))}
      </ul>
    </aside>
  );
}
