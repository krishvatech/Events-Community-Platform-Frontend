export const RECORDINGS_BUCKET_URL =
  "https://events-agora-recordings.s3.eu-central-1.amazonaws.com";

export const resolveRecordingUrl = (rawUrl) => {
  if (!rawUrl || rawUrl === "[null]") return "";

  const value = String(rawUrl).trim();
  if (!value || value === "[null]") return "";

  if (/^https?:\/\//i.test(value)) return value;

  const key = value.replace(/^\/+/, "");
  return `${RECORDINGS_BUCKET_URL}/${key}`;
};
