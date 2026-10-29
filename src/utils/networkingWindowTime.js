import dayjs from 'dayjs';

export function normalizeNetworkingTime(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  const twentyFour = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(text);
  if (twentyFour) return `${twentyFour[1]}:${twentyFour[2]}`;

  const twelve = /^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/i.exec(text);
  if (!twelve) return null;
  const hour = Number(twelve[1]) % 12 + (twelve[3].toUpperCase() === 'PM' ? 12 : 0);
  return `${String(hour).padStart(2, '0')}:${twelve[2]}`;
}

export function networkingTimePickerValue(value) {
  const normalized = normalizeNetworkingTime(value);
  return normalized ? dayjs(`2000-01-01T${normalized}:00`) : null;
}

export function validateNetworkingWindows(windows) {
  return windows.map((window, index) => {
    const prefix = `Window ${index + 1}: `;
    const date = window?.date;
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !dayjs(date).isValid() || dayjs(date).format('YYYY-MM-DD') !== date) {
      return `${prefix}Select a valid date.`;
    }
    const start = normalizeNetworkingTime(window?.start);
    const end = normalizeNetworkingTime(window?.end);
    if (!start || !end) return `${prefix}Select valid start and end times.`;
    if (end <= start) return 'End time must be after start time. Please select a valid time range.';
    return '';
  });
}

export function normalizedNetworkingWindows(windows) {
  return windows.map(window => ({
    date: window.date,
    start: normalizeNetworkingTime(window.start),
    end: normalizeNetworkingTime(window.end),
  }));
}
