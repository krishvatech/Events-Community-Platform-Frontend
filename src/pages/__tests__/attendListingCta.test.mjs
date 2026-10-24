import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getAttendPrimaryLabel, getAttendSecondaryLabel, getListingAttendUrl } from '../../utils/attendCta.js';

const applyEvent = {
  registration_type: 'apply',
  is_free: true,
  price: 0,
  attend_primary_button_url: 'https://example.com/',
  attend_primary_button_text: 'Guaranteed Seat',
  attend_secondary_button_text: 'Apply as Guest',
};

const openEvent = { ...applyEvent, registration_type: 'open' };

test('eligible application event exposes an HTTPS primary URL', () => {
  assert.equal(getListingAttendUrl(applyEvent, { applicationStatus: 'none' }), 'https://example.com/');
  assert.equal(getAttendPrimaryLabel(applyEvent), 'Guaranteed Seat');
  assert.equal(getAttendSecondaryLabel(applyEvent, false), 'Apply as Guest');
});

test('open registration can use external primary without changing normal default', () => {
  assert.equal(getListingAttendUrl(openEvent), 'https://example.com/');
  assert.equal(getListingAttendUrl({ ...openEvent, attend_primary_button_url: '' }), '');
  assert.equal(getAttendSecondaryLabel({ ...openEvent, attend_secondary_button_text: '' }, true), 'Apply Now');
});

test('custom external CTA never overrides protected states', () => {
  for (const flag of ['isEventOwner', 'isPaymentPending', 'isConfirmedRegistered', 'isEffectivelyPast', 'isReplayEvent']) {
    assert.equal(getListingAttendUrl(applyEvent, { [flag]: true }), '', flag);
  }
  for (const status of ['cancelled', 'past', 'live']) {
    assert.equal(getListingAttendUrl(applyEvent, { status }), '', status);
  }
  assert.equal(getListingAttendUrl({ ...applyEvent, is_full: true }), '');
  for (const applicationStatus of ['accepted', 'pending', 'waitlisted']) {
    assert.equal(getListingAttendUrl(applyEvent, { applicationStatus }), '', applicationStatus);
  }
});

test('unsafe or inactive external destinations are ignored', () => {
  for (const url of ['', 'http://example.com/', 'javascript:alert(1)', 'https://admin:secret@example.com']) {
    assert.equal(getListingAttendUrl({ ...applyEvent, attend_primary_button_url: url }), '', url);
  }
  const saleorEvent = { ...applyEvent, is_free: false, price: 99 };
  assert.equal(getListingAttendUrl(saleorEvent), '');
});

test('listing maps the three Attend fields and supports both card and row layouts', () => {
  const listing = readFileSync(new URL('../EventsPage.jsx', import.meta.url), 'utf8');
  for (const field of ['attend_primary_button_text', 'attend_primary_button_url', 'attend_secondary_button_text']) {
    assert.match(listing, new RegExp(`${field}: ev\\.${field}`));
  }
  assert.equal((listing.match(/getListingAttendUrl\(ev,/g) || []).length, 2);
  assert.equal((listing.match(/getAttendSecondaryLabel\(ev, Boolean\(token\)\)/g) || []).length, 2);
  assert.equal((listing.match(/getAttendPrimaryLabel\(ev\)/g) || []).length, 4);
});


test('dual Attend CTAs stack on phones and wrap long labels in both layouts', () => {
  const listing = readFileSync(new URL('../EventsPage.jsx', import.meta.url), 'utf8');
  const card = listing.slice(listing.indexOf('function EventCard('), listing.indexOf('function EventRow('));
  const row = listing.slice(listing.indexOf('function EventRow('), listing.indexOf('function CardFooterSkeleton('));
  for (const [layout, code] of [['grid card', card], ['list row', row]]) {
    assert.match(code, /flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:max-w-full sm:flex-row sm:flex-wrap/,
      `${layout}: pair must stack at mobile sizes, wrap at desktop widths`);
    assert.match(code, /className="normal-case w-full rounded-full px-4[^"\n]*sm:w-auto"/,
      `${layout}: actions must fill available mobile width without zero minimum`);
    assert.match(code, /sx=\{\{ whiteSpace: "normal", overflowWrap: "break-word", textAlign: "center", maxWidth: "100%", flexShrink: 0 \}\}/,
      `${layout}: button text wraps without letting actions collapse`);
  }
});

test('CTA layout adjustments do not change external link or existing apply handlers', () => {
  const listing = readFileSync(new URL('../EventsPage.jsx', import.meta.url), 'utf8');
  const card = listing.slice(listing.indexOf('function EventCard('), listing.indexOf('function EventRow('));
  const row = listing.slice(listing.indexOf('function EventRow('), listing.indexOf('function CardFooterSkeleton('));
  for (const [layout, code] of [['grid card', card], ['list row', row]]) {
    assert.match(code, /href=\{externalAttendUrl\}/, `${layout}: HTTPS link unchanged`);
    assert.match(code, /rel="noopener noreferrer"/, `${layout}: external link protection`);
    assert.match(code, /onClick=\{openApplyModalAfterProfileCheck\}/, `${layout}: existing application handler preserved`);
  }
});


test('detail view also wraps long configured Attend button labels', () => {
  const details = readFileSync(new URL('../EventDetailsPage.jsx', import.meta.url), 'utf8');
  assert.match(details, /\{getAttendPrimaryLabel\(event\)\}/);
  assert.match(details, /\{getAttendSecondaryLabel\(event, Boolean\(token\)\)\}/);
  assert.match(details, /overflowWrap: "anywhere"/, 'detail buttons must wrap long words');
  assert.match(details, /onClick=\{mustSignInToApply \? goToSignInForApply : openApplyModalAfterProfileCheck\}/,
    'detail secondary CTA must retain its existing guarded application action');
});


test('event card footer wraps long registration URLs without squeezing the Apply Now action', () => {
  const listing = readFileSync(new URL('../EventsPage.jsx', import.meta.url), 'utf8');
  const card = listing.slice(listing.indexOf('function EventCard('), listing.indexOf('function EventRow('));
  assert.match(card, /: "flex flex-wrap items-center justify-between gap-3"/, 'ordinary footer must wrap instead of squeezing the CTA');
  assert.match(card, /min-w-\[8rem\] max-w-full flex-1 break-words/, 'price description has a sensible minimum width');
  assert.match(card, /style=\{\{ overflowWrap: "anywhere" \}\}/, 'a bare URL may break within its text region');
  assert.match(card, /flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2/, 'actions should not shrink below their labels');
});

test('six listing CTA buttons resist shrinking and wrap custom text safely', () => {
  const listing = readFileSync(new URL('../EventsPage.jsx', import.meta.url), 'utf8');
  const card = listing.slice(listing.indexOf('function EventCard('), listing.indexOf('function EventRow('));
  const row = listing.slice(listing.indexOf('function EventRow('), listing.indexOf('function CardFooterSkeleton('));
  for (const [layout, code] of [['grid card', card], ['list row', row]]) {
    assert.equal((code.match(/overflowWrap: "break-word", textAlign: "center", maxWidth: "100%", flexShrink: 0/g) || []).length, 3, `${layout}: three CTA positions`);
    assert.doesNotMatch(code, /className="normal-case (?:w-full )?min-w-0 rounded-full px-4/, `${layout}: no zero-min-width CTA buttons`);
  }
});
