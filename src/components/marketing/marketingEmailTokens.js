// Mautic token helpers for the Marketing Hub email editors.
//
// Tokens come from GET /newsletter/admin/templates/tokens/ (Mautic contact and
// company fields plus the system tokens), e.g. {contactfield=firstname},
// {companyfield=companyname}, {unsubscribe_url}. They are kept in Mautic's own
// syntax end to end: never converted to Django/liquid tags and never replaced
// with sample contact data.

import { useEffect, useRef, useState } from "react";

import { listNewsletterTemplateTokens } from "../../services/newsletterService";

/** The shape of every token Mautic accepts in an email body. */
const TOKEN_SHAPE = /^\{[a-z][a-z0-9_]*(?:=[A-Za-z0-9_]+)?\}$/;

/** Field tokens, whether or not the backend listed them (fields can be added later). */
const FIELD_TOKEN_SOURCE = "\\{(?:contactfield|companyfield)=[A-Za-z0-9_]+\\}";

/** Anything that looks like a field token, including malformed ones like "{contactfield=}". */
const FIELD_TOKEN_LIKE = /\{(contactfield|companyfield)=([^{}]*)\}/g;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const isMauticToken = (value) => TOKEN_SHAPE.test(String(value || ""));

/**
 * Normalizes the backend token list: drops malformed rows and duplicates,
 * keeps the backend's labels and groups.
 */
export function normalizeMauticTokens(rows) {
  const seen = new Set();
  const tokens = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const token = String(row?.token || "").trim();
    if (!isMauticToken(token) || seen.has(token)) continue;
    seen.add(token);
    tokens.push({
      token,
      label: String(row?.label || "").trim() || token.replace(/[{}]/g, ""),
      group: String(row?.group || "").trim() || "Tokens",
    });
  }
  return tokens;
}

export function groupMauticTokens(tokens) {
  return (Array.isArray(tokens) ? tokens : []).reduce((groups, token) => {
    const group = token.group || "Tokens";
    return { ...groups, [group]: [...(groups[group] || []), token] };
  }, {});
}

/**
 * Templatical merge-tag syntax that recognizes Mautic tokens.
 *
 * `value` matches any contact/company field token plus every non-field token
 * the backend listed (e.g. {unsubscribe_url}); unrelated braces in content are
 * left alone. Mautic has no logic tags, so `logic` never matches. A custom
 * syntax turns off Templatical's typing autocomplete, which is why tokens are
 * inserted through an explicit picker instead.
 */
export function createMauticMergeTagSyntax(tokens) {
  const systemTokens = normalizeMauticTokens(tokens)
    .map((item) => item.token)
    .filter((token) => !token.includes("="))
    .map(escapeRegExp);
  const source = [FIELD_TOKEN_SOURCE, ...systemTokens].join("|");
  return {
    value: new RegExp(source, "g"),
    logic: /\{%(?!)(\w+)%\}/g,
  };
}

/** Templatical MergeTag rows: { label, value } with the raw Mautic token as value. */
export const toEditorMergeTags = (tokens) =>
  normalizeMauticTokens(tokens).map(({ label, token }) => ({ label, value: token }));

/**
 * Field tokens in `content` that the backend did not list, or that are
 * malformed. Mautic renders an unknown field as an empty string, so these are
 * shown as warnings before saving rather than silently sent.
 */
export function findUnknownFieldTokens(content, tokens) {
  const known = new Set(normalizeMauticTokens(tokens).map((item) => item.token));
  const text = typeof content === "string" ? content : JSON.stringify(content ?? "");
  const unknown = new Set();
  for (const match of text.matchAll(FIELD_TOKEN_LIKE)) {
    const token = match[0];
    if (!isMauticToken(token) || !known.has(token)) unknown.add(token);
  }
  return [...unknown];
}

/** Inserts `token` into `value` at the [start, end) selection; returns the new value and caret. */
export function insertTokenAt(value, token, start, end) {
  const current = String(value ?? "");
  const from = Number.isInteger(start) ? Math.max(0, Math.min(start, current.length)) : current.length;
  const to = Number.isInteger(end) ? Math.max(from, Math.min(end, current.length)) : from;
  return {
    value: `${current.slice(0, from)}${token}${current.slice(to)}`,
    caret: from + token.length,
  };
}

/**
 * Loads the Mautic token list once per mount, only when `enabled` becomes
 * true. A failure leaves the list empty with an error message; callers keep
 * working without tokens.
 */
export function useMauticTokens(enabled = true) {
  const [state, setState] = useState({ loading: false, loaded: false, tokens: [], error: "" });
  const loaded = useRef(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled || loaded.current) return undefined;
    // `active` is per run: StrictMode's discarded first run, or a run whose
    // component unmounted, never writes state. The next run fetches again.
    let active = true;
    setState((current) => ({ ...current, loading: true, error: "" }));
    listNewsletterTemplateTokens()
      .then((data) => {
        if (!active) return;
        loaded.current = true;
        setState({ loading: false, loaded: true, tokens: normalizeMauticTokens(data?.results), error: "" });
      })
      .catch(() => {
        if (!active) return;
        setState({ loading: false, loaded: false, tokens: [], error: "Mautic tokens could not be loaded." });
      });
    return () => {
      active = false;
    };
  }, [enabled, attempt]);

  return { ...state, retry: () => setAttempt((value) => value + 1) };
}
