/** One entry per frame in the Figma "2 · PET OWNER — Home, Services & Shop" section. */
export type OwnerScreen =
  | 'owner-home'
  | 'owner-services'
  | 'service-details'
  | 'appointment-booking'
  | 'owner-appointments'
  | 'owner-pet-profile'
  | 'owner-records'
  | 'owner-messages'
  | 'owner-cart'
  | 'owner-orders'
  | 'owner-profile'
  | 'owner-notifications'
  | 'owner-help'
  | 'owner-shop'
  | 'product-details'
  | 'coming-soon';

export type NavKey = 'home' | 'actions' | 'shop' | 'schedule' | 'menu';

export type Tone = 'sand' | 'lav' | 'cream' | 'mint' | 'sky' | 'sage' | 'rose';

export type ServiceCategory = 'preventive' | 'treatment' | 'comfort';
export type ProductCategory = 'cat-food' | 'dog-food' | 'vitamins' | 'grooming' | 'accessories' | 'toys';

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
  visit: string;
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

export interface OwnerNav {
  home: () => void;
  services: (chip?: ServiceCategory | 'all') => void;
  service: (id: string) => void;
  shop: (chip?: ProductCategory | 'all') => void;
  product: (id: string) => void;
  book: (serviceId?: string, petId?: string) => void;
  appointments: () => void;
  pet: (id: string) => void;
  records: (petId?: string) => void;
  messages: () => void;
  cart: () => void;
  orders: () => void;
  profile: () => void;
  notifications: () => void;
  help: () => void;
  soon: (label: string) => void;
}

export const formatPeso = (value: number) => `₱${Math.round(value).toLocaleString('en-US')}`;
