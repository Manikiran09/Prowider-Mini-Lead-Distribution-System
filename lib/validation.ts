export function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, '');
}

export function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function getCurrentMonthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

export function isValidPhoneNumber(value: string) {
  return /^\d{10}$/.test(value);
}
