const DAY_IN_MS = 24 * 60 * 60 * 1000;

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseComparableDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const dateOnly = parseDateOnly(trimmedValue);
  if (dateOnly) {
    return dateOnly;
  }

  const parsed = new Date(trimmedValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return startOfDay(parsed);
}

export function isValidDateInput(value: string) {
  return parseDateOnly(value) !== null;
}

export function formatDate(value?: string | null) {
  if (!value) {
    return 'No date';
  }

  const parsed = parseComparableDate(value);
  if (!parsed) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

function formatDateParts(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getTodayDateInputValue(today = new Date()) {
  return formatDateParts(startOfDay(today));
}

export function addDaysToDateInputValue(days: number, today = new Date()) {
  const nextDate = startOfDay(today);
  nextDate.setDate(nextDate.getDate() + days);
  return formatDateParts(nextDate);
}

export function toDateInputValue(value?: string | null) {
  const parsed = parseComparableDate(value);
  if (!parsed) {
    return '';
  }

  return formatDateParts(parsed);
}

export function daysUntilExpiry(expiresAt?: string | null, today = new Date()) {
  const parsed = parseComparableDate(expiresAt);
  if (!parsed) {
    return Number.NaN;
  }

  return Math.round((parsed.getTime() - startOfDay(today).getTime()) / DAY_IN_MS);
}

export function getDaysUntil(value: string, today = new Date()) {
  return daysUntilExpiry(value, today);
}

export function isExpired(expiresAt?: string | null) {
  return daysUntilExpiry(expiresAt) < 0;
}

export function isExpiringSoon(expiresAt?: string | null, days = 3) {
  const daysRemaining = daysUntilExpiry(expiresAt);
  return daysRemaining >= 0 && daysRemaining <= days;
}

export function getExpiryLabel(value?: string | null) {
  if (!value) {
    return 'No expiry set';
  }

  const days = daysUntilExpiry(value);
  if (Number.isNaN(days)) {
    return value;
  }
  if (days < 0) {
    return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
  }
  if (days === 0) {
    return 'Use today';
  }
  if (days === 1) {
    return 'Use tomorrow';
  }

  return `Use in ${days} days`;
}
