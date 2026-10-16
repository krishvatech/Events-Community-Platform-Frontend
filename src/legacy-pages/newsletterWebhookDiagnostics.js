/**
 * Display text for the Settings → Webhooks diagnostics card (B15).
 *
 * The backend reads Mautic's webhook list read-only and reports whether the
 * shared secret matches as a yes/no only; the secret itself never reaches
 * the browser. Delivery evidence is what this receiver itself observed.
 */

const EVENT_LABELS = {
  "mautic.email_on_send": "Email sent",
  "mautic.email_on_open": "Email opened",
  "mautic.page_on_hit": "Link clicked",
  "mautic.lead_channel_subscription_changed": "Subscription changed",
};

const REJECTION_LABELS = {
  invalid_signature: "Invalid signature",
  invalid_json: "Invalid JSON",
  too_large: "Payload too large",
  too_many_events: "Too many events",
};

/** Whether the backend reports registration details (older backends do not). */
export function hasWebhookVerification(webhook) {
  return Boolean(webhook) && Object.prototype.hasOwnProperty.call(webhook, "secret_matches");
}

export function webhookSecretLabel(secretMatches) {
  if (secretMatches === true) return "Matches";
  if (secretMatches === false) return "Does not match";
  return "Not verified";
}

export function webhookDeliveryHostLabel(webhook) {
  const host = webhook?.delivery_host;
  if (!host) return "";
  return webhook.delivery_host_private ? `${host} (private address)` : host;
}

export function webhookEventLabel(eventType) {
  return EVENT_LABELS[eventType] || String(eventType || "").replace(/^mautic\./, "");
}

/** "3 of 4" subscribed, or "" when no hook was found to compare. */
export function webhookSubscribedLabel(webhook) {
  if (!webhook?.matching_hooks) return "";
  const registered = webhook.registered_events || [];
  const missing = webhook.missing_events || [];
  return `${registered.length} of ${registered.length + missing.length}`;
}

export function webhookMissingEventsText(webhook) {
  if (!webhook?.matching_hooks) return "";
  const missing = webhook?.missing_events || [];
  return missing.length ? `Not subscribed: ${missing.map(webhookEventLabel).join(", ")}` : "";
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** Summary of one observed delivery, or "" when none was recorded. */
export function webhookDeliveryText(kind, observation) {
  if (!observation) return "";
  if (kind === "accepted") {
    const parts = [
      `${Number(observation.created) || 0} new`,
      `${Number(observation.duplicate) || 0} duplicate`,
      `${Number(observation.ignored) || 0} ignored`,
    ];
    const consent = Number(observation.consent_synced) || 0;
    if (consent) parts.push(plural(consent, "consent update"));
    return parts.join(", ");
  }
  if (kind === "rejected") {
    return REJECTION_LABELS[observation.reason] || String(observation.reason || "Rejected");
  }
  if (kind === "failed") {
    const types = (observation.error_types || []).join(", ");
    const text = `${plural(Number(observation.failed) || 0, "event")} failed`;
    return types ? `${text} (${types})` : text;
  }
  return "";
}
