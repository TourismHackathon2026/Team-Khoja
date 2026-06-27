/* eslint-disable no-unused-vars */
import { format, formatDistanceToNow } from 'date-fns';

export function safeFormatDate(dateStr, formatStr = 'PPP') {
  if (!dateStr) return 'Unknown date';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Unknown date';
    return format(d, formatStr);
  } catch (err) {
    return 'Unknown date';
  }
}

export function safeFormatDistanceToNow(dateStr, options = { addSuffix: true }) {
  if (!dateStr) return 'Unknown time';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Unknown time';
    return formatDistanceToNow(d, options);
  } catch (err) {
    return 'Unknown time';
  }
}
