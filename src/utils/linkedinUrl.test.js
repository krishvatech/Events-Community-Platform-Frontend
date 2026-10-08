import test from "node:test";
import assert from "node:assert/strict";

import {
  LINKEDIN_URL_ERROR_MESSAGE,
  LINKEDIN_URL_MISSING_SCHEME_MESSAGE,
  LINKEDIN_URL_TOO_LONG_MESSAGE,
  formatFieldErrors,
  getLinkedinUrlError,
  normalizeLinkedinUrl,
} from "./linkedinUrl.js";

const PROFILE = "https://www.linkedin.com/in/rahul-sharma";

test("empty LinkedIn URL is valid (field is optional)", () => {
  assert.equal(getLinkedinUrlError(""), null);
  assert.equal(getLinkedinUrlError("   "), null);
  assert.equal(getLinkedinUrlError(undefined), null);
  assert.equal(getLinkedinUrlError(null), null);
});

test("valid HTTPS and HTTP URLs are accepted and left unchanged", () => {
  for (const url of [
    PROFILE,
    `${PROFILE}/`,
    "http://linkedin.com/in/rahul-sharma",
    "https://in.linkedin.com/in/rahul-sharma-12ab34",
    `${PROFILE}?utm_source=share&utm_medium=member_ios`,
  ]) {
    assert.equal(getLinkedinUrlError(url), null, url);
    assert.equal(normalizeLinkedinUrl(url), url, url);
  }
});

test("leading/trailing whitespace and invisible characters are trimmed", () => {
  assert.equal(normalizeLinkedinUrl(`  ${PROFILE}  `), PROFILE);
  assert.equal(normalizeLinkedinUrl(`\t${PROFILE}\n`), PROFILE);
  assert.equal(normalizeLinkedinUrl(` ${PROFILE}`), PROFILE);
  // Zero-width space from copy-paste: Django does not strip it and rejects the URL.
  assert.equal(normalizeLinkedinUrl(`​${PROFILE}​`), PROFILE);
  assert.equal(normalizeLinkedinUrl(`﻿${PROFILE}`), PROFILE);
  assert.equal(getLinkedinUrlError(`​ ${PROFILE} `), null);
});

test("URL without a scheme gets an actionable message and is not rewritten", () => {
  assert.equal(getLinkedinUrlError("www.linkedin.com/in/rahul-sharma"), LINKEDIN_URL_MISSING_SCHEME_MESSAGE);
  assert.equal(getLinkedinUrlError("linkedin.com/in/rahul-sharma"), LINKEDIN_URL_MISSING_SCHEME_MESSAGE);
  assert.equal(getLinkedinUrlError("rahul-sharma"), LINKEDIN_URL_MISSING_SCHEME_MESSAGE);
  assert.equal(normalizeLinkedinUrl("linkedin.com/in/x"), "linkedin.com/in/x");
});

test("malformed URLs get the LinkedIn validation message", () => {
  for (const url of [
    "https://www.linkedin.com/in/rahul sharma",
    "https://linkedin",
    "javascript://alert(1)",
    "hxxps://www.linkedin.com/in/x",
    "https://",
  ]) {
    assert.equal(getLinkedinUrlError(url), LINKEDIN_URL_ERROR_MESSAGE, url);
  }
});

test("no LinkedIn-domain requirement beyond the backend's URL rules", () => {
  assert.equal(getLinkedinUrlError("https://example.com/me"), null);
});

/** A valid profile URL padded with a query string to exactly `length` characters. */
const urlOfLength = (length) => {
  const base = `${PROFILE}?ref=`;
  return base + "a".repeat(length - base.length);
};

test("200-character limit matches the backend database column", () => {
  assert.equal(getLinkedinUrlError(urlOfLength(199)), null);
  assert.equal(getLinkedinUrlError(urlOfLength(200)), null);
  assert.equal(normalizeLinkedinUrl(urlOfLength(200)), urlOfLength(200));
  assert.equal(getLinkedinUrlError(urlOfLength(201)), LINKEDIN_URL_TOO_LONG_MESSAGE);
  assert.equal(getLinkedinUrlError(urlOfLength(241)), LINKEDIN_URL_TOO_LONG_MESSAGE);
  // Not truncated: the value is reported, never shortened.
  assert.equal(normalizeLinkedinUrl(urlOfLength(241)).length, 241);
  // Length is counted after trimming whitespace and invisible characters.
  assert.equal(getLinkedinUrlError(`  ${urlOfLength(200)}  `), null);
  assert.equal(getLinkedinUrlError(`​${urlOfLength(200)}`), null);
  assert.equal(getLinkedinUrlError(`​${urlOfLength(201)}`), LINKEDIN_URL_TOO_LONG_MESSAGE);
  // Empty stays valid.
  assert.equal(getLinkedinUrlError(""), null);
});

test("length counts characters, not UTF-16 units", () => {
  const base = `${PROFILE}/`;
  const astral = base + "😀".repeat(200 - base.length); // 200 characters, more UTF-16 units
  assert.ok(astral.length > 200);
  assert.equal(getLinkedinUrlError(astral), null);
  assert.equal(getLinkedinUrlError(`${astral}😀`), LINKEDIN_URL_TOO_LONG_MESSAGE);
});

test("formatFieldErrors renders DRF field errors and ignores unusable shapes", () => {
  assert.equal(
    formatFieldErrors({ email: ["Enter a valid email address."] }),
    "Please check the following: Email: Enter a valid email address."
  );
  assert.equal(
    formatFieldErrors({ non_field_errors: ["Applications are closed."] }),
    "Please check the following: Applications are closed."
  );
  assert.equal(
    formatFieldErrors({ some_field: ["Bad value."] }),
    "Please check the following: Some field: Bad value."
  );
  assert.equal(formatFieldErrors({ track_applications: [{ track_id: ["x"] }] }), null);
  assert.equal(formatFieldErrors(null), null);
  assert.equal(formatFieldErrors("<html>Server Error</html>"), null);
  assert.equal(formatFieldErrors([]), null);
});
