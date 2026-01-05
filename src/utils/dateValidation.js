export const isFutureYear = (value, now = new Date()) => {
  const y = parseInt(String(value || "").trim(), 10);
  if (!y) return false;
  return y > now.getFullYear();
};

export const isFutureMonth = (value, now = new Date()) => {
  const parts = String(value || "").split("-");
  if (parts.length < 2) return false;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (!y || !m) return false;
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  return y > nowYear || (y === nowYear && m > nowMonth);
};

export const isFutureDate = (value, now = new Date()) => {
  const parts = String(value || "").split("-");
  if (parts.length < 3) return false;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (!y || !m || !d) return false;
  const input = new Date(y, m - 1, d);
  if (Number.isNaN(input.getTime())) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return input > today;
};
