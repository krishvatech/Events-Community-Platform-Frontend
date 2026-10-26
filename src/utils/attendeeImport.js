// Helpers for the bulk attendee import dialog (backend: events/services/attendee_import.py).

export const REASON_LABELS = {
  missing_email: "Email is missing",
  invalid_email: "Email is not valid",
  disposable_email: "Disposable email addresses are not allowed",
  missing_first_name: "First name is missing",
  missing_last_name: "Last name is missing",
  missing_type: "Type is missing",
  invalid_type: "Type must be Attendee, Sponsor or Paid Attendee",
  multiple_accounts: "More than one account uses this email",
  application_linked_to_other_account: "The application belongs to another account",
  already_registered: "Already registered",
  already_accepted: "Already accepted and registered",
  email_exists_in_login_system: "This email already has a login without an IMAA Connect account",
  cognito_create_failed: "Could not create the login",
  cognito_not_configured: "Login service is not configured",
  username_unavailable: "Could not create a username",
  unexpected_error: "Unexpected error",
};

export const WARNING_LABELS = {
  disposable_email: "Disposable email address",
  was_declined: "Was declined",
  was_cancelled: "Was cancelled",
  reactivates_cancelled_registration: "Reactivates a cancelled registration",
  reactivates_deregistered_registration: "Reactivates a deregistered registration",
};

export function reasonLabel(reason) {
  if (!reason) return "";
  const duplicate = /^duplicate_email_in_file:row_(\d+)$/.exec(reason);
  if (duplicate) return `Same email as row ${duplicate[1]}`;
  return REASON_LABELS[reason] || reason;
}

export function warningLabel(warning) {
  return WARNING_LABELS[warning] || warning;
}

// What will happen (preview) or what happened (result) to a row.
// A result row carries `status`; a preview row only `action`.
export function describeRow(row) {
  const action = row.status || row.action;
  const newAccount = row.account === "create";
  if (action === "register") {
    return { label: newAccount ? "New account + register" : "Register", color: "success" };
  }
  if (action === "accept_application") {
    const app = row.application === "new" ? "create & accept application" : "accept application";
    return { label: newAccount ? `New account + ${app}` : app[0].toUpperCase() + app.slice(1), color: "success" };
  }
  if (action === "skip") return { label: "Skip", color: "default" };
  return { label: "Error", color: "error" };
}

export function rowNotes(row) {
  const notes = [];
  if (row.reason) notes.push(reasonLabel(row.reason));
  for (const warning of row.warnings || []) notes.push(warningLabel(warning));
  if (row.account_created) notes.push("Account was created; login details sent");
  return notes.join(" · ");
}

export function emailStatus(row) {
  const emails = row.emails || {};
  const parts = [];
  if ("credentials" in emails) parts.push(`Login details ${emails.credentials ? "sent" : "FAILED"}`);
  if ("registration_confirmation" in emails) {
    parts.push(`Confirmation ${emails.registration_confirmation ? "sent" : "FAILED"}`);
  }
  return parts.join(" · ");
}

const csvCell = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function buildReportCsv(results) {
  const header = ["Row", "Email", "First Name", "Last Name", "Type", "Result", "Notes", "Emails"];
  const lines = [header.map(csvCell).join(",")];
  for (const row of results) {
    lines.push(
      [
        row.row,
        row.email,
        row.first_name,
        row.last_name,
        row.type_label,
        describeRow(row).label,
        rowNotes(row),
        emailStatus(row),
      ]
        .map(csvCell)
        .join(",")
    );
  }
  return lines.join("\r\n");
}

// Only open, active tracks can take an import (the backend also requires an active tier).
export function importableTracks(tracks) {
  return (tracks || []).filter(
    (track) => track.is_active !== false && (track.status || "open") === "open"
  );
}
