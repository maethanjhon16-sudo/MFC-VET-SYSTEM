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
import navHome from './nav-home.svg';
import navGrid from './nav-grid.svg';
import navBag from './nav-bag.svg';
import navCalendar from './nav-calendar.svg';
import navMenu from './nav-menu.svg';
import search from './search.svg';
import cart from './cart.svg';
import chat from './chat.svg';
import bell from './bell.svg';
import chatSm from './chat-sm.svg';
import plus from './plus.svg';
import bannerEllipseTop from './banner-ellipse-top.svg';
import bannerEllipseBottom from './banner-ellipse-bottom.svg';
import qaCalendar from './qa-calendar.svg';
import qaFile from './qa-file.svg';
import qaChat from './qa-chat.svg';
import qaBag from './qa-bag.svg';
import chevPurple from './chev-purple.svg';
import chevPurpleSm from './chev-purple-sm.svg';
import chevGray from './chev-gray.svg';
import chevLeft from './chev-left.svg';
import chevRight from './chev-right.svg';
import pill from './pill.svg';
import flask from './flask.svg';
import fileSm from './file-sm.svg';
import star from './star.svg';
import carouselPrev from './carousel-prev.svg';
import carouselNext from './carousel-next.svg';
import dotOk from './dot-ok.svg';
import dotWarn from './dot-warn.svg';
import dotFollow from './dot-follow.svg';

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
  'nav-home': navHome,
  'nav-grid': navGrid,
  'nav-bag': navBag,
  'nav-calendar': navCalendar,
  'nav-menu': navMenu,
  search,
  cart,
  chat,
  bell,
  'chat-sm': chatSm,
  plus,
  'banner-ellipse-top': bannerEllipseTop,
  'banner-ellipse-bottom': bannerEllipseBottom,
  'qa-calendar': qaCalendar,
  'qa-file': qaFile,
  'qa-chat': qaChat,
  'qa-bag': qaBag,
  'chev-purple': chevPurple,
  'chev-purple-sm': chevPurpleSm,
  'chev-gray': chevGray,
  'chev-left': chevLeft,
  'chev-right': chevRight,
  pill,
  flask,
  'file-sm': fileSm,
  star,
  'carousel-prev': carouselPrev,
  'carousel-next': carouselNext,
  'dot-ok': dotOk,
  'dot-warn': dotWarn,
  'dot-follow': dotFollow,
} as const;

export type IconName = keyof typeof icons;
