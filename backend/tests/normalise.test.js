import assert from 'node:assert/strict';
import test from 'node:test';
import { normaliseAnswer, parseCurrency } from '../src/utils/normalise.js';

test('currency values resolve to one canonical numeric amount', () => {
  assert.equal(parseCurrency('#1,000,000'), 1000000);
  assert.equal(parseCurrency('₦1m'), 1000000);
  assert.equal(parseCurrency('1 million'), 1000000);
  assert.equal(parseCurrency('1000000'), 1000000);
});

test('counts reject words and negative values', () => {
  const question = { label: 'Accounts opened', inputType: 'integer' };
  assert.deepEqual(normaliseAnswer(question, '14'), { value: 14 });
  assert.ok(normaliseAnswer(question, 'fourteen').error);
  assert.ok(normaliseAnswer(question, '-14').error);
});

test('account numbers keep leading zeros as unique, exactly ten-digit canonical arrays', () => {
  const question = { label: 'Account numbers', inputType: 'accountNumber' };
  assert.deepEqual(normaliseAnswer(question, ['0012345678', '9988776655']), { value: ['0012345678', '9988776655'] });
  assert.ok(normaliseAnswer(question, ['0012345678', '0012345678']).error);
  assert.ok(normaliseAnswer(question, ['123456789']).error);
  assert.ok(normaliseAnswer(question, ['12345678901']).error);
});

test('binary and pace controls accept only their canonical values', () => {
  assert.deepEqual(normaliseAnswer({ label: 'Need help', inputType: 'boolean' }, 'Yes'), { value: true });
  assert.deepEqual(normaliseAnswer({ label: 'Pace', inputType: 'paceRating' }, 'Sterling'), { value: 'Sterling' });
  assert.ok(normaliseAnswer({ label: 'Pace', inputType: 'paceRating' }, 'Excellent').error);
});

test('configured numeric, text, date, and pattern rules are enforced', () => {
  assert.deepEqual(normaliseAnswer({ label: 'Funded', inputType: 'integer', validation: { min: 2, max: 8 } }, '4'), { value: 4 });
  assert.ok(normaliseAnswer({ label: 'Funded', inputType: 'integer', validation: { min: 2 } }, '1').error);
  assert.ok(normaliseAnswer({ label: 'Narrative', inputType: 'textarea', validation: { minLength: 5, maxLength: 8 } }, 'short').value);
  assert.ok(normaliseAnswer({ label: 'Narrative', inputType: 'textarea', validation: { minLength: 5 } }, 'tiny').error);
  assert.deepEqual(normaliseAnswer({ label: 'Visit date', inputType: 'date', validation: { minDate: '2026-09-01', maxDate: '2026-09-30' } }, '2026-09-12'), { value: '2026-09-12' });
  assert.ok(normaliseAnswer({ label: 'Visit date', inputType: 'date', validation: { minDate: '2026-09-01' } }, '2026-08-31').error);
  assert.deepEqual(normaliseAnswer({ label: 'Reference', inputType: 'text', validation: { pattern: '^[A-Z]{3}-\\d{4}$' } }, 'ABC-2026'), { value: 'ABC-2026' });
  assert.ok(normaliseAnswer({ label: 'Reference', inputType: 'text', validation: { pattern: '^[A-Z]{3}-\\d{4}$' } }, 'abc-2026').error);
});


test('template sequence follows category order before question order', async () => {
  const { orderTemplate } = await import('../src/utils/template.js');
  const ordered = orderTemplate(
    [{ _id: 'category-b', order: 1 }, { _id: 'category-a', order: 0 }],
    [
      { key: 'b-2', categoryId: 'category-b', order: 1 },
      { key: 'a-2', categoryId: 'category-a', order: 1 },
      { key: 'a-1', categoryId: 'category-a', order: 0 },
      { key: 'legacy', categoryId: null, order: 0 },
    ],
  );
  assert.deepEqual(ordered.map((question) => question.key), ['a-1', 'a-2', 'b-2', 'legacy']);
});
