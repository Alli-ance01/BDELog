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
