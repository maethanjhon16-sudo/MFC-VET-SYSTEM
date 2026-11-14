export const CLINIC_ADDRESS = 'Datu Ingkal St, Poblacion, Kidapawan City, 9400 Cotabato';
export const CLINIC_CITY = 'Kidapawan City';
export const CLINIC_HOURS = 'Default: Open Mon–Sat 8:00 AM – 6:00 PM';

export function getClinicGreeting(date = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(date));
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}
