import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appointmentServices,
  availableAppointmentTimes,
  isValidAppointmentTime,
  isWithinDoctorAvailability,
} from './appointmentRules.js';

const now = Date.parse('2026-11-12T00:00:00.000Z');

test('accepts future half-hour appointments including late evening times', () => {
  assert.equal(isValidAppointmentTime('2026-11-14T01:00:00.000Z', 30, now), true);
  assert.equal(isValidAppointmentTime('2026-11-14T13:00:00.000Z', 30, now), true);
});

test('validates slot increments independently from weekly doctor hours', () => {
  assert.equal(isValidAppointmentTime('2026-11-15T01:00:00.000Z', 30, now), true);
  assert.equal(isValidAppointmentTime('2026-11-13T23:15:00.000Z', 30, now), false);
});

test('delegates service duration limits to the doctor schedule', () => {
  assert.equal(isValidAppointmentTime('2026-11-14T09:30:00.000Z', 30, now), true);
  assert.equal(isValidAppointmentTime('2026-11-14T09:30:00.000Z', 60, now), true);
});

test('rejects past, out-of-range, and malformed timestamps', () => {
  assert.equal(isValidAppointmentTime('2026-11-11T01:00:00.000Z', 30, now), false);
  assert.equal(isValidAppointmentTime('2027-02-11T01:00:00.000Z', 30, now), false);
  assert.equal(isValidAppointmentTime('2026-11-14T09:00:00+08:00', 30, now), false);
});

test('checks selected doctor availability using Manila weekday and hours', () => {
  const mondayHours = { weekday: 1, is_available: true, starts_at: '09:00:00', ends_at: '17:00:00' };
  assert.equal(isWithinDoctorAvailability('2026-11-16T01:00:00.000Z', 60, mondayHours), true);
  assert.equal(isWithinDoctorAvailability('2026-11-16T00:00:00.000Z', 60, mondayHours), false);
  assert.equal(isWithinDoctorAvailability('2026-11-16T09:00:00.000Z', 60, mondayHours), false);
  assert.equal(isWithinDoctorAvailability('2026-11-16T01:00:00.000Z', 60, { ...mondayHours, is_available: false }), false);
  assert.equal(isWithinDoctorAvailability('2026-11-16T13:00:00.000Z', 60, {
    weekday: 1,
    is_available: true,
    starts_at: '08:00:00',
    ends_at: '22:00:00',
  }), true);
  assert.equal(isWithinDoctorAvailability('2026-11-16T13:30:00.000Z', 60, {
    weekday: 1,
    is_available: true,
    starts_at: '08:00:00',
    ends_at: '22:00:00',
  }), false);
  assert.equal(isWithinDoctorAvailability('2026-11-16T01:00:00.000Z', 60, null), false);
});

test('allows a 30-minute consultation to start at 10:30 PM before an 11 PM close', () => {
  const consultation = appointmentServices.get('consultation');
  const thursdayHours = {
    weekday: 4,
    is_available: true,
    starts_at: '08:00:00',
    ends_at: '23:00:00',
  };

  assert.equal(consultation.durationMinutes, 30);
  assert.equal(isWithinDoctorAvailability('2026-11-12T14:30:00.000Z', consultation.durationMinutes, thursdayHours), true);
});

test('appointment choices exclude occupied time and respect selected doctor', () => {
  const doctors = [
    { id: 'doctor-a', weekday: 1, is_available: true, starts_at: '09:00:00', ends_at: '12:00:00' },
    { id: 'doctor-b', weekday: 1, is_available: true, starts_at: '09:00:00', ends_at: '12:00:00' },
  ];
  const appointments = [{
    doctor_id: 'doctor-a',
    scheduled_at: '2026-11-16T01:00:00.000Z',
    duration_minutes: 60,
  }];
  const anyDoctor = availableAppointmentTimes('2026-11-16', 30, doctors, appointments, null, now);
  const doctorA = availableAppointmentTimes('2026-11-16', 30, doctors, appointments, 'doctor-a', now);
  const doctorB = availableAppointmentTimes('2026-11-16', 30, doctors, appointments, 'doctor-b', now);

  assert.equal(anyDoctor.includes('09:00'), true);
  assert.equal(doctorA.includes('09:00'), false);
  assert.equal(doctorA.includes('10:00'), true);
  assert.equal(doctorB.includes('09:00'), true);
});
