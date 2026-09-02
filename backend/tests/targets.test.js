import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMonthlyProgress, monthKey } from '../src/utils/targets.js';

test('monthly progress aggregates a worker month and returns remaining balances', () => {
  const progress = buildMonthlyProgress([
    { answers: { accountsOpened: 12, amountMobilised: 2500000 } },
    { answers: { accountsOpened: 8, amountMobilised: 300000 } },
  ], '2026-09');
  assert.equal(progress.month, '2026-09');
  assert.equal(progress.reportCount, 2);
  assert.deepEqual(progress.accountsOpened, { remaining: 25, surplus: 0, achieved: 20, target: 45, reached: false });
  assert.deepEqual(progress.amountMobilised, { remaining: 5200000, surplus: 0, achieved: 2800000, target: 8000000, reached: false });
});

test('monthly progress marks exact completion and surplus without negative remaining values', () => {
  const progress = buildMonthlyProgress([{ answers: { accountsOpened: 50, amountMobilised: 8500000 } }], '2026-09');
  assert.deepEqual(progress.accountsOpened, { remaining: 0, surplus: 5, achieved: 50, target: 45, reached: true });
  assert.deepEqual(progress.amountMobilised, { remaining: 0, surplus: 500000, achieved: 8500000, target: 8000000, reached: true });
});

test('month keys remain stable for report-date filtering', () => {
  assert.equal(monthKey('2026-09-02'), '2026-09');
  assert.equal(monthKey('2026-12-31'), '2026-12');
});
