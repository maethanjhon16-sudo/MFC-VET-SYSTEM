import logo from './logo.svg';
import heroEllipseTop from './hero-ellipse-top.svg';
import heroEllipseBottom from './hero-ellipse-bottom.svg';
import pawCard from './paw-card.svg';
import pulseCard from './pulse-card.svg';
import chev from './chev.svg';
import pawForest from './paw-forest.svg';
import pawMute from './paw-mute.svg';
import pulseForest from './pulse-forest.svg';
import pulseMute from './pulse-mute.svg';
import pulseField from './pulse-field.svg';
import chevField from './chev-field.svg';
import checkWhite from './check-white.svg';
import checkGreen from './check-green.svg';
import lock from './lock.svg';
import eye from './eye.svg';
import eyeOff from './eye-off.svg';
import mail from './mail.svg';
import mailLg from './mail-lg.svg';
import user from './user.svg';
import phone from './phone.svg';
import shield from './shield.svg';
import clock from './clock.svg';
import { ownerIcons } from './ownerIcons';

/** Local copies of the Figma icons (see scripts/fetch-icons.mjs). */
export const icons = {
  logo,
  'hero-ellipse-top': heroEllipseTop,
  'hero-ellipse-bottom': heroEllipseBottom,
  'paw-card': pawCard,
  'pulse-card': pulseCard,
  chev,
  'paw-forest': pawForest,
  'paw-mute': pawMute,
  'pulse-forest': pulseForest,
  'pulse-mute': pulseMute,
  'pulse-field': pulseField,
  'chev-field': chevField,
  'check-white': checkWhite,
  'check-green': checkGreen,
  lock,
  eye,
  'eye-off': eyeOff,
  mail,
  'mail-lg': mailLg,
  user,
  phone,
  shield,
  clock,
  ...ownerIcons,
} as const;

export type IconName = keyof typeof icons;
