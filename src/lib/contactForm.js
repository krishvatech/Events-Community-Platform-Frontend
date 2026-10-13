// src/lib/contactForm.js
// Contact Us form rules (client side) and the reading of POST /api/cms/public/contact/ answers.
// Pure functions, shared by src/components/public/contact/ContactForm.jsx and its tests.
//
// The backend (ecp-backend cms/contact.py) is the authority: it validates again, checks the signed
// form token (minimum fill time, maximum age), the honeypot, the rate limit and duplicates, and
// e-mails the enquiry. A submission counts as sent ONLY when it answers 200 {"status": "sent"};
// every other answer is shown as an error, never as success.

export const CONTACT_FIELDS = Object.freeze(["first_name", "last_name", "email", "phone", "country", "message", "consent"]);
export const FIELD_LABELS = Object.freeze({
  first_name: "First name",
  last_name: "Last name",
  email: "E-mail",
  phone: "Phone",
  country: "Country",
  message: "Message",
  consent: "Consent",
});

export const EMPTY_CONTACT = Object.freeze({ first_name: "", last_name: "", email: "", phone: "", country: "", message: "", consent: false, website: "" });

const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const PHONE = /^[0-9+()./\s-]{0,40}$/; // as the backend

/** Field errors ({field: message}) for the values; empty when the form may be sent. */
export function validateContact(values, { countries = [], max_lengths: limits = {} } = {}) {
  const errors = {};
  const value = (name) => String(values?.[name] ?? "").trim();
  for (const name of ["first_name", "last_name", "message"]) {
    if (!value(name)) errors[name] = `Enter your ${FIELD_LABELS[name].toLowerCase()}.`;
  }
  if (!value("email")) errors.email = "Enter your e-mail address.";
  else if (!EMAIL.test(value("email"))) errors.email = "Enter a valid e-mail address, like name@example.com.";
  if (value("phone") && !PHONE.test(value("phone"))) errors.phone = "Use digits, spaces and + ( ) - only.";
  if (!countries.includes(value("country"))) errors.country = "Select your country.";
  for (const [name, max] of Object.entries(limits)) {
    if (!errors[name] && value(name).length > max) errors[name] = `Use at most ${max} characters.`;
  }
  if (values?.consent !== true) errors.consent = "Please agree so that we can respond to your enquiry.";
  return errors;
}

/** The JSON body the endpoint expects (trimmed values, the honeypot and the signed token). */
export function contactPayload(values, token) {
  const trimmed = (name) => String(values?.[name] ?? "").trim();
  return {
    first_name: trimmed("first_name"),
    last_name: trimmed("last_name"),
    email: trimmed("email"),
    phone: trimmed("phone"),
    country: trimmed("country"),
    message: trimmed("message"),
    consent: values?.consent === true,
    website: String(values?.website ?? ""),
    form_token: token,
  };
}

const FALLBACK = "Your message could not be sent. Please try again in a moment, or e-mail us instead.";
const CODE_MESSAGES = {
  form_expired: "This form has expired. Reload the page and send your message again.",
  form_invalid: "This form could not be verified. Reload the page and send your message again.",
  too_fast: "Please take a moment and send the form again.",
  contact_unavailable: "The contact form is not available at the moment. Please e-mail us instead.",
  delivery_failed: "Your message could not be sent. Please e-mail us instead.",
};

/**
 * What a response means for the visitor.
 * @returns {{kind: "sent"} | {kind: "invalid", fieldErrors: object, message: string}
 *          | {kind: "error", message: string, reload?: boolean}}
 */
export function interpretContactResponse(status, body) {
  const data = body !== null && typeof body === "object" && !Array.isArray(body) ? body : {};
  if (status === 200) {
    return data.status === "sent" ? { kind: "sent" } : { kind: "error", message: FALLBACK };
  }
  if (status === 429) {
    return { kind: "error", message: "You have sent several messages in a short time. Please wait a while before trying again, or e-mail us." };
  }
  if (typeof data.code === "string" && CODE_MESSAGES[data.code]) {
    return { kind: "error", message: CODE_MESSAGES[data.code], reload: data.code === "form_expired" || data.code === "form_invalid" };
  }
  if (status === 400) {
    const fieldErrors = {};
    for (const name of CONTACT_FIELDS) {
      const raw = data[name];
      const message = Array.isArray(raw) ? raw.find((m) => typeof m === "string") : typeof raw === "string" ? raw : "";
      if (message) fieldErrors[name] = message;
    }
    if (Object.keys(fieldErrors).length) return { kind: "invalid", fieldErrors, message: "Please correct the highlighted fields." };
    if (data.form_token) return { kind: "error", message: CODE_MESSAGES.form_invalid, reload: true };
  }
  if (status === 503) return { kind: "error", message: CODE_MESSAGES.contact_unavailable };
  return { kind: "error", message: FALLBACK };
}

/** Browser-side API base (the public NEXT_PUBLIC_ value, inlined at build time). */
export function publicApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api").trim().replace(/\/+$/, "");
}

/**
 * A new signed form token (the published Contact Us page issues one per request), or "" when it
 * cannot be had. Used after "form_expired"/"form_invalid", so the visitor keeps what they typed.
 */
export async function fetchContactFormToken({ fetchImpl = globalThis.fetch, apiBase = publicApiBaseUrl() } = {}) {
  try {
    const response = await fetchImpl(`${apiBase}/cms/public/pages/by-path/?path=${encodeURIComponent("/contact-us/")}`, {
      credentials: "omit",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (response.status !== 200) return "";
    const data = await response.json();
    const token = data?.type === "ContactPage" && typeof data?.form?.token === "string" ? data.form.token.trim() : "";
    return data?.form?.enabled === true ? token : "";
  } catch {
    return "";
  }
}

/** POST the enquiry; resolves to interpretContactResponse's result (network failures included). */
export async function submitContact(values, token, { fetchImpl = globalThis.fetch, apiBase = publicApiBaseUrl() } = {}) {
  let response;
  try {
    response = await fetchImpl(`${apiBase}/cms/public/contact/`, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(contactPayload(values, token)),
    });
  } catch {
    return { kind: "error", message: "Your message could not be sent: the connection failed. Please check your connection and try again." };
  }
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return interpretContactResponse(response.status, body);
}
