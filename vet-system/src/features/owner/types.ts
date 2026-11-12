/** One entry per frame in the Figma "2 · PET OWNER — Home, Services & Shop" section. */
export type OwnerScreen =
  | 'owner-home'
  | 'owner-services'
  | 'service-details'
  | 'appointment-booking'
  | 'owner-appointments'
  | 'owner-shop'
  | 'product-details'
  | 'coming-soon';

export type NavKey = 'home' | 'actions' | 'shop' | 'schedule' | 'menu';

export type Tone = 'sand' | 'lav' | 'cream' | 'mint' | 'sky' | 'sage' | 'rose';

export type ServiceCategory = 'preventive' | 'treatment' | 'comfort';
export type ProductCategory = 'cat-food' | 'dog-food' | 'vitamins' | 'grooming' | 'accessories' | 'toys';

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  emoji: string;
}

export interface Service {
  id: string;
  name: string;
  blurb: string;
  emoji: string;
  tone: Tone;
  duration: string;
  price: number;
  priceUnit: string;
  category: ServiceCategory;
  headline: string;
  description: string;
  includes: string[];
  doctorIds: string[];
  visit: string;
  nextSlot: string;
}

export interface ProductSize {
  label: string;
  multiplier: number;
}

export interface Product {
  id: string;
  name: string;
  emoji: string;
  tone: Tone;
  rating: number;
  reviews: number;
  price: number;
  category: ProductCategory;
  blurb: string;
  ingredients: string;
  sizes: ProductSize[];
  defaultSize: number;
}

export interface CartLine {
  productId: string;
  sizeIndex: number;
  qty: number;
}

/** Navigation helpers every screen receives. Anything outside this section opens a "coming soon" page. */
export interface OwnerNav {
  home: () => void;
  services: (chip?: ServiceCategory | 'all') => void;
  service: (id: string) => void;
  shop: (chip?: ProductCategory | 'all') => void;
  product: (id: string) => void;
  book: (serviceId?: string) => void;
  appointments: () => void;
  /** Frames that belong to other sections of the Figma file (Schedule, Cart, Messages, …). */
  soon: (label: string) => void;
}

export const formatPeso = (value: number) => `₱${Math.round(value).toLocaleString('en-US')}`;
