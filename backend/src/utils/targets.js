export const MONTHLY_TARGETS = Object.freeze({
  accountsOpened: 45,
  amountMobilised: 8_000_000,
});

export function monthKey(value) {
  const date = String(value || '');
  return /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : new Date(value).toISOString().slice(0, 7);
}

export function remainingTarget(target, achieved) {
  const remaining = target - achieved;
  return { remaining: Math.max(remaining, 0), surplus: Math.max(-remaining, 0), achieved, target, reached: achieved >= target };
}

export function buildMonthlyProgress(reports = [], month) {
  const totals = reports.reduce((result, report) => {
    const answers = report.answers instanceof Map ? Object.fromEntries(report.answers.entries()) : report.answers || {};
    result.accountsOpened += Number(answers.accountsOpened || 0);
    result.amountMobilised += Number(answers.amountMobilised || 0);
    return result;
  }, { accountsOpened: 0, amountMobilised: 0 });
  return {
    month,
    accountsOpened: remainingTarget(MONTHLY_TARGETS.accountsOpened, totals.accountsOpened),
    amountMobilised: remainingTarget(MONTHLY_TARGETS.amountMobilised, totals.amountMobilised),
    reportCount: reports.length,
  };
}
