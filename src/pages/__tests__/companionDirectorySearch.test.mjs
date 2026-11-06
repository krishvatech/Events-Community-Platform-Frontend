import test from 'node:test';
import assert from 'node:assert/strict';

import { filterCompanionParticipants } from '../../utils/companionDirectorySearch.js';

const people = [
  { display_name: 'Aaron Tay', job_title: 'Partner', company: 'Sample Capital', badge_label: 'Speaker' },
  { display_name: 'Maria de Souza', job_title: '', company: 'Northwind', badge_label: 'Attendee' },
  { display_name: 'Ben Yates', job_title: null, company: null, badge_label: 'Accepted application' },
];
const names = (rows) => rows.map((row) => row.display_name);

test('an empty search returns the same list without copying it', () => {
  assert.equal(filterCompanionParticipants(people, ''), people);
  assert.equal(filterCompanionParticipants(people, '   '), people);
  assert.equal(filterCompanionParticipants(people, null), people);
  assert.equal(filterCompanionParticipants(people, undefined), people);
});

test('searches name, job title, company and badge label, ignoring case', () => {
  assert.deepEqual(names(filterCompanionParticipants(people, 'MARIA')), ['Maria de Souza']);
  assert.deepEqual(names(filterCompanionParticipants(people, 'partner')), ['Aaron Tay']);
  assert.deepEqual(names(filterCompanionParticipants(people, 'northwind')), ['Maria de Souza']);
  assert.deepEqual(names(filterCompanionParticipants(people, 'accepted')), ['Ben Yates']);
});

test('trims the search and keeps the existing order', () => {
  assert.deepEqual(names(filterCompanionParticipants(people, '  a  ')), ['Aaron Tay', 'Maria de Souza', 'Ben Yates']);
});

test('missing values never match or throw', () => {
  assert.deepEqual(filterCompanionParticipants(people, 'null'), []);
  assert.deepEqual(filterCompanionParticipants(people, 'undefined'), []);
  assert.deepEqual(filterCompanionParticipants([{}], 'x'), []);
});

test('other fields are not searched', () => {
  assert.deepEqual(filterCompanionParticipants([{ display_name: 'Ann', email: 'zed@example.test' }], 'zed'), []);
});
