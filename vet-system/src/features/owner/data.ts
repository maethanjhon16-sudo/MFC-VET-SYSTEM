import type { OwnerScreen } from './types';

/** Prototype data copied from the Figma "Owner Home" frame. */
export const OWNER = { name: 'Maria Santos', avatar: '🧑🏻' } as const;

export const CLINIC = {
  name: 'MFC PET LIFE',
  address: '24 Mabini St., Poblacion District, Davao City',
  hours: 'Open Mon–Sat 8:00 AM – 6:00 PM',
} as const;

export interface Pet {
  id: 'bella' | 'milo' | 'coco';
  name: string;
  breed: string;
  age: string;
  emoji: string;
  health: { label: string; tone: 'ok' | 'warn' | 'follow' };
  gradient: [from: string, to: string];
}

export const PETS: readonly Pet[] = [
  { id: 'bella', name: 'Bella', breed: 'Golden Retriever', age: '3 yrs old', emoji: '🐶', health: { label: 'Healthy', tone: 'ok' }, gradient: ['#ebd8b6', '#c79f6e'] },
  { id: 'milo', name: 'Milo', breed: 'Persian Cat', age: '2 yrs old', emoji: '🐱', health: { label: 'Vaccine due', tone: 'warn' }, gradient: ['#e3dcef', '#b9a7d6'] },
  { id: 'coco', name: 'Coco', breed: 'Shih Tzu', age: '5 yrs old', emoji: '🐕', health: { label: 'Follow-up', tone: 'follow' }, gradient: ['#f0e2cf', '#d1a877'] },
];

export interface Appointment {
  id: string;
  month: string;
  day: string;
  title: string;
  doctor: string;
  time: string;
  status: { label: string; tone: 'sky' | 'warn' };
}

export const UPCOMING_APPOINTMENTS: readonly Appointment[] = [
  { id: 'bella-checkup', month: 'OCT', day: '22', title: 'Bella · Annual Check-up', doctor: 'Dr. Andrea Reyes', time: '9:30 AM', status: { label: 'Confirmed', tone: 'sky' } },
  { id: 'milo-vaccination', month: 'OCT', day: '29', title: 'Milo · Vaccination', doctor: 'Dr. Paolo Cruz', time: '2:00 PM', status: { label: 'Pending', tone: 'warn' } },
];

export interface MedicalUpdate {
  id: string;
  title: string;
  meta: string;
  icon: 'pill' | 'flask' | 'file-sm';
  iconBg: 'okbg' | 'lav' | 'sky';
  to: OwnerScreen;
}

export const MEDICAL_UPDATES: readonly MedicalUpdate[] = [
  { id: 'rabies', title: 'Rabies booster recorded', meta: 'Bella · Oct 10, 2026', icon: 'pill', iconBg: 'okbg', to: 'vaccination-history' },
  { id: 'cbc', title: 'CBC results ready', meta: 'Coco · Oct 8, 2026', icon: 'flask', iconBg: 'lav', to: 'prescriptions-lab-results' },
  { id: 'otic', title: 'Otic drops prescribed', meta: 'Bella · Oct 10, 2026', icon: 'file-sm', iconBg: 'sky', to: 'prescriptions-lab-results' },
];

export interface Service {
  id: string;
  name: string;
  blurb: string;
  emoji: string;
  gradient: [from: string, to: string];
}

export const FEATURED_SERVICES: readonly Service[] = [
  { id: 'consultation', name: 'Consultation', blurb: 'Check-ups, diagnosis & advice', emoji: '🩺', gradient: ['#e3ede2', '#a9c4ae'] },
  { id: 'vaccination', name: 'Vaccination', blurb: 'Core & optional vaccines', emoji: '💉', gradient: ['#e6f4fb', '#a9d3e8'] },
  { id: 'deworming', name: 'Deworming', blurb: 'Safe parasite control', emoji: '🐛', gradient: ['#dcebdd', '#9fc3a6'] },
  { id: 'confinement', name: 'Confinement', blurb: 'Overnight monitored care', emoji: '🛏️', gradient: ['#e9e1f6', '#b9a7de'] },
  { id: 'surgery', name: 'Surgery', blurb: 'Spay, neuter & procedures', emoji: '🏥', gradient: ['#fbe3ea', '#efb8c8'] },
  { id: 'lab-test', name: 'Lab Test', blurb: 'Blood work & diagnostics', emoji: '🧪', gradient: ['#fbefd6', '#efd7a6'] },
  { id: 'home-service', name: 'Home Service', blurb: 'Vet visits at your door', emoji: '🏠', gradient: ['#efdcbd', '#d2b283'] },
  { id: 'grooming', name: 'Grooming', blurb: 'Bath, trim & spa day', emoji: '🛁', gradient: ['#e6f4fb', '#a9d3e8'] },
];

export interface Product {
  id: string;
  name: string;
  rating: string;
  /** Price in PHP. */
  price: number;
  emoji: string;
  gradient: [from: string, to: string];
}

export const RECOMMENDED_PRODUCTS: readonly Product[] = [
  { id: 'dog-food', name: 'Premium Dog Food 3kg', rating: '4.8', price: 1250, emoji: '🍗', gradient: ['#efdcbd', '#d2b283'] },
  { id: 'cat-kibble', name: 'Cat Kibble Tuna 2kg', rating: '4.7', price: 890, emoji: '🐟', gradient: ['#e9e1f6', '#b9a7de'] },
  { id: 'wet-food', name: 'Wet Food Pack x12', rating: '4.6', price: 680, emoji: '🥫', gradient: ['#fbefd6', '#efd7a6'] },
  { id: 'multivitamin', name: 'Multivitamin Chews', rating: '4.8', price: 540, emoji: '💊', gradient: ['#dcebdd', '#9fc3a6'] },
  { id: 'fish-oil', name: 'Omega-3 Fish Oil', rating: '4.9', price: 620, emoji: '🐟', gradient: ['#e6f4fb', '#a9d3e8'] },
  { id: 'joint-care', name: 'Joint Care Tablets', rating: '4.7', price: 780, emoji: '🦴', gradient: ['#efdcbd', '#d2b283'] },
  { id: 'shampoo', name: 'Oatmeal Pet Shampoo', rating: '4.5', price: 320, emoji: '🧴', gradient: ['#e9e1f6', '#b9a7de'] },
  { id: 'brush', name: 'Slicker Brush', rating: '4.6', price: 260, emoji: '🪮', gradient: ['#e3ede2', '#a9c4ae'] },
];

export const formatPeso = (amount: number) => `₱${amount.toLocaleString('en-PH')}`;
