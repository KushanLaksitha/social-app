import { formatDistanceToNow as fdn } from 'date-fns';

export const parseUTC = (dateStr) => {
  if (!dateStr) return null;
  // SQLite format: YYYY-MM-DD HH:MM:SS or ISO
  let clean = dateStr;
  if (dateStr.includes(' ') && !dateStr.includes('T')) {
    clean = dateStr.replace(' ', 'T');
  }
  const iso = clean.endsWith('Z') || clean.includes('+') ? clean : clean + 'Z';
  const date = new Date(iso);
  return isNaN(date.getTime()) ? new Date(dateStr) : date;
};

export const formatDistanceToNow = (dateStr) => {
  const date = parseUTC(dateStr);
  if (!date) return '';
  try {
    return fdn(date, { addSuffix: true });
  } catch (e) {
    return '';
  }
};
