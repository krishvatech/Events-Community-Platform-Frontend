import test from 'node:test';
import assert from 'node:assert/strict';
import { replayDurationToDays } from './replayDuration.js';

test('every event form option converts to the right number of days', () => {
  assert.equal(replayDurationToDays('7 Days'), 7);
  assert.equal(replayDurationToDays('14 Days'), 14);
  assert.equal(replayDurationToDays('30 Days'), 30);
  assert.equal(replayDurationToDays('60 Days'), 60);
  assert.equal(replayDurationToDays('90 Days'), 90);
  assert.equal(replayDurationToDays('6 Months'), 180);
  assert.equal(replayDurationToDays('1 Year'), 365);
});

test('bare day counts from the recording page stay in days', () => {
  assert.equal(replayDurationToDays('30'), 30);
  assert.equal(replayDurationToDays('365'), 365);
});

test('case and spacing do not matter', () => {
  assert.equal(replayDurationToDays(' 14 days '), 14);
  assert.equal(replayDurationToDays('1 month'), 30);
});

test('values with no expiry return null', () => {
  for (const value of ['Unlimited', '', null, undefined, '0', '0 Days', '2 Weeks', 'soon']) {
    assert.equal(replayDurationToDays(value), null, String(value));
  }
});
