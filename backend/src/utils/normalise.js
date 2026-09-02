import crypto from 'crypto';

export const PACE_OPTIONS = ['Poor', 'Probation', 'Coasting', 'Sterling'];

export function makeQuestionKey(label) {
  const stem = String(label || 'question').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 58) || 'question';
  return `${stem}-${crypto.randomBytes(3).toString('hex')}`;
}

export function parseCurrency(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  const raw = String(value ?? '').trim().toLowerCase().replace(/[₦#\s,]/g, '');
  const million = raw.match(/^(\d+(?:\.\d+)?)(m|million)$/);
  const thousand = raw.match(/^(\d+(?:\.\d+)?)(k|thousand)$/);
  const result = million ? Number(million[1]) * 1_000_000 : thousand ? Number(thousand[1]) * 1_000 : Number(raw);
  if (!Number.isFinite(result) || result < 0 || result > 1_000_000_000_000) return null;
  return Math.round(result * 100) / 100;
}

export function normaliseAnswer(question, value) {
  const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
  if (empty) return { value: null };
  const validation = question.validation || {};
  const withinNumericRange = (result) => {
    if (validation.min !== undefined && result < validation.min) return `${question.label} must be at least ${validation.min}.`;
    if (validation.max !== undefined && result > validation.max) return `${question.label} must be at most ${validation.max}.`;
    return null;
  };

  if (question.inputType === 'integer') {
    if (!/^\d+$/.test(String(value))) return { error: `${question.label} must be a whole number.` };
    const result = Number(value);
    if (!Number.isSafeInteger(result) || result > 1_000_000_000) return { error: `${question.label} is outside the allowed range.` };
    return withinNumericRange(result) ? { error: withinNumericRange(result) } : { value: result };
  }
  if (question.inputType === 'currency') {
    const result = parseCurrency(value);
    if (result === null) return { error: `${question.label} must be a valid Naira amount.` };
    return withinNumericRange(result) ? { error: withinNumericRange(result) } : { value: result };
  }
  if (question.inputType === 'date') {
    const result = String(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) return { error: `${question.label} must use a valid date.` };
    if (validation.minDate && result < validation.minDate) return { error: `${question.label} cannot be before ${validation.minDate}.` };
    if (validation.maxDate && result > validation.maxDate) return { error: `${question.label} cannot be after ${validation.maxDate}.` };
    return { value: result };
  }
  if (question.inputType === 'accountNumber') {
    const rawValues = Array.isArray(value) ? value : [value];
    const result = rawValues.map((item) => String(item).replace(/\s/g, ''));
    if (result.some((item) => !/^\d{10}$/.test(item))) return { error: 'Each account number must contain exactly 10 digits.' };
    if (new Set(result).size !== result.length) return { error: 'Each account number can be entered only once per report.' };
    return { value: result };
  }
  if (question.inputType === 'boolean') {
    if (value === true || value === 'Yes') return { value: true };
    if (value === false || value === 'No') return { value: false };
    return { error: `${question.label} must be Yes or No.` };
  }
  if (question.inputType === 'paceRating') {
    return PACE_OPTIONS.includes(value) ? { value } : { error: `${question.label} requires a valid pace rating.` };
  }
  if (question.inputType === 'select') {
    const allowed = question.options.map((option) => option.value);
    return allowed.includes(value) ? { value } : { error: `${question.label} requires a listed option.` };
  }
  const result = String(value).trim().replace(/\s+/g, ' ');
  const minLength = validation.minLength || 0;
  const maxLength = validation.maxLength || (question.inputType === 'textarea' ? 1000 : 180);
  if (result.length < minLength) return { error: `${question.label} must be at least ${minLength} characters.` };
  if (result.length > maxLength) return { error: `${question.label} is too long.` };
  if (validation.pattern) {
    let matches = false;
    try { matches = new RegExp(validation.pattern).test(result); } catch { return { error: `${question.label} has an invalid validation pattern.` }; }
    if (!matches) return { error: `${question.label} has an invalid format.` };
  }
  return { value: result };
}

export function exportValue(question, value) {
  if (value === null || value === undefined) return '';
  if (question.inputType === 'currency') return `₦${Number(value).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  if (question.inputType === 'boolean') return value ? 'Yes' : 'No';
  if (question.inputType === 'accountNumber' && Array.isArray(value)) return value.join(' | ');
  return value;
}
