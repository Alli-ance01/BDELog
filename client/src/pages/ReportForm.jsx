/* Gilded Ledger public form: decisive controls, ivory space, and a black editorial identity rail. */
import { ArrowRight, CalendarDays, Check, CircleHelp, LockKeyhole, Plus, Send, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import BrandMark from '../components/BrandMark';
import LedgerPicker from '../components/LedgerPicker';
import { api } from '../lib/api';
import { formatNaira, paceOptions, parseNaira } from '../lib/formUtils';

const initialForm = {
  reportDate: new Date().toISOString().slice(0, 10),
  branchId: '',
  teamMemberId: '',
  customAnswers: {},
};
const emptyConfiguration = { branches: [], teamMembers: [], categories: [], questions: [] };

function questionCategoryId(question) {
  return question?.categoryId?._id || question?.categoryId || null;
}

function LedgerSection({ number, title, description, children }) {
  return <section className="ledger-section"><header className="ledger-section__header"><span>{number}</span><div><h2>{title}</h2>{description && <p>{description}</p>}</div></header><div className="ledger-section__fields">{children}</div></section>;
}

function Field({ label, hint, children, className = '', asLabel = true }) {
  const Wrapper = asLabel ? 'label' : 'div';
  return <Wrapper className={`field ${className}`}><span className="field__label">{label}</span>{children}{hint && <span className="field__hint">{hint}</span>}</Wrapper>;
}

function MonthlyProgress({ progress, progressRef }) {
  if (!progress) return null;
  const metric = (key, label, formatter) => {
    const value = progress[key];
    const percentage = Math.min(100, Math.round((value.achieved / value.target) * 100));
    const surplus = value.surplus > 0;
    const displayLabel = surplus ? `${label} above target` : label;
    const displayValue = surplus ? `+${formatter(value.surplus)}` : formatter(value.remaining);
    return <article className={surplus ? 'monthly-progress__metric is-surplus' : value.reached ? 'monthly-progress__metric is-complete' : 'monthly-progress__metric'}><div className="monthly-progress__metric-heading"><span>{displayLabel}</span><strong>{displayValue}</strong></div><p>{surplus ? 'Monthly target exceeded' : value.reached ? 'Target reached' : `${formatter(value.remaining)} left this month`}</p><div className="monthly-progress__bar"><span style={{ width: `${percentage}%` }} /></div><small>{formatter(value.achieved)} of {formatter(value.target)} achieved</small></article>;
  };
  return <section ref={progressRef} id="monthly-progress" className="monthly-progress" aria-labelledby="monthly-progress-title" tabIndex="-1"><div className="monthly-progress__heading"><div><p className="eyebrow">MONTHLY PACE / {progress.month}</p><h3 id="monthly-progress-title">Your position this month</h3><p>Today’s approved report is now included. Your remaining balance updates after every daily submission.</p></div><div className="monthly-progress__stamp"><Sparkles size={15} /> Live ledger</div></div><div className="monthly-progress__metrics">{metric('accountsOpened', 'Accounts to open', (value) => `${value}`)}{metric('amountMobilised', 'Mobilisation to go', formatNaira)}</div></section>;
}

function SubmissionNotice({ progress, noticeRef, onView, onDismiss }) {
  if (!progress) return null;
  const accountText = progress.accountsOpened.surplus > 0 ? `+${progress.accountsOpened.surplus} accounts above target` : progress.accountsOpened.reached ? '45-account target reached' : `${progress.accountsOpened.remaining} accounts left`;
  const amountText = progress.amountMobilised.surplus > 0 ? `+${formatNaira(progress.amountMobilised.surplus)} above target` : progress.amountMobilised.reached ? '₦8,000,000 target reached' : `${formatNaira(progress.amountMobilised.remaining)} left`;
  return <aside ref={noticeRef} className="submission-notice" role="region" aria-live="assertive" aria-labelledby="submission-notice-title" tabIndex="-1"><div className="submission-notice__icon"><Check size={17} /></div><div className="submission-notice__copy"><p className="eyebrow">REPORT SAVED / MONTHLY PACE UPDATED</p><strong id="submission-notice-title">Your progress is ready to view</strong><span>{accountText} · {amountText}</span></div><button className="submission-notice__view" type="button" onClick={onView}>View progress <ArrowRight size={14} /></button><button className="submission-notice__close" type="button" aria-label="Dismiss monthly progress announcement" onClick={onDismiss}><X size={16} /></button></aside>;
}

export default function ReportForm() {
  const [form, setForm] = useState(initialForm);
  const [configuration, setConfiguration] = useState(emptyConfiguration);
  const [loadingConfiguration, setLoadingConfiguration] = useState(true);
  const [configurationError, setConfigurationError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [monthlyProgress, setMonthlyProgress] = useState(null);
  const [submissionNotice, setSubmissionNotice] = useState(null);
  const monthlyProgressRef = useRef(null);
  const submissionNoticeRef = useRef(null);
  const [accountNumberEntry, setAccountNumberEntry] = useState({});
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [registrationSubmitting, setRegistrationSubmitting] = useState(false);
  const [registration, setRegistration] = useState({ fullName: '', branchName: '', daoCode: '', role: 'BDE' });

  useEffect(() => {
    if (!submissionNotice) return;
    const frame = window.requestAnimationFrame(() => {
      submissionNoticeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      submissionNoticeRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [submissionNotice]);

  useEffect(() => {
    api('/public/form')
      .then((data) => setConfiguration({
        branches: Array.isArray(data?.branches) ? data.branches : [],
        teamMembers: Array.isArray(data?.teamMembers) ? data.teamMembers : [],
        categories: Array.isArray(data?.categories) ? data.categories : [],
        questions: Array.isArray(data?.questions) ? data.questions : [],
      }))
      .catch(() => { setConfiguration(emptyConfiguration); setConfigurationError(true); toast.message('The live form configuration will appear once the API is connected.'); })
      .finally(() => setLoadingConfiguration(false));
  }, []);

  const branches = configuration.branches;
  const teamMembers = configuration.teamMembers;
  const categories = configuration.categories;
  const questions = configuration.questions;
  const membersForBranch = useMemo(() => form.branchId ? teamMembers.filter((member) => String(member.branchId) === String(form.branchId)) : [], [teamMembers, form.branchId]);
  const groupedSections = useMemo(() => {
    const sections = categories.map((category) => ({ ...category, questions: questions.filter((question) => String(questionCategoryId(question) || '') === String(category._id)) }));
    const uncategorised = questions.filter((question) => !questionCategoryId(question));
    if (uncategorised.length) sections.push({ _id: 'uncategorised', name: 'Additional fields', description: 'Questions awaiting a category assignment.', questions: uncategorised });
    if (!sections.length && questions.length) sections.push({ _id: 'uncategorised', name: 'Reporting questions', description: 'Configured questions for today’s report.', questions });
    return sections.filter((section) => section.questions.length > 0);
  }, [categories, questions]);

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value, ...(name === 'branchId' ? { teamMemberId: '' } : {}) }));
  }

  function answerFor(key) {
    return Object.prototype.hasOwnProperty.call(form, key) ? form[key] : form.customAnswers[key];
  }

  function updateQuestion(key, value) {
    setForm((current) => ({ ...current, customAnswers: { ...current.customAnswers, [key]: value } }));
  }

  function matchesVisibility(question) {
    if (!question.showWhen) return true;
    const answer = answerFor(question.showWhen.questionKey);
    return answer === question.showWhen.equals || (question.showWhen.equals === true && answer === 'Yes') || (question.showWhen.equals === false && answer === 'No');
  }

  function addAccountNumbers(questionKey) {
    const rawValue = accountNumberEntry[questionKey] || '';
    const currentValue = Array.isArray(answerFor(questionKey)) ? answerFor(questionKey) : [];
    const candidates = String(rawValue).split(/[\s,;]+/).map((value) => value.replace(/\D/g, '')).filter(Boolean);
    if (!candidates.length) return;
    if (candidates.some((value) => value.length !== 10)) { toast.error('Each account number must contain exactly 10 digits.'); return; }
    if (candidates.some((value) => currentValue.includes(value))) { toast.error('One of those account numbers is already in this report.'); return; }
    if (new Set(candidates).size !== candidates.length) { toast.error('The pasted list contains a duplicate account number.'); return; }
    updateQuestion(questionKey, [...currentValue, ...candidates]);
    setAccountNumberEntry((current) => ({ ...current, [questionKey]: '' }));
  }

  function removeAccountNumber(questionKey, accountNumber) {
    updateQuestion(questionKey, (Array.isArray(answerFor(questionKey)) ? answerFor(questionKey) : []).filter((value) => value !== accountNumber));
  }

  async function submitDirectoryRequest(event) {
    event.preventDefault();
    setRegistrationSubmitting(true);
    try {
      await api('/public/directory-requests', { method: 'POST', body: JSON.stringify(registration) });
      toast.success('Registration received. Your manager will update the directory.');
      setRegistration({ fullName: '', branchName: '', daoCode: '', role: 'BDE' });
      setRegistrationOpen(false);
    } catch (error) { toast.error(error.message); } finally { setRegistrationSubmitting(false); }
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await api('/public/reports', { method: 'POST', body: JSON.stringify(form) });
      setMonthlyProgress(result.monthlyProgress || null);
      setSubmissionNotice(result.monthlyProgress || null);
      toast.success('Report submitted and added to the ledger.');
      setForm({ ...initialForm, reportDate: new Date().toISOString().slice(0, 10) });
      setAccountNumberEntry({});
    } catch (error) { toast.error(error.message); } finally { setSubmitting(false); }
  }

  function renderQuestion(question) {
    if (!matchesVisibility(question)) return null;
    const value = answerFor(question.key);
    const required = question.required;
    const validation = question.validation || {};
    const hint = question.helpText || (question.inputType === 'integer' ? 'Whole number only' : question.inputType === 'currency' ? 'Enter an amount in Naira' : '');
    if (question.inputType === 'boolean') return <Field key={question.key} label={question.label} hint={hint} asLabel={false}><div className="segmented-control">{['Yes', 'No'].map((option) => <button type="button" key={option} className={value === option || value === (option === 'Yes') ? 'is-selected' : ''} onClick={() => updateQuestion(question.key, option)}>{option}</button>)}</div></Field>;
    if (question.inputType === 'paceRating') return <Field key={question.key} label={question.label} hint={hint} className="field--full" asLabel={false}><div className="pace-control">{paceOptions.map((pace) => <button type="button" className={value === pace ? `pace-control__option is-${pace.toLowerCase()}` : 'pace-control__option'} key={pace} onClick={() => updateQuestion(question.key, pace)}><span />{pace}</button>)}</div></Field>;
    if (question.inputType === 'select') return <Field key={question.key} label={question.label} hint={hint} asLabel={false}><LedgerPicker ariaLabel={question.label} emptyLabel="No options are configured." onChange={(selectedValue) => updateQuestion(question.key, selectedValue)} options={(question.options || []).map((option) => typeof option === 'string' ? { value: option, label: option } : ({ value: option.value, label: option.label }))} placeholder="Choose an option" value={value || ''} /></Field>;
    if (question.inputType === 'textarea') return <Field key={question.key} label={question.label} hint={hint} className="field--full"><textarea rows="3" minLength={validation.minLength} maxLength={validation.maxLength || 1000} value={value || ''} onChange={(event) => updateQuestion(question.key, event.target.value)} required={required} /></Field>;
    if (question.inputType === 'currency') return <Field key={question.key} label={question.label} hint={value && formatNaira(value) || hint}><input type="text" inputMode="decimal" placeholder="e.g. ₦250,000 or 1m" value={value || ''} onChange={(event) => updateQuestion(question.key, event.target.value)} required={required} aria-invalid={Boolean(value && parseNaira(value) === null)} /></Field>;
    if (question.inputType === 'integer') return <Field key={question.key} label={question.label} hint={hint}><input type="number" min={validation.min ?? 0} max={validation.max} step="1" inputMode="numeric" value={value ?? ''} onChange={(event) => updateQuestion(question.key, event.target.value)} required={required} /></Field>;
    if (question.inputType === 'date') return <Field key={question.key} label={question.label} hint={hint}><input type="date" min={validation.minDate} max={validation.maxDate} value={value || ''} onChange={(event) => updateQuestion(question.key, event.target.value)} required={required} /></Field>;
    if (question.inputType === 'accountNumber') {
      const numbers = Array.isArray(value) ? value : [];
      return <Field key={question.key} label={question.label} hint={hint || 'Exactly 10 digits; leading zeros are preserved'} className="field--full" asLabel={false}><div className="account-ledger-input"><div className="account-ledger-input__entry"><input type="text" inputMode="numeric" pattern="[0-9]*" maxLength="512" placeholder="Enter 10-digit account number" value={accountNumberEntry[question.key] || ''} onChange={(event) => setAccountNumberEntry((current) => ({ ...current, [question.key]: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addAccountNumbers(question.key); } }} /><button className="secondary-button" type="button" onClick={() => addAccountNumbers(question.key)} disabled={!(accountNumberEntry[question.key] || '').trim()}><Plus size={15} /> Add</button></div>{numbers.length > 0 && <div className="account-ledger-tags" aria-label={`${question.label} entries`}>{numbers.map((accountNumber) => <span key={accountNumber}>{accountNumber}<button type="button" aria-label={`Remove account number ${accountNumber}`} onClick={() => removeAccountNumber(question.key, accountNumber)}><X size={13} /></button></span>)}</div>}</div></Field>;
    }
    return <Field key={question.key} label={question.label} hint={hint}><input type="text" minLength={validation.minLength} maxLength={validation.maxLength || 180} pattern={validation.pattern || undefined} value={value || ''} onChange={(event) => updateQuestion(question.key, event.target.value)} required={required} /></Field>;
  }

  return <main className="report-page">
    <header className="public-topbar"><BrandMark inverse /><div className="public-topbar__meta"><span>Regional Sales / Daily desk</span><Link href="/admin/login" className="admin-entry"><LockKeyhole size={14} /> Admin</Link></div></header>
    <div className="report-layout">
      <aside className="report-rail"><div className="report-rail__hero" /><div className="report-rail__content"><p className="eyebrow eyebrow--gold">DAILY FIELD INTELLIGENCE</p><h1>Close today’s report with numbers that reconcile.</h1><p className="report-rail__copy">Every entry becomes a cleaner regional view. Submit carefully—your manager sees the ledger in real time.</p><ol className="progress-list" aria-label="Form progress"><li className="is-active"><span>01</span> Identity</li>{groupedSections.slice(0, 4).map((section, index) => <li key={section._id}><span>{String(index + 2).padStart(2, '0')}</span> {section.name}</li>)}</ol></div><div className="report-rail__footer">BDELog / Alternative Bank regional sales</div></aside>
      <section className="report-sheet"><SubmissionNotice progress={submissionNotice} noticeRef={submissionNoticeRef} onView={() => { setSubmissionNotice(null); monthlyProgressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); monthlyProgressRef.current?.focus({ preventScroll: true }); }} onDismiss={() => setSubmissionNotice(null)} /><div className="report-sheet__intro"><div><p className="eyebrow">TODAY’S ENTRY</p><h2>Daily report</h2></div><div className="report-sheet__date"><CalendarDays size={16} /><span>{new Intl.DateTimeFormat('en-NG', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span></div></div>
        {loadingConfiguration && <div className="configuration-note"><Sparkles size={16} /> Preparing the live reporting template.</div>}
        {!loadingConfiguration && configurationError && <div className="configuration-note configuration-note--amber"><CircleHelp size={16} /> The reporting directory is temporarily unavailable. Refresh after the API is connected.</div>}
        {!loadingConfiguration && !configurationError && (!branches.length || !teamMembers.length) && <div className="configuration-note configuration-note--amber"><CircleHelp size={16} /> Your administrator will add the official branch and BDE list in Form studio before this link is shared.</div>}
        {!loadingConfiguration && !configurationError && !groupedSections.length && <div className="configuration-note configuration-note--amber"><CircleHelp size={16} /> Your administrator has not added any report questions yet.</div>}
        <MonthlyProgress progress={monthlyProgress} progressRef={monthlyProgressRef} />
        <form onSubmit={submit} noValidate>
          <LedgerSection number="01" title="Identity" description="Tell the ledger who is submitting this entry."><Field label="Report date"><input type="date" value={form.reportDate} onChange={(event) => update('reportDate', event.target.value)} required /></Field><Field label="Branch" asLabel={false}><LedgerPicker ariaLabel="Select branch" disabled={!branches.length} emptyLabel="No branches have been added yet." onChange={(value) => update('branchId', value)} options={branches.map((branch) => ({ value: branch._id, label: branch.name }))} placeholder="Choose branch" value={form.branchId} /></Field><Field label="BDE / ESO name" asLabel={false}><LedgerPicker ariaLabel="Select BDE or ESO" disabled={!form.branchId || !membersForBranch.length} emptyLabel={form.branchId ? 'No BDE or ESO is listed for this branch yet.' : 'Choose a branch first.'} onChange={(value) => update('teamMemberId', value)} options={membersForBranch.map((member) => ({ value: member._id, label: member.fullName }))} placeholder={form.branchId ? 'Choose BDE / ESO' : 'Choose branch first'} value={form.teamMemberId} /></Field><div className="identity-request field--full"><div><strong>Can’t find your name?</strong><span>Send your name, branch, DAO code, and role for your manager to add.</span></div><button className="gold-link" type="button" onClick={() => setRegistrationOpen(true)}>Request access <ArrowRight size={14} /></button></div></LedgerSection>
          {groupedSections.map((section, index) => <LedgerSection key={section._id} number={String(index + 2).padStart(2, '0')} title={section.name} description={section.description}>{section.questions.map(renderQuestion)}</LedgerSection>)}
          <div className="report-submit"><p><Check size={16} /> Amounts are standardised before export.</p><button className="primary-button" disabled={submitting || !branches.length || !teamMembers.length} type="submit">{submitting ? 'Submitting…' : 'Submit today’s report'} <Send size={17} /></button></div>
        </form>
        <div className="report-sheet__help"><span>Need support?</span> Contact your regional manager before submitting figures you cannot reconcile. <ArrowRight size={14} /></div>
      </section>
    </div>
    {registrationOpen && <div className="registration-modal" role="dialog" aria-modal="true" aria-labelledby="registration-title"><div className="registration-modal__backdrop" onClick={() => setRegistrationOpen(false)} /><form className="registration-modal__sheet" onSubmit={submitDirectoryRequest}><button className="registration-modal__close" aria-label="Close registration" type="button" onClick={() => setRegistrationOpen(false)}><X size={18} /></button><p className="eyebrow">DIRECTORY REGISTRATION</p><h2 id="registration-title">Add your name to the ledger.</h2><p>Send your working details. This will not submit a report or add you automatically; your manager will review and update the directory.</p><Field label="Full name"><input value={registration.fullName} onChange={(event) => setRegistration({ ...registration, fullName: event.target.value })} required /></Field><Field label="Branch"><input value={registration.branchName} onChange={(event) => setRegistration({ ...registration, branchName: event.target.value })} required /></Field><Field label="DAO code"><input value={registration.daoCode} onChange={(event) => setRegistration({ ...registration, daoCode: event.target.value.toUpperCase() })} required /></Field><Field label="Role" asLabel={false}><div className="segmented-control">{['BDE', 'ESO'].map((role) => <button type="button" key={role} className={registration.role === role ? 'is-selected' : ''} onClick={() => setRegistration({ ...registration, role })}>{role}</button>)}</div></Field><button className="primary-button" type="submit" disabled={registrationSubmitting}>{registrationSubmitting ? 'Sending…' : 'Send registration'} <Send size={16} /></button></form></div>}
  </main>;
}
