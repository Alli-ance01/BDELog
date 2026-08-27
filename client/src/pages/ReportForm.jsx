// Gilded Ledger design reminder: the public report is a calm ledger sheet with an offset identity rail, not a generic centered form card.
import { ArrowRight, CalendarDays, Check, ChevronDown, CircleHelp, LockKeyhole, Plus, Send, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import BrandMark from '../components/BrandMark';
import { api } from '../lib/api';
import { formatNaira, paceOptions, parseNaira } from '../lib/formUtils';

const initialForm = {
  reportDate: new Date().toISOString().slice(0, 10),
  branchId: '',
  teamMemberId: '',
  accountsOpened: '',
  alternateChannels: '',
  cumulativeOpeningBalance: '',
  amountMobilised: '',
  accountNumber: [],
  funded: '',
  carded: '',
  plannedClosures: '',
  hasCluster: '',
  needsHelp: '',
  helpDetails: '',
  paceRating: '',
  customAnswers: {},
};

const baselineQuestionKeys = new Set(['accountsOpened', 'alternateChannels', 'cumulativeOpeningBalance', 'amountMobilised', 'accountNumber', 'funded', 'carded', 'plannedClosures', 'hasCluster', 'needsHelp', 'helpDetails', 'paceRating']);
const emptyConfiguration = { branches: [], teamMembers: [], questions: [] };

function LedgerSection({ number, title, children }) {
  return (
    <section className="ledger-section">
      <header className="ledger-section__header">
        <span>{number}</span>
        <h2>{title}</h2>
      </header>
      <div className="ledger-section__fields">{children}</div>
    </section>
  );
}

function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

export default function ReportForm() {
  const [form, setForm] = useState(initialForm);
  const [configuration, setConfiguration] = useState(emptyConfiguration);
  const [loadingConfiguration, setLoadingConfiguration] = useState(true);
  const [configurationError, setConfigurationError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accountNumberEntry, setAccountNumberEntry] = useState('');

  useEffect(() => {
    api('/public/form')
      .then((data) => {
        setConfiguration({
          branches: Array.isArray(data?.branches) ? data.branches : [],
          teamMembers: Array.isArray(data?.teamMembers) ? data.teamMembers : [],
          questions: Array.isArray(data?.questions) ? data.questions : [],
        });
      })
      .catch(() => { setConfiguration(emptyConfiguration); setConfigurationError(true); toast.message('The live form configuration will appear once the API is connected.'); })
      .finally(() => setLoadingConfiguration(false));
  }, []);

  const branches = Array.isArray(configuration?.branches) ? configuration.branches : [];
  const teamMembers = Array.isArray(configuration?.teamMembers) ? configuration.teamMembers : [];
  const questions = Array.isArray(configuration?.questions) ? configuration.questions : [];

  const membersForBranch = useMemo(
    () => teamMembers.filter((member) => !form.branchId || member.branchId === form.branchId),
    [teamMembers, form.branchId],
  );

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value, ...(name === 'branchId' ? { teamMemberId: '' } : {}) }));
  }

  function updateCustom(key, value) {
    setForm((current) => ({ ...current, customAnswers: { ...current.customAnswers, [key]: value } }));
  }

  function addAccountNumbers(rawValue = accountNumberEntry) {
    const candidates = String(rawValue).split(/[\s,;]+/).map((value) => value.replace(/\D/g, '')).filter(Boolean);
    if (!candidates.length) return;
    const invalid = candidates.find((value) => value.length !== 10);
    if (invalid) { toast.error('Each account number must contain exactly 10 digits.'); return; }
    const duplicate = candidates.find((value) => form.accountNumber.includes(value));
    if (duplicate) { toast.error(`${duplicate} is already in this report.`); setAccountNumberEntry(''); return; }
    const uniqueValues = [...new Set(candidates)];
    if (uniqueValues.length !== candidates.length) { toast.error('The pasted list contains a duplicate account number.'); return; }
    setForm((current) => ({ ...current, accountNumber: [...current.accountNumber, ...uniqueValues] }));
    setAccountNumberEntry('');
  }

  function removeAccountNumber(accountNumber) {
    setForm((current) => ({ ...current, accountNumber: current.accountNumber.filter((value) => value !== accountNumber) }));
  }

  async function submit(event) {
    event.preventDefault();
    const accountsOpened = Number(form.accountsOpened);
    if (Number.isInteger(accountsOpened) && accountsOpened !== form.accountNumber.length) {
      toast.error(`You recorded ${accountsOpened} account${accountsOpened === 1 ? '' : 's'} opened. Add the same number of account-number tags.`);
      return;
    }
    setSubmitting(true);
    try {
      await api('/public/reports', { method: 'POST', body: JSON.stringify(form) });
      toast.success('Report submitted and added to the ledger.');
      setForm({ ...initialForm, reportDate: new Date().toISOString().slice(0, 10) });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  const moneyPreview = (value) => value && formatNaira(value);
  const additionalQuestions = questions.filter((question) => !baselineQuestionKeys.has(question.key));
  const visibleAdditionalQuestions = additionalQuestions.filter((question) => {
    if (!question.showWhen) return true;
    const answer = form.customAnswers[question.showWhen.questionKey] ?? form[question.showWhen.questionKey];
    return answer === question.showWhen.equals || (question.showWhen.equals === true && answer === 'Yes');
  });

  return (
    <main className="report-page">
      <header className="public-topbar">
        <BrandMark inverse />
        <div className="public-topbar__meta">
          <span>Regional Sales / Daily desk</span>
          <Link href="/admin/login" className="admin-entry"><LockKeyhole size={14} /> Admin</Link>
        </div>
      </header>

      <div className="report-layout">
        <aside className="report-rail">
          <div className="report-rail__hero" />
          <div className="report-rail__content">
            <p className="eyebrow eyebrow--gold">DAILY FIELD INTELLIGENCE</p>
            <h1>Close today’s report with numbers that reconcile.</h1>
            <p className="report-rail__copy">Every entry becomes a cleaner regional view. Submit carefully—your manager sees the ledger in real time.</p>
            <ol className="progress-list" aria-label="Form progress">
              <li className="is-active"><span>01</span> Identity</li>
              <li><span>02</span> Daily performance</li>
              <li><span>03</span> Pipeline and support</li>
            </ol>
          </div>
          <div className="report-rail__footer">BDELog / Alternative Bank regional sales</div>
        </aside>

        <section className="report-sheet">
          <div className="report-sheet__intro">
            <div>
              <p className="eyebrow">TODAY’S ENTRY</p>
              <h2>Daily report</h2>
            </div>
            <div className="report-sheet__date"><CalendarDays size={16} /><span>{new Intl.DateTimeFormat('en-NG', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span></div>
          </div>

          {loadingConfiguration && <div className="configuration-note"><Sparkles size={16} /> Preparing the live reporting template.</div>}
          {!loadingConfiguration && configurationError && (
            <div className="configuration-note configuration-note--amber"><CircleHelp size={16} /> The reporting directory is temporarily unavailable. Refresh after the API is connected.</div>
          )}
          {!loadingConfiguration && !configurationError && (!branches.length || !teamMembers.length) && (
            <div className="configuration-note configuration-note--amber"><CircleHelp size={16} /> Your administrator will add the official branch and BDE list in Form studio before this link is shared.</div>
          )}

          <form onSubmit={submit} noValidate>
            <LedgerSection number="01" title="Identity">
              <Field label="Report date">
                <input type="date" value={form.reportDate} onChange={(event) => update('reportDate', event.target.value)} required />
              </Field>
              <Field label="Branch">
                <div className="select-wrap">
                  <select value={form.branchId} onChange={(event) => update('branchId', event.target.value)} required disabled={!branches.length}>
                    <option value="">Select branch</option>
                    {branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}
                  </select>
                  <ChevronDown size={17} />
                </div>
              </Field>
              <Field label="BDE / DSO name">
                <div className="select-wrap">
                  <select value={form.teamMemberId} onChange={(event) => update('teamMemberId', event.target.value)} required disabled={!membersForBranch.length}>
                    <option value="">Select team member</option>
                    {membersForBranch.map((member) => <option key={member._id} value={member._id}>{member.fullName}</option>)}
                  </select>
                  <ChevronDown size={17} />
                </div>
              </Field>
            </LedgerSection>

            <LedgerSection number="02" title="Daily performance">
              <Field label="Accounts opened today" hint="Whole number only">
                <input type="number" min="0" step="1" inputMode="numeric" value={form.accountsOpened} onChange={(event) => update('accountsOpened', event.target.value)} required />
              </Field>
              <Field label="Alternate channels issued" hint="Whole number only">
                <input type="number" min="0" step="1" inputMode="numeric" value={form.alternateChannels} onChange={(event) => update('alternateChannels', event.target.value)} required />
              </Field>
              <Field label="Cumulative opening balance" hint={moneyPreview(form.cumulativeOpeningBalance) || 'Enter an amount in Naira'}>
                <input type="text" inputMode="decimal" placeholder="e.g. ₦1,000,000 or 1m" value={form.cumulativeOpeningBalance} onChange={(event) => update('cumulativeOpeningBalance', event.target.value)} required aria-invalid={Boolean(form.cumulativeOpeningBalance && parseNaira(form.cumulativeOpeningBalance) === null)} />
              </Field>
              <Field label="Amount mobilised today" hint={moneyPreview(form.amountMobilised) || 'Enter an amount in Naira'}>
                <input type="text" inputMode="decimal" placeholder="e.g. ₦250,000" value={form.amountMobilised} onChange={(event) => update('amountMobilised', event.target.value)} required aria-invalid={Boolean(form.amountMobilised && parseNaira(form.amountMobilised) === null)} />
              </Field>
              <Field label="Account numbers opened today" hint="Enter one 10-digit number at a time, then press Enter or Add. You may also paste a comma- or line-separated list. Leading zeros are preserved." className="field--full">
                <div className="account-ledger-input">
                  <div className="account-ledger-input__entry">
                    <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength="512" placeholder="Enter 10-digit account number" value={accountNumberEntry} onChange={(event) => setAccountNumberEntry(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addAccountNumbers(); } }} />
                    <button className="secondary-button" type="button" onClick={() => addAccountNumbers()} disabled={!accountNumberEntry.trim()}><Plus size={15} /> Add</button>
                  </div>
                  {form.accountNumber.length > 0 && <div className="account-ledger-tags" aria-label="Account numbers entered for today">{form.accountNumber.map((accountNumber) => <span key={accountNumber}>{accountNumber}<button type="button" aria-label={`Remove account number ${accountNumber}`} onClick={() => removeAccountNumber(accountNumber)}><X size={13} /></button></span>)}</div>}
                </div>
              </Field>
            </LedgerSection>

            <LedgerSection number="03" title="Pipeline and support">
              <Field label="How many funded?" hint="Whole number only">
                <input type="number" min="0" step="1" inputMode="numeric" value={form.funded} onChange={(event) => update('funded', event.target.value)} required />
              </Field>
              <Field label="How many carded?" hint="Whole number only">
                <input type="number" min="0" step="1" inputMode="numeric" value={form.carded} onChange={(event) => update('carded', event.target.value)} required />
              </Field>
              <Field label="Intended closures this week" hint="Whole number only">
                <input type="number" min="0" step="1" inputMode="numeric" value={form.plannedClosures} onChange={(event) => update('plannedClosures', event.target.value)} required />
              </Field>
              <Field label="Cluster to close this week?">
                <div className="segmented-control">
                  {['Yes', 'No'].map((option) => <button type="button" key={option} className={form.hasCluster === option ? 'is-selected' : ''} onClick={() => update('hasCluster', option)}>{option}</button>)}
                </div>
              </Field>
              <Field label="Do you need help?">
                <div className="segmented-control">
                  {['Yes', 'No'].map((option) => <button type="button" key={option} className={form.needsHelp === option ? 'is-selected' : ''} onClick={() => update('needsHelp', option)}>{option}</button>)}
                </div>
              </Field>
              {form.needsHelp === 'Yes' && <Field label="Where do you need help?" className="field--full"><textarea rows="3" maxLength="500" placeholder="Give your manager the short, actionable context." value={form.helpDetails} onChange={(event) => update('helpDetails', event.target.value)} required /></Field>}
              <Field label="Current pace rating" className="field--full">
                <div className="pace-control">
                  {paceOptions.map((pace) => <button type="button" className={form.paceRating === pace ? `pace-control__option is-${pace.toLowerCase()}` : 'pace-control__option'} key={pace} onClick={() => update('paceRating', pace)}><span />{pace}</button>)}
                </div>
              </Field>
            </LedgerSection>

            {visibleAdditionalQuestions.length > 0 && <LedgerSection number="04" title="Additional fields">
              {visibleAdditionalQuestions.map((question) => {
                const value = form.customAnswers[question.key] || '';
                const required = question.required;
                if (question.inputType === 'boolean') return <Field key={question.key} label={question.label} hint={question.helpText}><div className="segmented-control">{['Yes', 'No'].map((option) => <button type="button" key={option} className={value === option ? 'is-selected' : ''} onClick={() => updateCustom(question.key, option)}>{option}</button>)}</div></Field>;
                if (question.inputType === 'paceRating') return <Field key={question.key} label={question.label} hint={question.helpText} className="field--full"><div className="pace-control">{paceOptions.map((pace) => <button type="button" className={value === pace ? `pace-control__option is-${pace.toLowerCase()}` : 'pace-control__option'} key={pace} onClick={() => updateCustom(question.key, pace)}><span />{pace}</button>)}</div></Field>;
                if (question.inputType === 'select') return <Field key={question.key} label={question.label} hint={question.helpText}><div className="select-wrap"><select value={value} onChange={(event) => updateCustom(question.key, event.target.value)} required={required}><option value="">Select an option</option>{question.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={17} /></div></Field>;
                if (question.inputType === 'textarea') return <Field key={question.key} label={question.label} hint={question.helpText} className="field--full"><textarea rows="3" maxLength={question.validation?.maxLength || 1000} value={value} onChange={(event) => updateCustom(question.key, event.target.value)} required={required} /></Field>;
                if (question.inputType === 'currency') return <Field key={question.key} label={question.label} hint={moneyPreview(value) || question.helpText || 'Enter a Naira amount'}><input type="text" inputMode="decimal" placeholder="e.g. ₦250,000 or 1m" value={value} onChange={(event) => updateCustom(question.key, event.target.value)} required={required} /></Field>;
                if (question.inputType === 'integer') return <Field key={question.key} label={question.label} hint={question.helpText || 'Whole number only'}><input type="number" min="0" step="1" inputMode="numeric" value={value} onChange={(event) => updateCustom(question.key, event.target.value)} required={required} /></Field>;
                if (question.inputType === 'date') return <Field key={question.key} label={question.label} hint={question.helpText}><input type="date" value={value} onChange={(event) => updateCustom(question.key, event.target.value)} required={required} /></Field>;
                if (question.inputType === 'accountNumber') return <Field key={question.key} label={question.label} hint={question.helpText || 'Exactly 10 digits; leading zeros are preserved'}><input type="text" inputMode="numeric" pattern="[0-9]*" maxLength="10" value={value} onChange={(event) => updateCustom(question.key, event.target.value.replace(/\D/g, ''))} required={required} /></Field>;
                return <Field key={question.key} label={question.label} hint={question.helpText}><input type="text" maxLength={question.validation?.maxLength || 180} value={value} onChange={(event) => updateCustom(question.key, event.target.value)} required={required} /></Field>;
              })}
            </LedgerSection>}

            <div className="report-submit">
              <p><Check size={16} /> Amounts are standardised before export.</p>
              <button className="primary-button" disabled={submitting || !branches.length || !teamMembers.length} type="submit">{submitting ? 'Submitting…' : 'Submit today’s report'} <Send size={17} /></button>
            </div>
          </form>

          <div className="report-sheet__help"><span>Need support?</span> Contact your regional manager before submitting figures you cannot reconcile. <ArrowRight size={14} /></div>
        </section>
      </div>
    </main>
  );
}
