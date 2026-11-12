import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidAppointmentTime, isWithinDoctorAvailability } from './appointmentRules.js';

const now = Date.parse('2026-11-12T00:00:00.000Z');

test('accepts future half-hour appointments within Manila clinic hours', () => {
  assert.equal(isValidAppointmentTime('2026-11-14T01:00:00.000Z', 30, now), true);
});

test('rejects Sundays and times outside clinic hours', () => {
  assert.equal(isValidAppointmentTime('2026-11-15T01:00:00.000Z', 30, now), false);
  assert.equal(isValidAppointmentTime('2026-11-13T23:30:00.000Z', 30, now), false);
});

test('ensures service duration fits before clinic closing', () => {
  assert.equal(isValidAppointmentTime('2026-11-14T09:30:00.000Z', 30, now), true);
  assert.equal(isValidAppointmentTime('2026-11-14T09:30:00.000Z', 60, now), false);
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
  assert.equal(isWithinDoctorAvailability('2026-11-16T01:00:00.000Z', 60, null), true);
});
