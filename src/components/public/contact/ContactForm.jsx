"use client";

// src/components/public/contact/ContactForm.jsx
// The Contact Us enquiry form. Sends to POST /api/cms/public/contact/ (ecp-backend cms/contact.py),
// which e-mails the enquiry to the configured recipients; nothing is stored.
//
// * Fields, country list and length limits come from the page API (form config); the consent text
//   is the CMS's. Client-side checks mirror the backend's, which stays the authority.
// * Spam protection is the backend's: the signed form token issued with the page (minimum fill
//   time, maximum age), the hidden honeypot field "website", the rate limit and duplicates. An
//   expired token is renewed in place, so the visitor keeps what they typed.
// * One request at a time; success is shown ONLY for 200 {"status": "sent"}. Every failure keeps
//   the values and says what to do next.
// * Accessibility: real labels, required fields marked, aria-invalid + aria-describedby for errors,
//   an error summary that receives focus, and a status message that receives focus after sending.
import { useEffect, useId, useRef, useState } from "react";
import { EMPTY_CONTACT, FIELD_LABELS, fetchContactFormToken, submitContact, validateContact } from "../../../lib/contactForm.js";
import { FOCUS_RING, PRIMARY_BUTTON, SMALL_PROSE_CLASS } from "../about/aboutStyles.js";

const INPUT =
  "block w-full rounded-lg border bg-white px-3.5 py-2.5 font-sans text-base text-imaa-ink placeholder:text-imaa-hint " +
  "focus:border-imaa-teal focus:outline-none focus:ring-2 focus:ring-imaa-teal/30 disabled:opacity-60";
const labelHtml = (html) => {
  const paragraphs = html.match(/<p(\s[^>]*)?>/g) || [];
  if (paragraphs.length <= 1) return html.replace(/<\/?p(\s[^>]*)?>/g, "").trim();
  return html.replace(/<p(\s[^>]*)?>/g, '<span class="block">').replace(/<\/p>/g, "</span>");
};
const ORDER = ["first_name", "last_name", "email", "phone", "country", "message", "consent"];

function Field({ id, name, label, required, error, hint, children }) {
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="mb-1.5 font-sans text-sm font-semibold text-imaa-ink">
        {label}
        {required ? (
          <>
            <span aria-hidden="true" className="text-red-700"> *</span>
            <span className="sr-only"> (required)</span>
          </>
        ) : (
          <span className="font-normal text-imaa-meta"> (optional)</span>
        )}
      </label>
      {children}
      {hint && !error ? <p id={`${id}-hint`} className="m-0 mt-1 text-xs text-imaa-meta">{hint}</p> : null}
      {error ? (
        <p id={`${id}-error`} data-field-error={name} className="m-0 mt-1.5 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function ContactForm({ form, consentHtml, successMessage, fallbackEmail }) {
  const uid = useId();
  const id = (name) => `${uid}-${name}`;
  const [values, setValues] = useState(EMPTY_CONTACT);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent
  const [token, setToken] = useState(form.token);
  const sending = useRef(false);
  const summary = useRef(null);
  const done = useRef(null);

  useEffect(() => {
    if (status === "sent") done.current?.focus();
  }, [status]);

  const set = (name) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors(({ [name]: _removed, ...rest }) => rest);
  };

  const showProblems = (fieldErrors, message) => {
    setErrors(fieldErrors);
    setFormError(message);
    // After React renders the summary.
    setTimeout(() => summary.current?.focus(), 0);
  };

  async function onSubmit(event) {
    event.preventDefault();
    if (sending.current) return; // never two requests for one enquiry
    const problems = validateContact(values, form);
    if (Object.keys(problems).length) {
      showProblems(problems, "Please correct the highlighted fields.");
      return;
    }
    sending.current = true;
    setStatus("sending");
    setFormError("");
    try {
      const result = await submitContact(values, token);
      if (result.kind === "sent") {
        setStatus("sent");
        return;
      }
      setStatus("idle");
      if (result.kind === "invalid") {
        showProblems(result.fieldErrors, result.message);
      } else if (result.reload) {
        const renewed = await fetchContactFormToken();
        if (renewed) {
          setToken(renewed);
          showProblems({}, "The form was renewed for security. Your message is still here: please check it and send it again.");
        } else {
          showProblems({}, result.message);
        }
      } else {
        showProblems({}, result.message);
      }
    } finally {
      sending.current = false;
    }
  }

  if (status === "sent") {
    return (
      <div ref={done} tabIndex={-1} role="status" className={`rounded-xl border border-green-200 bg-green-50 p-6 ${FOCUS_RING}`} data-contact-result="sent">
        <p className="m-0 font-sans text-lg font-semibold text-green-800">{successMessage || "Thank you for your message. It has been sent."}</p>
      </div>
    );
  }

  const busy = status === "sending";
  const errorList = ORDER.filter((name) => errors[name]);
  const describedBy = (name, hint = false) =>
    [errors[name] ? `${id(name)}-error` : "", hint && !errors[name] ? `${id(name)}-hint` : ""].filter(Boolean).join(" ") || undefined;
  const inputClass = (name) => `${INPUT} ${errors[name] ? "border-red-600" : "border-imaa-border"}`;
  const limit = (name) => form.max_lengths[name];

  return (
    <form noValidate onSubmit={onSubmit} aria-busy={busy} data-contact-form="" className="relative">
      {formError ? (
        <div ref={summary} tabIndex={-1} role="alert" className={`mb-6 rounded-xl border border-red-600 bg-red-50 p-4 ${FOCUS_RING}`} data-contact-result="error">
          <p className="m-0 font-sans text-sm font-semibold text-red-700">{formError}</p>
          {errorList.length ? (
            <ul className="m-0 mt-2 list-disc pl-5 text-sm text-red-700">
              {errorList.map((name) => (
                <li key={name}>
                  <a href={`#${id(name)}`} className="text-red-700 underline">
                    {FIELD_LABELS[name]}: {errors[name]}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {!errorList.length && fallbackEmail ? (
            <p className="m-0 mt-2 text-sm text-red-700">
              E-mail: <a href={`mailto:${fallbackEmail}`} className="text-red-700 underline">{fallbackEmail}</a>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={id("first_name")} name="first_name" label="First name" required error={errors.first_name}>
          <input id={id("first_name")} name="first_name" type="text" autoComplete="given-name" required maxLength={limit("first_name")}
                 value={values.first_name} onChange={set("first_name")} disabled={busy}
                 aria-invalid={Boolean(errors.first_name)} aria-describedby={describedBy("first_name")} className={inputClass("first_name")} />
        </Field>
        <Field id={id("last_name")} name="last_name" label="Last name" required error={errors.last_name}>
          <input id={id("last_name")} name="last_name" type="text" autoComplete="family-name" required maxLength={limit("last_name")}
                 value={values.last_name} onChange={set("last_name")} disabled={busy}
                 aria-invalid={Boolean(errors.last_name)} aria-describedby={describedBy("last_name")} className={inputClass("last_name")} />
        </Field>
        <Field id={id("email")} name="email" label="E-mail" required error={errors.email}>
          <input id={id("email")} name="email" type="email" autoComplete="email" inputMode="email" required maxLength={limit("email")}
                 value={values.email} onChange={set("email")} disabled={busy}
                 aria-invalid={Boolean(errors.email)} aria-describedby={describedBy("email")} className={inputClass("email")} />
        </Field>
        <Field id={id("phone")} name="phone" label="Phone" error={errors.phone}>
          <input id={id("phone")} name="phone" type="tel" autoComplete="tel" maxLength={limit("phone")}
                 value={values.phone} onChange={set("phone")} disabled={busy}
                 aria-invalid={Boolean(errors.phone)} aria-describedby={describedBy("phone")} className={inputClass("phone")} />
        </Field>
        <div className="sm:col-span-2">
          <Field id={id("country")} name="country" label="Country" required error={errors.country}>
            <select id={id("country")} name="country" autoComplete="country-name" required value={values.country} onChange={set("country")} disabled={busy}
                    aria-invalid={Boolean(errors.country)} aria-describedby={describedBy("country")} className={inputClass("country")}>
              <option value="">Select your country</option>
              {form.countries.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field id={id("message")} name="message" label="Message" required error={errors.message}
                 hint={`Up to ${limit("message")} characters (${values.message.length} used).`}>
            <textarea id={id("message")} name="message" rows={6} required maxLength={limit("message")}
                      value={values.message} onChange={set("message")} disabled={busy}
                      aria-invalid={Boolean(errors.message)} aria-describedby={describedBy("message", true)} className={`${inputClass("message")} resize-y`} />
          </Field>
        </div>
      </div>

      {/* Honeypot: hidden from people and assistive technology; bots that fill it are ignored by the backend. */}
      <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor={id("website")}>Leave this field empty</label>
        <input id={id("website")} name="website" type="text" tabIndex={-1} autoComplete="off" value={values.website} onChange={set("website")} />
      </div>

      <div className="mt-6">
        <div className="flex items-start gap-3">
          <input id={id("consent")} name="consent" type="checkbox" required checked={values.consent} onChange={set("consent")} disabled={busy}
                 aria-invalid={Boolean(errors.consent)} aria-describedby={describedBy("consent")}
                 className={`mt-1 h-5 w-5 shrink-0 accent-imaa-teal-dark ${FOCUS_RING}`} />
          <label htmlFor={id("consent")} className={`${SMALL_PROSE_CLASS} cursor-pointer`}>
            {/* A <p> is not allowed inside a <label>: one paragraph is inlined, several become block spans. */}
            <span dangerouslySetInnerHTML={{ __html: labelHtml(consentHtml) }} />
            <span aria-hidden="true" className="text-red-700"> *</span>
            <span className="sr-only"> (required)</span>
          </label>
        </div>
        {errors.consent ? (
          <p id={`${id("consent")}-error`} data-field-error="consent" className="m-0 ml-8 mt-1.5 text-sm font-medium text-red-700">{errors.consent}</p>
        ) : null}
      </div>

      <button type="submit" disabled={busy} className={`${PRIMARY_BUTTON} mt-7 gap-2 disabled:cursor-wait disabled:opacity-70`}>
        {busy ? (
          <>
            <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" />
            Sending…
          </>
        ) : (
          "Send message"
        )}
      </button>
      <p className="sr-only" aria-live="polite">{busy ? "Sending your message…" : ""}</p>
    </form>
  );
}
