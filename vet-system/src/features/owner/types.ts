/** One entry per Pet Owner frame on Figma Page 2 (sections 2–5, plus "Cart – Promo Applied" from section 11). */
export type OwnerScreen =
  // 2 · Home, Services & Shop
  | 'owner-home'
  | 'owner-services'
  | 'service-details'
  | 'owner-shop'
  | 'product-details'
  | 'cart'
  | 'cart-promo-applied'
  | 'checkout'
  | 'order-confirmation'
  | 'order-history'
  | 'owner-order-details'
  // 3 · Orders, Schedule & Booking
  | 'owner-schedule'
  | 'owner-schedule-past'
  | 'book-step-1-pet'
  | 'book-step-2-service'
  | 'book-step-3-date-time'
  | 'booking-confirmation'
  | 'appointment-details'
  | 'appointment-cancelled'
  // 4 · Pets, Records & Messaging
  | 'my-pets'
  | 'pet-profile'
  | 'pet-profile-vaccines'
  | 'pet-profile-records'
  | 'medical-records'
  | 'vaccination-history'
  | 'prescriptions-lab-results'
  | 'messages'
  | 'conversation'
  | 'conversation-sent'
  // 5 · Notifications & Menu
  | 'notifications'
  | 'owner-menu'
  | 'my-profile'
  | 'settings-privacy'
  | 'help-contact'
  | 'log-out-confirmation'
  | 'add-pet';

/** Figma frame name for each screen (used by screens that are not built yet). */
export const OWNER_SCREEN_LABEL: Record<OwnerScreen, string> = {
  'owner-home': 'Owner Home',
  'owner-services': 'Owner Services',
  'service-details': 'Service Details',
  'owner-shop': 'Owner Shop',
  'product-details': 'Product Details',
  cart: 'Cart',
  'cart-promo-applied': 'Cart – Promo Applied',
  checkout: 'Checkout',
  'order-confirmation': 'Order Confirmation',
  'order-history': 'Order History',
  'owner-order-details': 'Owner Order Details',
  'owner-schedule': 'Owner Schedule',
  'owner-schedule-past': 'Owner Schedule – Past',
  'book-step-1-pet': 'Book Step 1 – Pet',
  'book-step-2-service': 'Book Step 2 – Service',
  'book-step-3-date-time': 'Book Step 3 – Date & Time',
  'booking-confirmation': 'Booking Confirmation',
  'appointment-details': 'Appointment Details',
  'appointment-cancelled': 'Appointment Cancelled',
  'my-pets': 'My Pets',
  'pet-profile': 'Pet Profile',
  'pet-profile-vaccines': 'Pet Profile – Vaccines',
  'pet-profile-records': 'Pet Profile – Records',
  'medical-records': 'Medical Records',
  'vaccination-history': 'Vaccination History',
  'prescriptions-lab-results': 'Prescriptions & Lab Results',
  messages: 'Messages',
  conversation: 'Conversation',
  'conversation-sent': 'Conversation – Sent',
  notifications: 'Notifications',
  'owner-menu': 'Owner Menu',
  'my-profile': 'My Profile',
  'settings-privacy': 'Settings & Privacy',
  'help-contact': 'Help & Contact',
  'log-out-confirmation': 'Log Out Confirmation',
  'add-pet': 'Add Pet',
};

export interface OwnerScreenProps {
  go: (screen: OwnerScreen) => void;
}
