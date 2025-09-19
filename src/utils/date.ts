export function formatFullDate(dateLike: any) {
  if (!dateLike) return 'TBD';
  const date = dateLike?.toDate ? dateLike.toDate() : new Date(dateLike);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function formatShort(dateLike: any) {
  if (!dateLike) return 'TBD';
  const date = dateLike?.toDate ? dateLike.toDate() : new Date(dateLike);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
