// Gilded Ledger design reminder: financial inputs may feel human at entry but resolve to one unambiguous operational value.
export function parseNaira(input) {
  if (input === null || input === undefined || input === '') return null;
  const raw = String(input).trim().toLowerCase().replace(/[₦#\s,]/g, '');
  const million = raw.match(/^(\d+(?:\.\d+)?)(m|million)$/);
  if (million) return Math.round(Number(million[1]) * 1_000_000);
  const thousand = raw.match(/^(\d+(?:\.\d+)?)(k|thousand)$/);
  if (thousand) return Math.round(Number(thousand[1]) * 1_000);
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function formatNaira(input) {
  const amount = typeof input === 'number' ? input : parseNaira(input);
  if (amount === null) return '';
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
}

export function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
}

export const paceOptions = ['Poor', 'Probation', 'Coasting', 'Sterling'];
