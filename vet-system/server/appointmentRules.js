export const appointmentServices = new Map([
  ['consultation', { name: 'Consultation', durationMinutes: 30 }],
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
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  const minute = Number(values.minute);
  return minute % 30 === 0;
}

export function isWithinDoctorAvailability(value, durationMinutes, availability) {
  if (!availability) return false;
  if (typeof value !== 'string' || !Number.isInteger(durationMinutes) || durationMinutes < 1) return false;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return false;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(values.weekday);
  const startMinute = Number(values.hour) * 60 + Number(values.minute);
  const [startHour, startMinutes] = availability.starts_at.split(':').map(Number);
  const [endHour, endMinutes] = availability.ends_at.split(':').map(Number);
  return availability.is_available
    && availability.weekday === weekday
    && startMinute >= startHour * 60 + startMinutes
    && startMinute + durationMinutes <= endHour * 60 + endMinutes;
}

export function availableAppointmentTimes(date, durationMinutes, doctors, appointments, preferredDoctorId = null, now = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(durationMinutes) || durationMinutes < 1) return [];

  const times = [];
  for (let minutes = 0; minutes + durationMinutes <= 24 * 60; minutes += 30) {
    const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    const scheduledAt = new Date(`${date}T${time}:00+08:00`);
    const timestamp = scheduledAt.getTime();
    const isoTimestamp = scheduledAt.toISOString();
    if (!isValidAppointmentTime(isoTimestamp, durationMinutes, now)) continue;

    const hasAvailableDoctor = doctors.some((doctor) => {
      if (preferredDoctorId && doctor.id !== preferredDoctorId) return false;
      if (!isWithinDoctorAvailability(isoTimestamp, durationMinutes, doctor)) return false;
      return !appointments.some((appointment) => {
        if (appointment.doctor_id !== doctor.id) return false;
        const appointmentStart = new Date(appointment.scheduled_at).getTime();
        const appointmentEnd = appointmentStart + appointment.duration_minutes * 60_000;
        return appointmentStart < timestamp + durationMinutes * 60_000 && appointmentEnd > timestamp;
      });
    });

    if (hasAvailableDoctor) times.push(time);
  }
  return times;
}
