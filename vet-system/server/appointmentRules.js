export const appointmentServices = new Map([
  ['consultation', { name: 'Consultation', durationMinutes: 45 }],
  ['vaccination', { name: 'Vaccination', durationMinutes: 30 }],
  ['deworming', { name: 'Deworming', durationMinutes: 30 }],
  ['confinement', { name: 'Confinement', durationMinutes: 60 }],
  ['surgery', { name: 'Surgery', durationMinutes: 240 }],
  ['lab-test', { name: 'Lab Test', durationMinutes: 30 }],
  ['home-service', { name: 'Home Service', durationMinutes: 60 }],
  ['grooming', { name: 'Grooming', durationMinutes: 90 }],
]);

export function isValidAppointmentTime(value, durationMinutes, now = Date.now()) {
  if (
    typeof value !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    || !Number.isInteger(durationMinutes)
    || durationMinutes < 1
  ) {
    return false;
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= now) return false;
  if (date.getTime() > now + 90 * 24 * 60 * 60 * 1000) return false;
  if (date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0) return false;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  const hour = Number(values.hour);
  const minute = Number(values.minute);
  const start = hour * 60 + minute;
  return values.weekday !== 'Sun'
    && minute % 30 === 0
    && start >= 8 * 60
    && start + durationMinutes <= 18 * 60;
}
