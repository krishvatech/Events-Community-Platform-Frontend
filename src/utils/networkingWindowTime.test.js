import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeNetworkingTime,
  normalizedNetworkingWindows,
  validateNetworkingWindows,
  networkingTimePickerValue,
} from './networkingWindowTime.js';

test('12-hour times normalize without changing existing 24-hour meaning', () => {
  assert.equal(normalizeNetworkingTime('07:30 PM'), '19:30');
  assert.equal(normalizeNetworkingTime('07:30 AM'), '07:30');
  assert.equal(normalizeNetworkingTime('12:00 AM'), '00:00');
  assert.equal(normalizeNetworkingTime('12:00 PM'), '12:00');
  assert.equal(normalizeNetworkingTime('07:30'), '07:30');
  assert.equal(networkingTimePickerValue('19:30').format('hh:mm A'), '07:30 PM');
  assert.equal(networkingTimePickerValue('07:30').format('hh:mm A'), '07:30 AM');
});

test('window validation rejects reversed, equal, missing and malformed values', () => {
  const date = '2026-11-10';
  const invalid = [
    { date, start: '09:30 AM', end: '07:30 AM' },
    { date, start: '09:30', end: '09:30' },
    { date, start: '23:00', end: '01:00' },
    { date: '', start: '09:30', end: '19:30' },
    { date: '2026-02-30', start: '09:30', end: '19:30' },
    { date, start: '25:00', end: '19:30' },
    { date, start: '09:30', end: '' },
  ];
  assert.equal(validateNetworkingWindows(invalid).filter(Boolean).length, invalid.length);
  assert.equal(validateNetworkingWindows(invalid)[0],
    'End time must be after start time. Please select a valid time range.');
});

test('valid same-date windows retain dates and normalize API values', () => {
  const windows = [
    { date: '2026-11-09', start: '09:00 AM', end: '10:00 AM' },
    { date: '2026-11-10', start: '10:00', end: '11:00' },
    { date: '2026-11-10', start: '06:00 PM', end: '07:30 PM' },
    { date: '2026-11-11', start: '10:00', end: '11:00' },
  ];
  assert.deepEqual(validateNetworkingWindows(windows), ['', '', '', '']);
  assert.deepEqual(normalizedNetworkingWindows(windows)[2],
    { date: '2026-11-10', start: '18:00', end: '19:30' });
});
