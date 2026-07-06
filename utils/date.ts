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

export function isValidDateInput(value: string) {
  return parseDateOnly(value) !== null;
}

export function formatDate(value?: string) {
  if (!value) {
    return 'No date';
  }

  const parsed = parseDateOnly(value);
  if (!parsed) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

export function getDaysUntil(value: string, today = new Date()) {
  const parsed = parseDateOnly(value);
  if (!parsed) {
    return Number.NaN;
  }

  return Math.round((parsed.getTime() - startOfDay(today).getTime()) / DAY_IN_MS);
}

export function isExpired(value?: string) {
  if (!value) {
    return false;
  }

  return getDaysUntil(value) < 0;
}

export function isExpiringSoon(value?: string, thresholdDays = 3) {
  if (!value) {
    return false;
  }

  const days = getDaysUntil(value);
  return days >= 0 && days <= thresholdDays;
}

export function getExpiryLabel(value?: string) {
  if (!value) {
    return 'No expiry set';
  }

  const days = getDaysUntil(value);
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
