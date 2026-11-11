import type { Doctor, Product, ProductCategory, Service, ServiceCategory, Tone } from './types';

/** Gradient pairs used by the emoji "photos" in the design (top → bottom). */
export const TONES: Record<Tone, [string, string]> = {
  sand: ['#efdcbd', '#d2b283'],
  lav: ['#e9e1f6', '#b9a7de'],
  cream: ['#fbefd6', '#efd7a6'],
  mint: ['#dcebdd', '#9fc3a6'],
  sky: ['#e6f4fb', '#a9d3e8'],
  sage: ['#e3ede2', '#a9c4ae'],
  rose: ['#fbe3ea', '#efb8c8'],
};

export const OWNER = { name: 'Maria Santos', emoji: '🧑🏻' };

export const DOCTORS: Doctor[] = [
  { id: 'reyes', name: 'Dr. Andrea Reyes', specialty: 'Small Animal Medicine', emoji: '🩺' },
  { id: 'cruz', name: 'Dr. Paolo Cruz', specialty: 'Surgery & Internal Med', emoji: '👨🏽‍⚕️' },
  { id: 'ramos', name: 'Dr. Lina Ramos', specialty: 'Dermatology', emoji: '👩🏻‍⚕️' },
];

export const PETS = [
  { id: 'bella', name: 'Bella', info: 'Golden Retriever · 3 yrs', emoji: '🐶', tone: 'sand' as Tone, status: 'Healthy', statusTone: 'ok' as const },
  { id: 'milo', name: 'Milo', info: 'Persian Cat · 2 yrs', emoji: '🐱', tone: 'lav' as Tone, status: 'Vaccine due', statusTone: 'warn' as const },
  { id: 'coco', name: 'Coco', info: 'Shih Tzu · 5 yrs', emoji: '🐕', tone: 'sand' as Tone, status: 'Follow-up', statusTone: 'lav' as const },
];

export const APPOINTMENTS = [
  { id: 'a1', month: 'OCT', day: '22', title: 'Bella · Annual Check-up', doctor: 'Dr. Andrea Reyes', time: '9:30 AM', status: 'Confirmed', statusTone: 'sky' as const },
  { id: 'a2', month: 'OCT', day: '29', title: 'Milo · Vaccination', doctor: 'Dr. Paolo Cruz', time: '2:00 PM', status: 'Pending', statusTone: 'warn' as const },
];

export const MEDICAL_UPDATES = [
  { id: 'u1', icon: 'pill', tone: 'okbg', title: 'Rabies booster recorded', meta: 'Bella · Oct 10, 2026', target: 'Vaccination History' },
  { id: 'u2', icon: 'flask', tone: 'lav', title: 'CBC results ready', meta: 'Coco · Oct 8, 2026', target: 'Prescriptions & Lab Results' },
  { id: 'u3', icon: 'file', tone: 'sky', title: 'Otic drops prescribed', meta: 'Bella · Oct 10, 2026', target: 'Prescriptions & Lab Results' },
] as const;

export const SERVICE_CHIPS: { key: ServiceCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All services' },
  { key: 'preventive', label: 'Preventive care' },
  { key: 'treatment', label: 'Treatment' },
  { key: 'comfort', label: 'Comfort & care' },
];

export const SERVICES: Service[] = [
  {
    id: 'consultation', name: 'Consultation', blurb: 'Check-ups, diagnosis & advice', emoji: '🩺', tone: 'sage', duration: '30 min',
    price: 500, priceUnit: 'per consultation', category: 'preventive',
    headline: 'Check-ups, diagnosis & expert advice',
    description: 'A complete physical examination by a licensed veterinarian. We review your pet’s history, weight, vitals and behavior, then recommend a clear treatment or preventive plan — all recorded in your pet’s profile.',
    includes: ['Full physical examination', 'Weight & vital signs check', 'Diagnosis and treatment plan', 'Prescription, if needed', 'Records added to pet profile', 'Follow-up instructions'],
    doctorIds: ['reyes', 'cruz', 'ramos'], visit: '30–45 minutes per visit', nextSlot: 'Oct 22 · 9:30 AM',
  },
  {
    id: 'vaccination', name: 'Vaccination', blurb: 'Core & optional vaccines', emoji: '💉', tone: 'sky', duration: '15 min',
    price: 450, priceUnit: 'per vaccine', category: 'preventive',
    headline: 'Core & optional vaccines, on schedule',
    description: 'Keep your pet protected with age-appropriate core and optional vaccines. We check your pet’s vaccination history, administer the dose and update the digital record so reminders are never missed.',
    includes: ['Pre-vaccine health screening', 'Core vaccines (rabies, distemper)', 'Optional vaccines on request', 'Vaccination card update', 'Booster reminders', 'Post-vaccine care tips'],
    doctorIds: ['reyes', 'cruz'], visit: '15–20 minutes per visit', nextSlot: 'Oct 23 · 10:00 AM',
  },
  {
    id: 'deworming', name: 'Deworming', blurb: 'Safe parasite control', emoji: '🐛', tone: 'mint', duration: '15 min',
    price: 250, priceUnit: 'per treatment', category: 'preventive',
    headline: 'Safe, effective parasite control',
    description: 'Routine deworming protects your pet — and your family — from intestinal parasites. Dosage is matched to your pet’s weight and age, with a schedule for the next treatment.',
    includes: ['Weight-based dosage', 'Fecal check, if advised', 'Safe oral medication', 'Next-dose schedule', 'Records added to pet profile'],
    doctorIds: ['reyes', 'ramos'], visit: '15 minutes per visit', nextSlot: 'Oct 22 · 11:00 AM',
  },
  {
    id: 'confinement', name: 'Confinement', blurb: 'Overnight monitored care', emoji: '🛏️', tone: 'lav', duration: 'per night',
    price: 900, priceUnit: 'per night', category: 'treatment',
    headline: 'Overnight, monitored recovery care',
    description: 'A calm, clean space for pets who need observation or recovery. Our team monitors vitals, administers medication and sends you updates through the app.',
    includes: ['Private, climate-controlled kennel', 'Vitals monitoring', 'Medication administration', 'Daily doctor rounds', 'Progress updates to owner'],
    doctorIds: ['cruz', 'reyes'], visit: 'Admission any time during clinic hours', nextSlot: 'Today · 4:00 PM',
  },
  {
    id: 'surgery', name: 'Surgery', blurb: 'Spay, neuter & procedures', emoji: '🏥', tone: 'rose', duration: '2–4 hrs',
    price: 3500, priceUnit: 'per procedure', category: 'treatment',
    headline: 'Spay, neuter & surgical procedures',
    description: 'Performed by our surgical team with pre-operative screening, anesthesia monitoring and post-operative care instructions, so your pet is comfortable from admission to recovery.',
    includes: ['Pre-operative screening', 'Anesthesia & monitoring', 'Surgical procedure', 'Post-operative pain relief', 'Recovery instructions', 'Follow-up check'],
    doctorIds: ['cruz'], visit: '2–4 hours, plus recovery', nextSlot: 'Oct 25 · 8:00 AM',
  },
  {
    id: 'lab-test', name: 'Lab Test', blurb: 'Blood work & diagnostics', emoji: '🧪', tone: 'cream', duration: '1 day',
    price: 650, priceUnit: 'per panel', category: 'treatment',
    headline: 'Blood work & diagnostics',
    description: 'In-clinic diagnostics for clear answers: complete blood count, chemistry panels and more. Results are shared in your pet’s profile and reviewed with your doctor.',
    includes: ['Sample collection', 'Complete blood count (CBC)', 'Chemistry panel, if needed', 'Results in your pet’s profile', 'Doctor review of results'],
    doctorIds: ['reyes', 'cruz'], visit: 'Results within 1 day', nextSlot: 'Oct 22 · 9:00 AM',
  },
  {
    id: 'home-service', name: 'Home Service', blurb: 'Vet visits at your door', emoji: '🏠', tone: 'sand', duration: '60 min',
    price: 800, priceUnit: 'per visit', category: 'comfort',
    headline: 'Vet visits at your door',
    description: 'For anxious pets or busy owners: a licensed veterinarian visits you at home for check-ups, vaccines and minor treatments within Davao City.',
    includes: ['Home consultation', 'Vaccines & deworming on site', 'Minor treatments', 'Records updated on the spot', 'No clinic stress for your pet'],
    doctorIds: ['reyes', 'ramos'], visit: '60 minutes per visit', nextSlot: 'Oct 24 · 1:00 PM',
  },
  {
    id: 'grooming', name: 'Grooming', blurb: 'Bath, trim & spa day', emoji: '🛁', tone: 'sky', duration: '90 min',
    price: 450, priceUnit: 'per session', category: 'comfort',
    headline: 'Bath, trim & spa day',
    description: 'Gentle, vet-supervised grooming with pet-safe products. Includes a skin and coat check so small issues are caught early.',
    includes: ['Bath & blow-dry', 'Coat trim & brushing', 'Nail clipping', 'Ear cleaning', 'Skin & coat check'],
    doctorIds: ['ramos'], visit: '90 minutes per visit', nextSlot: 'Oct 23 · 2:00 PM',
  },
];

export const SHOP_CHIPS: { key: ProductCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'cat-food', label: 'Cat Food' },
  { key: 'dog-food', label: 'Dog Food' },
  { key: 'vitamins', label: 'Vitamins & Supplements' },
  { key: 'grooming', label: 'Shampoo & Grooming' },
  { key: 'accessories', label: 'Leashes & Collars' },
  { key: 'toys', label: 'Toys & Treats' },
];

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  'cat-food': 'Cat Food', 'dog-food': 'Dog Food', vitamins: 'Vitamins & Supplements',
  grooming: 'Shampoo & Grooming', accessories: 'Leashes & Collars', toys: 'Toys & Treats',
};

const ONE: Product['sizes'] = [{ label: 'Standard', multiplier: 1 }];
const FOOD: Product['sizes'] = [
  { label: '1 kg', multiplier: 0.4 },
  { label: '3 kg', multiplier: 1 },
  { label: '8 kg', multiplier: 2.4 },
];

export const PRODUCTS: Product[] = [
  { id: 'dog-food', name: 'Premium Dog Food 3kg', emoji: '🍗', tone: 'sand', rating: 4.8, reviews: 214, price: 1250, category: 'dog-food',
    blurb: 'Complete adult nutrition with real chicken, brown rice and omega fatty acids for a healthy coat and strong joints.',
    ingredients: 'Farm-raised chicken, brown rice, oats, fish oil, flaxseed, dried beet pulp, vitamins and chelated minerals.', sizes: FOOD, defaultSize: 1 },
  { id: 'cat-kibble', name: 'Cat Kibble Tuna 2kg', emoji: '🐟', tone: 'lav', rating: 4.7, reviews: 168, price: 890, category: 'cat-food',
    blurb: 'Crunchy tuna kibble with taurine for heart and eye health. Balanced for adult indoor cats.',
    ingredients: 'Tuna, chicken meal, rice, taurine, fish oil, cranberry extract, vitamins and minerals.', sizes: ONE, defaultSize: 0 },
  { id: 'wet-food', name: 'Wet Food Pack x12', emoji: '🥫', tone: 'cream', rating: 4.6, reviews: 97, price: 680, category: 'dog-food',
    blurb: 'Twelve tender-chunk pouches in savory gravy — a tasty topper or complete meal.',
    ingredients: 'Chicken, beef broth, carrots, peas, vitamins and minerals. No artificial colors.', sizes: ONE, defaultSize: 0 },
  { id: 'multivitamin', name: 'Multivitamin Chews', emoji: '💊', tone: 'mint', rating: 4.8, reviews: 143, price: 540, category: 'vitamins',
    blurb: 'Daily soft chews with vitamins A, C, D and E to support immunity and energy.',
    ingredients: 'Chicken liver, vitamin A, C, D3, E, B-complex, zinc, biotin.', sizes: ONE, defaultSize: 0 },
  { id: 'omega', name: 'Omega-3 Fish Oil', emoji: '🐟', tone: 'sky', rating: 4.9, reviews: 189, price: 620, category: 'vitamins',
    blurb: 'Cold-pressed fish oil for a shiny coat, healthy skin and joint comfort.',
    ingredients: 'Wild-caught fish oil (EPA, DHA), vitamin E.', sizes: ONE, defaultSize: 0 },
  { id: 'joint-care', name: 'Joint Care Tablets', emoji: '🦴', tone: 'sand', rating: 4.7, reviews: 121, price: 780, category: 'vitamins',
    blurb: 'Glucosamine and chondroitin tablets that support mobility in active and senior dogs.',
    ingredients: 'Glucosamine HCl, chondroitin sulfate, MSM, green-lipped mussel, vitamin C.', sizes: ONE, defaultSize: 0 },
  { id: 'shampoo', name: 'Oatmeal Pet Shampoo', emoji: '🧴', tone: 'lav', rating: 4.5, reviews: 76, price: 320, category: 'grooming',
    blurb: 'Soothing oatmeal shampoo for sensitive skin. Soap-free and pH-balanced for pets.',
    ingredients: 'Colloidal oatmeal, aloe vera, coconut-derived cleansers, chamomile.', sizes: ONE, defaultSize: 0 },
  { id: 'slicker', name: 'Slicker Brush', emoji: '🪮', tone: 'sage', rating: 4.6, reviews: 58, price: 260, category: 'grooming',
    blurb: 'Fine bent bristles gently remove tangles and loose fur. Comfortable non-slip handle.',
    ingredients: 'Stainless steel pins, ergonomic TPR handle.', sizes: ONE, defaultSize: 0 },
  { id: 'ear-cleaner', name: 'Ear Cleaner 100ml', emoji: '🧼', tone: 'sky', rating: 4.4, reviews: 44, price: 290, category: 'grooming',
    blurb: 'Gentle, alcohol-free cleaning solution that removes wax and debris.',
    ingredients: 'Purified water, aloe vera, witch hazel, glycerin.', sizes: ONE, defaultSize: 0 },
  { id: 'harness', name: 'Harness & Leash Set', emoji: '🦮', tone: 'cream', rating: 4.8, reviews: 133, price: 980, category: 'accessories',
    blurb: 'No-pull padded harness with matching leash. Reflective stitching for evening walks.',
    ingredients: 'Breathable mesh, nylon webbing, reflective thread, metal D-ring.', sizes: [{ label: 'S', multiplier: 0.9 }, { label: 'M', multiplier: 1 }, { label: 'L', multiplier: 1.15 }], defaultSize: 1 },
  { id: 'collar', name: 'Reflective Collar', emoji: '📿', tone: 'rose', rating: 4.5, reviews: 67, price: 240, category: 'accessories',
    blurb: 'Soft adjustable collar with reflective strip and quick-release buckle.',
    ingredients: 'Nylon webbing, reflective strip, plastic quick-release buckle.', sizes: [{ label: 'S', multiplier: 1 }, { label: 'M', multiplier: 1.1 }, { label: 'L', multiplier: 1.2 }], defaultSize: 1 },
  { id: 'dental-toy', name: 'Dental Chew Toy', emoji: '🦴', tone: 'sand', rating: 4.6, reviews: 82, price: 210, category: 'toys',
    blurb: 'Textured rubber chew that cleans teeth and satisfies the urge to gnaw.',
    ingredients: 'Non-toxic natural rubber, mint flavor.', sizes: ONE, defaultSize: 0 },
];

export function getService(id: string): Service {
  const found = SERVICES.find((s) => s.id === id) ?? SERVICES[0];
  if (!found) throw new Error('No services defined');
  return found;
}

export function getProduct(id: string): Product {
  const found = PRODUCTS.find((p) => p.id === id) ?? PRODUCTS[0];
  if (!found) throw new Error('No products defined');
  return found;
}
export const productsByIds = (ids: string[]) => ids.map(getProduct);

export const HOME_RECOMMENDED = ['dog-food', 'cat-kibble', 'wet-food', 'multivitamin', 'omega', 'joint-care', 'shampoo', 'slicker'];
export const SHOP_FEATURED = ['dog-food', 'cat-kibble', 'wet-food', 'multivitamin', 'omega'];
export const SHOP_FOOD = ['joint-care', 'shampoo', 'slicker', 'ear-cleaner', 'harness'];
export const SHOP_ACCESSORIES = ['collar', 'dental-toy', 'dog-food', 'cat-kibble', 'wet-food'];
export const ALSO_LIKE = ['multivitamin', 'joint-care', 'slicker', 'harness', 'dental-toy'];

export const SAMPLE_REVIEWS = [
  { id: 'r1', who: 'Ana M.', pet: 'Golden Retriever', text: 'My dog loves it and her coat is noticeably shinier after a month.' },
  { id: 'r2', who: 'Rico D.', pet: 'Labrador', text: 'Arrived in two days. Good value and the vet recommended it.' },
  { id: 'r3', who: 'Joy S.', pet: 'Aspin', text: 'No tummy upset when switching from his old food. Will reorder.' },
];

export const SORTS = ['Popular', 'Price: low to high', 'Price: high to low', 'Top rated'] as const;
export type SortKey = (typeof SORTS)[number];
