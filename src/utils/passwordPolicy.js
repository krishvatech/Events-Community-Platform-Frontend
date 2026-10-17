// Shared IMAA Connect account password policy.
//
// Both the AuthModal signup form and the IPDT-772 guest event-application
// registration flow validate new-account passwords against this single source
// so the rule can never drift between the two surfaces. The regex and message
// are the exact policy AuthModal used previously: at least 8 characters, one
// uppercase letter, one digit, one special character, and no whitespace.
export const PASSWORD_POLICY_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[^\s]{8,}$/;

export const PASSWORD_POLICY_MESSAGE = "Min 8 chars, 1 uppercase, 1 number, 1 special";

export const isValidPassword = (value) => PASSWORD_POLICY_REGEX.test(value || "");
