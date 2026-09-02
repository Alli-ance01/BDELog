import { Archive, ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, GripVertical, Info, LoaderCircle, Pencil, Plus, RotateCcw, SlidersHorizontal, Trash2, UserPlus, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import AdminSidebar from '../components/AdminSidebar';
import ConfirmActionModal from '../components/ConfirmActionModal';
import LedgerPicker from '../components/LedgerPicker';
import { api } from '../lib/api';

const typeLabels = {
  text: 'Short text',
  textarea: 'Long text',
  integer: 'Whole number',
  currency: 'Currency',
  date: 'Date',
  select: 'Select list',
  boolean: 'Yes / No',
  paceRating: 'Pace rating',
  accountNumber: 'Account number',
};
const inputTypeOptions = Object.entries(typeLabels).map(([value, label]) => ({ value, label }));
const roleOptions = [{ value: 'BDE', label: 'BDE' }, { value: 'ESO', label: 'ESO' }];
const blankCategory = { name: '', description: '', order: 0, isActive: true };
const blankQuestion = { label: '', helpText: '', inputType: 'text', required: false, isActive: true, options: [], validation: {}, showWhen: null, categoryId: null, order: 0 };

function categoryIdFor(question) {
  return question?.categoryId?._id || question?.categoryId || null;
}

function sortCategories(items) {
  return [...items].sort((left, right) => (left.order ?? 0) - (right.order ?? 0) || new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime());
}

function sortQuestions(items) {
  return [...items].sort((left, right) => (left.order ?? 0) - (right.order ?? 0) || new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime());
}

function cloneQuestion(question) {
  return {
    ...blankQuestion,
    ...question,
    categoryId: categoryIdFor(question),
    options: (question.options || []).map((option) => typeof option === 'string' ? option : { label: option.label, value: option.value }),
    validation: { ...(question.validation || {}) },
    showWhen: question.showWhen ? { ...question.showWhen } : null,
  };
}

function Field({ label, hint, children, className = '' }) {
  return <label className={`field ${className}`}><span className="field__label">{label}</span>{children}{hint && <span className="field__hint">{hint}</span>}</label>;
}

function OrderButtons({ label, canMoveUp, canMoveDown, onMoveUp, onMoveDown, disabled }) {
  return <div className="order-buttons" aria-label={label}>
    <button className="icon-button" type="button" aria-label={`Move ${label} up`} disabled={disabled || !canMoveUp} onClick={onMoveUp}><ArrowUp size={14} /></button>
    <button className="icon-button" type="button" aria-label={`Move ${label} down`} disabled={disabled || !canMoveDown} onClick={onMoveDown}><ArrowDown size={14} /></button>
  </div>;
}

export default function QuestionBuilder() {
  const [, navigate] = useLocation();
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [draft, setDraft] = useState(null);
  const [categoryDraft, setCategoryDraft] = useState(null);
  const [branchDraft, setBranchDraft] = useState({ name: '', code: '' });
  const [memberDraft, setMemberDraft] = useState({ fullName: '', daoCode: '', role: 'BDE', branchId: '' });
  const [directoryDraft, setDirectoryDraft] = useState(null);
  const [directoryRequests, setDirectoryRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [pendingAction, setPendingAction] = useState('');

  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      const [questionData, categoryData, branchData, memberData, requestData] = await Promise.all([
        api('/admin/questions'),
        api('/admin/categories'),
        api('/admin/branches'),
        api('/admin/team-members'),
        api('/admin/directory-requests'),
      ]);
      setQuestions((questionData.questions || []).map((question) => ({ ...question, categoryId: categoryIdFor(question) })));
      setCategories(sortCategories(categoryData.categories || []));
      setBranches(branchData.branches || []);
      setTeamMembers(memberData.teamMembers || []);
      setDirectoryRequests(requestData.requests || []);
    } catch (error) {
      if (/session has expired|sign in again/i.test(error.message)) navigate('/admin/login');
      else setLoadError(error.message);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function requestConfirmation(action) { setConfirmation(action); }

  async function confirmChange() {
    if (!confirmation) return;
    setPendingAction(confirmation.key);
    try {
      await confirmation.execute();
      toast.success(confirmation.successMessage);
      setConfirmation(null);
    } catch (error) { toast.error(error.message); } finally { setPendingAction(''); }
  }

  const activeCategories = useMemo(() => sortCategories(categories.filter((category) => category.isActive)), [categories]);
  const retiredCategories = useMemo(() => sortCategories(categories.filter((category) => !category.isActive)), [categories]);

  function questionsForCategory(categoryId) {
    return sortQuestions(questions.filter((question) => String(categoryIdFor(question) || '') === String(categoryId || '')));
  }

  const uncategorisedQuestions = useMemo(() => sortQuestions(questions.filter((question) => !categoryIdFor(question))), [questions]);
  const questionOptions = useMemo(() => questions.filter((question) => question.isActive !== false).map((question) => ({ value: question.key, label: question.label })), [questions]);

  function beginCreateCategory() { setCategoryDraft({ ...blankCategory, order: activeCategories.length }); }
  function beginEditCategory(category) { setCategoryDraft({ ...category }); }
  function beginCreateQuestion(categoryId = activeCategories[0]?._id || null) {
    setDraft({ ...blankQuestion, categoryId, order: categoryId ? questionsForCategory(categoryId).length : questions.length });
  }
  function beginEditQuestion(question) { setDraft(cloneQuestion(question)); }

  function requestCategorySave() {
    if (!categoryDraft?.name.trim()) { toast.error('Give this category a clear name before saving.'); return; }
    const snapshot = { ...categoryDraft, name: categoryDraft.name.trim(), description: categoryDraft.description?.trim() || '', order: Math.max(0, Number(categoryDraft.order) || 0) };
    requestConfirmation({
      key: 'save-category',
      title: snapshot._id ? 'Save category changes?' : 'Add this category to the template?',
      description: snapshot._id ? `“${snapshot.name}” will keep its place in the live reporting template.` : `“${snapshot.name}” will become a new section in the live reporting template.`,
      confirmLabel: snapshot._id ? 'Save changes' : 'Add category',
      successMessage: snapshot._id ? 'Category changes saved.' : 'Category added to the reporting template.',
      execute: async () => {
        const saved = await api(snapshot._id ? `/admin/categories/${snapshot._id}` : '/admin/categories', { method: snapshot._id ? 'PUT' : 'POST', body: JSON.stringify(snapshot) });
        setCategories((current) => sortCategories(snapshot._id ? current.map((category) => category._id === saved.category._id ? saved.category : category) : [...current, saved.category]));
        setCategoryDraft(null);
      },
    });
  }

  function toggleCategory(category) {
    const nextState = !category.isActive;
    requestConfirmation({
      key: `category-status-${category._id}`,
      title: `${nextState ? 'Restore' : 'Archive'} “${category.name}”?`,
      description: nextState ? 'The category and its active questions will be available for template configuration again.' : 'Archived categories no longer appear on the worker report. Questions must be moved or retired first.',
      confirmLabel: nextState ? 'Restore category' : 'Archive category',
      danger: !nextState,
      successMessage: nextState ? 'Category restored.' : 'Category archived.',
      execute: async () => {
        const result = await api(`/admin/categories/${category._id}`, nextState ? { method: 'PUT', body: JSON.stringify({ ...category, isActive: true }) } : { method: 'DELETE' });
        const saved = result.category || { ...category, isActive: nextState };
        setCategories((current) => current.map((item) => item._id === category._id ? saved : item));
      },
    });
  }

  function reorderCategories(category, direction) {
    const index = activeCategories.findIndex((item) => item._id === category._id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= activeCategories.length) return;
    const next = [...activeCategories];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    const payload = next.map((item, order) => ({ id: item._id, order }));
    setPendingAction(`category-order-${category._id}`);
    setCategories((current) => current.map((item) => payload.find((entry) => entry.id === item._id) ? { ...item, order: payload.find((entry) => entry.id === item._id).order } : item));
    api('/admin/categories/reorder', { method: 'POST', body: JSON.stringify({ items: payload }) })
      .then((result) => setCategories(sortCategories(result.categories || next)))
      .then(() => toast.success('Category order updated in the live template.'))
      .catch((error) => { toast.error(error.message); load(); })
      .finally(() => setPendingAction(''));
  }

  function requestQuestionSave() {
    if (!draft?.label?.trim()) { toast.error('Enter a clear question label before saving.'); return; }
    if (!draft.categoryId) { toast.error('Assign this question to a category before saving.'); return; }
    const snapshot = {
      ...draft,
      label: draft.label.trim(),
      helpText: draft.helpText?.trim() || '',
      categoryId: draft.categoryId,
      order: Math.max(0, Number(draft.order) || 0),
      options: (draft.options || []).map((option) => typeof option === 'string' ? option.trim() : option).filter((option) => typeof option === 'string' ? option : option?.label),
      validation: Object.fromEntries(Object.entries(draft.validation || {}).filter(([, value]) => value !== '' && value !== undefined)),
      showWhen: draft.showWhen?.questionKey ? { questionKey: draft.showWhen.questionKey, equals: draft.showWhen.equals ?? '' } : null,
    };
    requestConfirmation({
      key: 'save-question',
      title: snapshot._id ? 'Save question changes?' : 'Add this question to the daily ledger?',
      description: snapshot._id ? `The revised “${snapshot.label}” field will apply to all new reports.` : `“${snapshot.label}” will become part of the live daily report form.`,
      confirmLabel: snapshot._id ? 'Save changes' : 'Add question',
      successMessage: snapshot._id ? 'Question changes saved to the reporting template.' : 'Question added to the reporting template.',
      execute: async () => {
        const saved = await api(snapshot._id ? `/admin/questions/${snapshot._id}` : '/admin/questions', { method: snapshot._id ? 'PUT' : 'POST', body: JSON.stringify(snapshot) });
        const savedQuestion = { ...saved.question, categoryId: categoryIdFor(saved.question) };
        setQuestions((current) => snapshot._id ? current.map((question) => question._id === savedQuestion._id ? savedQuestion : question) : [...current, savedQuestion]);
        setDraft(null);
      },
    });
  }

  function toggleQuestion(question) {
    const nextState = question.isActive === false;
    requestConfirmation({
      key: `question-status-${question._id}`,
      title: `${nextState ? 'Restore' : 'Retire'} “${question.label}”?`,
      description: nextState ? 'The question will return to the live worker report in its saved position.' : 'Retired questions disappear from future worker reports. Historic submissions remain unchanged.',
      confirmLabel: nextState ? 'Restore question' : 'Retire question',
      danger: !nextState,
      successMessage: nextState ? 'Question restored to the template.' : 'Question retired from future reports.',
      execute: async () => {
        const result = await api(`/admin/questions/${question._id}`, { method: 'PUT', body: JSON.stringify({ ...cloneQuestion(question), categoryId: categoryIdFor(question), order: question.order ?? 0, isActive: nextState }) });
        const savedQuestion = { ...result.question, categoryId: categoryIdFor(result.question) };
        setQuestions((current) => current.map((item) => item._id === question._id ? savedQuestion : item));
      },
    });
  }

  function reorderQuestions(categoryId, question, direction) {
    const group = questionsForCategory(categoryId);
    const index = group.findIndex((item) => item._id === question._id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= group.length) return;
    const next = [...group];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    const payload = next.map((item, order) => ({ id: item._id, order }));
    setPendingAction(`question-order-${question._id}`);
    setQuestions((current) => current.map((item) => {
      const moved = payload.find((entry) => entry.id === item._id);
      return moved ? { ...item, order: moved.order } : item;
    }));
    api('/admin/questions/reorder', { method: 'POST', body: JSON.stringify({ items: payload }) })
      .then((result) => setQuestions((result.questions || []).map((item) => ({ ...item, categoryId: categoryIdFor(item) }))))
      .then(() => toast.success('Question order updated in the live template.'))
      .catch((error) => { toast.error(error.message); load(); })
      .finally(() => setPendingAction(''));
  }

  async function confirmDirectoryAction(action) {
    requestConfirmation(action);
  }

  function addBranch(event) {
    event.preventDefault();
    const snapshot = { ...branchDraft };
    confirmDirectoryAction({ key: 'add-branch', title: `Add “${snapshot.name}” to the branch list?`, description: 'Workers will be able to select this branch in new daily reports.', confirmLabel: 'Add branch', successMessage: 'Branch added to the canonical list.', execute: async () => { const result = await api('/admin/branches', { method: 'POST', body: JSON.stringify(snapshot) }); setBranches((current) => [...current, result.branch].sort((a, b) => a.name.localeCompare(b.name))); setBranchDraft({ name: '', code: '' }); } });
  }

  function addMember(event) {
    event.preventDefault();
    if (!memberDraft.branchId) { toast.error('Choose the staff member’s branch before adding them.'); return; }
    const snapshot = { ...memberDraft };
    const branchName = branches.find((branch) => branch._id === snapshot.branchId)?.name || 'the selected branch';
    confirmDirectoryAction({ key: 'add-member', title: `Add ${snapshot.fullName} to ${branchName}?`, description: `${snapshot.daoCode} will be recorded as a ${snapshot.role} and appear in future exports.`, confirmLabel: 'Add to directory', successMessage: 'BDE/ESO added to the managed directory.', execute: async () => { const result = await api('/admin/team-members', { method: 'POST', body: JSON.stringify(snapshot) }); setTeamMembers((current) => [...current, result.member].sort((a, b) => a.fullName.localeCompare(b.fullName))); setMemberDraft({ fullName: '', daoCode: '', role: 'BDE', branchId: '' }); } });
  }

  function beginEditBranch(branch) { setDirectoryDraft({ kind: 'branch', ...branch, code: branch.code || '' }); }
  function beginEditMember(member) { setDirectoryDraft({ kind: 'member', ...member, daoCode: member.daoCode || '', branchId: String(member.branchId || '') }); }

  function requestDirectorySave() {
    if (!directoryDraft) return;
    const isBranch = directoryDraft.kind === 'branch';
    const name = String(isBranch ? directoryDraft.name : directoryDraft.fullName || '').trim();
    const code = String(isBranch ? directoryDraft.code : directoryDraft.daoCode || '').trim().toUpperCase();
    if (name.length < (isBranch ? 2 : 3)) { toast.error(`Enter a valid ${isBranch ? 'branch name' : 'full name'} before saving.`); return; }
    if (!isBranch && !directoryDraft.branchId) { toast.error('Choose the BDE/ESO’s branch before saving.'); return; }
    const payload = isBranch ? { name, code, isActive: directoryDraft.isActive !== false } : { fullName: name, daoCode: code, role: directoryDraft.role, branchId: directoryDraft.branchId, isActive: directoryDraft.isActive !== false };
    requestConfirmation({
      key: `edit-${directoryDraft.kind}`,
      title: isBranch ? `Save changes to ${name}?` : `Save directory changes for ${name}?`,
      description: isBranch ? 'Future worker selections will use the updated branch details. Historical report snapshots remain unchanged.' : 'Future worker selections and report snapshots will use the updated name, branch, and DAO code. Historical reports remain unchanged.',
      confirmLabel: 'Save directory changes',
      successMessage: isBranch ? 'Branch details updated.' : 'BDE/ESO directory details updated.',
      execute: async () => {
        const path = isBranch ? `/admin/branches/${directoryDraft._id}` : `/admin/team-members/${directoryDraft._id}`;
        const result = await api(path, { method: 'PUT', body: JSON.stringify(payload) });
        if (isBranch) setBranches((current) => [...current.filter((item) => item._id !== result.branch._id), result.branch].sort((a, b) => a.name.localeCompare(b.name)));
        else setTeamMembers((current) => [...current.filter((item) => item._id !== result.member._id), result.member].sort((a, b) => a.fullName.localeCompare(b.fullName)));
        setDirectoryDraft(null);
      },
    });
  }

  function resolveDirectoryRequest(request, status) {
    confirmDirectoryAction({ key: `${status}-${request._id}`, title: status === 'reviewed' ? `Mark ${request.fullName} as reviewed?` : `Dismiss ${request.fullName}’s registration?`, description: status === 'reviewed' ? 'This confirms you have seen the request. Add the person to the directory when their details are approved.' : 'The request will leave the active review queue.', confirmLabel: status === 'reviewed' ? 'Mark reviewed' : 'Dismiss request', danger: status === 'dismissed', successMessage: status === 'reviewed' ? 'Registration marked reviewed.' : 'Registration dismissed.', execute: async () => { await api(`/admin/directory-requests/${request._id}/status`, { method: 'POST', body: JSON.stringify({ status }) }); setDirectoryRequests((current) => current.filter((item) => item._id !== request._id)); } });
  }

  const branchOptions = branches.filter((branch) => branch.isActive).map((branch) => ({ value: branch._id, label: branch.name }));
  const allBranchOptions = branches.map((branch) => ({ value: branch._id, label: `${branch.name}${branch.isActive === false ? ' (archived)' : ''}` }));
  const disabled = Boolean(pendingAction);

  return <div className="admin-layout">
    <AdminSidebar />
    <main className="admin-main admin-main--studio">
      <header className="admin-header">
        <div><p className="eyebrow">FORM STUDIO</p><h1>Build the <em>daily ledger.</em></h1><p className="admin-header__lede">Shape the reporting template once. Every worker sees the same considered sequence tomorrow.</p></div>
        <div className="admin-header__actions"><button className="secondary-button" type="button" onClick={beginCreateCategory}><Plus size={15} /> Category</button><button className="primary-button" type="button" onClick={() => beginCreateQuestion()}><Plus size={16} /> Question</button></div>
      </header>
      <section className="studio-intro"><SlidersHorizontal size={18} /><div><strong>Template architecture</strong><p>Categories are the sections workers move through. Use the arrows to reorder the live sequence, then open any question to refine its behavior.</p></div><span className="studio-intro__status"><CheckCircle2 size={14} /> Live configuration</span></section>
      {loadError ? <section className="admin-error-state"><strong>Form Studio could not load.</strong><p>{loadError}</p><button className="primary-button" type="button" onClick={load}>Retry connection</button></section> : <>
        <section className="template-studio">
          <div className="template-studio__heading"><div><p className="eyebrow">LIVE REPORTING TEMPLATE</p><h2>Categories and questions</h2><p>Arrange each section and its fields in the exact order your team should complete them. Retired questions stay visible here for safe restoration.</p></div><div className="template-studio__stats"><span><strong>{activeCategories.length}</strong> sections</span><span><strong>{questions.filter((question) => question.isActive !== false).length}</strong> live fields</span></div></div>
          {loading ? <div className="empty-studio">Loading the daily template…</div> : <div className="category-stack">
            {activeCategories.map((category, categoryIndex) => {
              const categoryQuestions = questionsForCategory(category._id);
              return <article className="category-card" key={category._id}>
                <header className="category-card__header">
                  <div className="category-card__index">{String(categoryIndex + 1).padStart(2, '0')}</div>
                  <div className="category-card__identity"><div className="category-card__title-row"><h3>{category.name}</h3><span className="live-pill"><i /> Live</span></div><p>{category.description || 'No description yet. Add one to give workers context for this section.'}</p></div>
                  <div className="category-card__actions"><OrderButtons label={category.name} canMoveUp={categoryIndex > 0} canMoveDown={categoryIndex < activeCategories.length - 1} onMoveUp={() => reorderCategories(category, -1)} onMoveDown={() => reorderCategories(category, 1)} disabled={disabled} /><button className="icon-button" type="button" aria-label={`Edit ${category.name}`} disabled={disabled} onClick={() => beginEditCategory(category)}><Pencil size={14} /></button><button className="icon-button icon-button--danger" type="button" aria-label={`Archive ${category.name}`} disabled={disabled} onClick={() => toggleCategory(category)}><Archive size={14} /></button></div>
                </header>
                <div className="category-card__meta"><span><GripVertical size={13} /> {categoryQuestions.length} {categoryQuestions.length === 1 ? 'question' : 'questions'}</span><span>Display order {String((category.order ?? categoryIndex) + 1).padStart(2, '0')}</span><button className="text-button" type="button" onClick={() => beginCreateQuestion(category._id)}><Plus size={14} /> Add question here</button></div>
                <div className="category-question-list">
                  {categoryQuestions.length ? categoryQuestions.map((question, questionIndex) => <article className={question.isActive === false ? 'category-question is-retired' : 'category-question'} key={question._id}>
                    <div className="category-question__order"><span>{String(questionIndex + 1).padStart(2, '0')}</span><OrderButtons label={question.label} canMoveUp={questionIndex > 0} canMoveDown={questionIndex < categoryQuestions.length - 1} onMoveUp={() => reorderQuestions(category._id, question, -1)} onMoveDown={() => reorderQuestions(category._id, question, 1)} disabled={disabled} /></div>
                    <button className="category-question__main" type="button" onClick={() => beginEditQuestion(question)}><span className="category-question__label">{question.label}</span><span className="category-question__details">{question.key} <i /> {typeLabels[question.inputType] || question.inputType} {question.required && <><i /> Required</>}</span></button>
                    <div className="category-question__state">{question.isActive === false ? <span className="retired-pill"><XCircle size={13} /> Retired</span> : <span className="active-mark"><CheckCircle2 size={14} /> Live</span>}</div>
                    <button className="icon-button" type="button" aria-label={`Edit ${question.label}`} onClick={() => beginEditQuestion(question)}><Pencil size={14} /></button>
                  </article>) : <div className="category-empty"><Info size={15} /><span>No questions in this section yet.</span><button className="text-button" type="button" onClick={() => beginCreateQuestion(category._id)}>Add the first question</button></div>}
                </div>
              </article>;
            })}
            {uncategorisedQuestions.length > 0 && <article className="category-card category-card--uncategorised"><header className="category-card__header"><div className="category-card__index">—</div><div className="category-card__identity"><div className="category-card__title-row"><h3>Uncategorised legacy questions</h3><span className="retired-pill">Needs a home</span></div><p>These fields are hidden from the live worker form until you assign each one to an active category.</p></div></header><div className="category-question-list">{uncategorisedQuestions.map((question) => <article className="category-question" key={question._id}><div className="category-question__order"><span>—</span></div><button className="category-question__main" type="button" onClick={() => beginEditQuestion(question)}><span className="category-question__label">{question.label}</span><span className="category-question__details">{question.key} <i /> {typeLabels[question.inputType] || question.inputType}</span></button><button className="text-button" type="button" onClick={() => beginEditQuestion(question)}>Assign category <ArrowLeft size={13} /></button></article>)}</div></article>}
            {!activeCategories.length && <div className="empty-studio empty-studio--prominent"><Info size={19} /><strong>Start with your first reporting section.</strong><span>Categories keep the worker experience calm and make the live sequence easy to maintain.</span><button className="primary-button" type="button" onClick={beginCreateCategory}><Plus size={15} /> Add category</button></div>}
          </div>}
          {retiredCategories.length > 0 && <section className="retired-category-list"><div><p className="eyebrow">ARCHIVED SECTIONS</p><h3>Held outside the live form</h3></div>{retiredCategories.map((category) => <article key={category._id}><div><strong>{category.name}</strong><span>{category.description || 'No description'}</span></div><button className="secondary-button" type="button" disabled={disabled} onClick={() => toggleCategory(category)}><RotateCcw size={14} /> Restore</button></article>)}</section>}
        </section>

        <section className="directory-section"><div className="directory-heading"><p className="eyebrow">CANONICAL IDENTITY DIRECTORY</p><h2>Branches and BDE / ESO names</h2><p>These managed choices replace free-text identity fields. DAO codes and roles stay out of the worker form but are carried into every export.</p></div><div className="directory-grid"><form className="directory-panel" onSubmit={addBranch}><div className="directory-panel__header"><span>01</span><h3>Branch list</h3></div><div className="inline-form"><input aria-label="Branch name" placeholder="Branch name" value={branchDraft.name} onChange={(event) => setBranchDraft({ ...branchDraft, name: event.target.value })} required /><input aria-label="Branch code" placeholder="Code (optional)" value={branchDraft.code} onChange={(event) => setBranchDraft({ ...branchDraft, code: event.target.value })} /><button className="primary-button" type="submit" disabled={disabled}>{pendingAction === 'add-branch' && <LoaderCircle className="button-spinner" size={15} />} {pendingAction === 'add-branch' ? 'Adding…' : <><Plus size={15} /> Add</>}</button></div><div className="directory-panel__list">{branches.length ? branches.map((branch) => <div className="directory-entry" key={branch._id}><div><strong>{branch.name}</strong><small>{branch.code || 'Code pending'}</small></div><button className="icon-button" type="button" aria-label={`Edit ${branch.name}`} disabled={disabled} onClick={() => beginEditBranch(branch)}><Pencil size={14} /></button></div>) : <em>Add the branches in your region.</em>}</div></form><form className="directory-panel" onSubmit={addMember}><div className="directory-panel__header"><span>02</span><h3>BDE / ESO list</h3></div><div className="member-directory-form"><input aria-label="BDE or ESO name" placeholder="Full name" value={memberDraft.fullName} onChange={(event) => setMemberDraft({ ...memberDraft, fullName: event.target.value })} required /><input aria-label="DAO code" placeholder="DAO code" value={memberDraft.daoCode} onChange={(event) => setMemberDraft({ ...memberDraft, daoCode: event.target.value.toUpperCase() })} required /><LedgerPicker ariaLabel="Select staff branch" className="ledger-picker--compact" disabled={!branchOptions.length || disabled} emptyLabel="Add a branch first." onChange={(value) => setMemberDraft({ ...memberDraft, branchId: value })} options={branchOptions} placeholder="Choose branch" value={memberDraft.branchId} /><LedgerPicker ariaLabel="Select staff role" className="ledger-picker--compact" disabled={disabled} onChange={(value) => setMemberDraft({ ...memberDraft, role: value })} options={roleOptions} placeholder="Choose role" value={memberDraft.role} /><button className="primary-button" type="submit" disabled={!branches.length || disabled}>{pendingAction === 'add-member' && <LoaderCircle className="button-spinner" size={15} />} {pendingAction === 'add-member' ? 'Adding…' : <><UserPlus size={15} /> Add</>}</button></div><div className="directory-panel__list">{teamMembers.length ? teamMembers.map((member) => <div className="directory-entry" key={member._id}><div><strong>{member.fullName}</strong><small>{member.daoCode || 'DAO pending'} · {member.role || 'BDE'} · {branches.find((branch) => branch._id === member.branchId)?.name || 'Assigned branch'}</small></div><button className="icon-button" type="button" aria-label={`Edit ${member.fullName}`} disabled={disabled} onClick={() => beginEditMember(member)}><Pencil size={14} /></button></div>) : <em>Add each BDE / ESO to their branch.</em>}</div></form></div>{directoryRequests.length > 0 && <section className="directory-requests"><div className="directory-requests__heading"><div><p className="eyebrow">PENDING REGISTRATIONS</p><h3>Names waiting for review</h3></div><span>{directoryRequests.length}</span></div><div className="directory-requests__list">{directoryRequests.map((request) => <article key={request._id}><div><strong>{request.fullName}</strong><span>{request.branchName} · {request.daoCode} · {request.role}</span></div><div><button className="secondary-button" type="button" disabled={disabled} onClick={() => resolveDirectoryRequest(request, 'dismissed')}>Dismiss</button><button className="primary-button" type="button" disabled={disabled} onClick={() => resolveDirectoryRequest(request, 'reviewed')}>Reviewed</button></div></article>)}</div></section>}</section>
      </>}

      {directoryDraft && <div className="studio-drawer" role="dialog" aria-modal="true"><div className="studio-drawer__backdrop" onClick={() => !disabled && setDirectoryDraft(null)} /><section className="studio-drawer__panel admin-editor"><button className="drawer-back" disabled={disabled} onClick={() => setDirectoryDraft(null)}><ArrowLeft size={16} /> Back to directory</button><p className="eyebrow">EDIT {directoryDraft.kind === 'branch' ? 'BRANCH' : 'BDE / ESO'}</p><h2>{directoryDraft.kind === 'branch' ? 'Refine this branch' : 'Refine this directory record'}</h2><p className="drawer-intro">These values are used for future worker selections and are copied into new report snapshots. Existing historical reports remain unchanged.</p>{directoryDraft.kind === 'branch' ? <><Field label="Branch name"><input disabled={disabled} value={directoryDraft.name} onChange={(event) => setDirectoryDraft({ ...directoryDraft, name: event.target.value })} /></Field><Field label="Branch code" hint="Optional. Codes are stored in uppercase."><input disabled={disabled} value={directoryDraft.code || ''} onChange={(event) => setDirectoryDraft({ ...directoryDraft, code: event.target.value.toUpperCase() })} placeholder="e.g. LAG-CENTRAL" /></Field></> : <><Field label="Full name"><input disabled={disabled} value={directoryDraft.fullName} onChange={(event) => setDirectoryDraft({ ...directoryDraft, fullName: event.target.value })} /></Field><Field label="DAO code" hint="Letters, numbers, hyphens, underscores, and slashes only."><input disabled={disabled} value={directoryDraft.daoCode || ''} onChange={(event) => setDirectoryDraft({ ...directoryDraft, daoCode: event.target.value.toUpperCase() })} /></Field><Field label="Branch"><LedgerPicker ariaLabel="Edit staff branch" className="ledger-picker--drawer" disabled={disabled} emptyLabel="Add a branch first." onChange={(value) => setDirectoryDraft({ ...directoryDraft, branchId: value })} options={allBranchOptions} value={directoryDraft.branchId} /></Field><Field label="Role"><LedgerPicker ariaLabel="Edit staff role" className="ledger-picker--drawer" disabled={disabled} onChange={(value) => setDirectoryDraft({ ...directoryDraft, role: value })} options={roleOptions} value={directoryDraft.role || 'BDE'} /></Field></>}<label className="toggle-row"><input disabled={disabled} type="checkbox" checked={directoryDraft.isActive !== false} onChange={(event) => setDirectoryDraft({ ...directoryDraft, isActive: event.target.checked })} /><span>{directoryDraft.kind === 'branch' ? 'Show this branch in new worker reports' : 'Show this BDE/ESO in the worker selector'}</span></label><div className="drawer-footer"><button className="primary-button" type="button" disabled={disabled} onClick={requestDirectorySave}>{pendingAction === `edit-${directoryDraft.kind}` && <LoaderCircle className="button-spinner" size={15} />}{pendingAction === `edit-${directoryDraft.kind}` ? 'Saving…' : 'Save directory changes'}</button></div></section></div>}

      {categoryDraft && <div className="studio-drawer" role="dialog" aria-modal="true"><div className="studio-drawer__backdrop" onClick={() => !disabled && setCategoryDraft(null)} /><section className="studio-drawer__panel"><button className="drawer-back" disabled={disabled} onClick={() => setCategoryDraft(null)}><ArrowLeft size={16} /> Back to template</button><p className="eyebrow">{categoryDraft._id ? 'EDIT CATEGORY' : 'NEW CATEGORY'}</p><h2>{categoryDraft._id ? 'Refine this section' : 'Name a new section'}</h2><p className="drawer-intro">Give workers a clear mental step and a short description. The display order controls where this section appears in the live report.</p><Field label="Category name"><input disabled={disabled} value={categoryDraft.name} onChange={(event) => setCategoryDraft({ ...categoryDraft, name: event.target.value })} placeholder="e.g. Daily performance" /></Field><Field label="Description" hint="Shown to administrators and workers as section context."><textarea disabled={disabled} rows="4" maxLength="320" value={categoryDraft.description || ''} onChange={(event) => setCategoryDraft({ ...categoryDraft, description: event.target.value })} placeholder="What belongs in this part of the report?" /></Field><Field label="Display order" hint="Use the arrows on the template for quick movement, or set an exact position here."><input disabled={disabled} type="number" min="1" step="1" value={(categoryDraft.order ?? 0) + 1} onChange={(event) => setCategoryDraft({ ...categoryDraft, order: Math.max(0, Number(event.target.value || 1) - 1) })} /></Field><label className="toggle-row"><input disabled={disabled} type="checkbox" checked={categoryDraft.isActive !== false} onChange={(event) => setCategoryDraft({ ...categoryDraft, isActive: event.target.checked })} /><span>Show this category in the live report</span></label><button className="primary-button" type="button" disabled={disabled} onClick={requestCategorySave}>{pendingAction === 'save-category' && <LoaderCircle className="button-spinner" size={15} />}Save category</button></section></div>}

      {draft && <div className="studio-drawer" role="dialog" aria-modal="true"><div className="studio-drawer__backdrop" onClick={() => !disabled && setDraft(null)} /><section className="studio-drawer__panel studio-drawer__panel--question"><button className="drawer-back" disabled={disabled} onClick={() => setDraft(null)}><ArrowLeft size={16} /> Back to template</button><p className="eyebrow">{draft._id ? 'EDIT QUESTION' : 'NEW QUESTION'}</p><h2>{draft._id ? 'Refine this field' : 'Add a precise field'}</h2><p className="drawer-intro">Configure how this question is asked, validated, displayed, and placed in the worker report.</p><div className="drawer-section"><div className="drawer-section__heading"><span>01</span><strong>Question identity</strong></div><Field label="Question label"><input disabled={disabled} value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} placeholder="e.g. How many accounts were funded?" /></Field><Field label="Help text" hint="A short instruction shown under the field."><textarea disabled={disabled} rows="3" maxLength="300" value={draft.helpText || ''} onChange={(event) => setDraft({ ...draft, helpText: event.target.value })} placeholder="Whole number only" /></Field></div><div className="drawer-section"><div className="drawer-section__heading"><span>02</span><strong>Placement and behavior</strong></div><Field label="Category"><LedgerPicker ariaLabel="Question category" className="ledger-picker--drawer" disabled={disabled} emptyLabel="Create a category first." onChange={(value) => setDraft({ ...draft, categoryId: value })} options={activeCategories.map((category) => ({ value: category._id, label: category.name }))} placeholder="Choose category" value={draft.categoryId || ''} /></Field><Field label="Position in category" hint="The first question is position 1."><input disabled={disabled} type="number" min="1" step="1" value={(draft.order ?? 0) + 1} onChange={(event) => setDraft({ ...draft, order: Math.max(0, Number(event.target.value || 1) - 1) })} /></Field><Field label="Input type"><LedgerPicker ariaLabel="Question input type" className="ledger-picker--drawer" disabled={disabled} onChange={(value) => setDraft({ ...draft, inputType: value })} options={inputTypeOptions} value={draft.inputType} /></Field><label className="toggle-row"><input disabled={disabled} type="checkbox" checked={draft.required} onChange={(event) => setDraft({ ...draft, required: event.target.checked })} /><span>Required for submission</span></label><label className="toggle-row"><input disabled={disabled} type="checkbox" checked={draft.isActive !== false} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} /><span>Show in the live worker report</span></label></div><div className="drawer-section"><div className="drawer-section__heading"><span>03</span><strong>Validation rules</strong></div><div className="validation-grid"><Field label="Minimum value"><input disabled={disabled} type="number" value={draft.validation?.min ?? ''} onChange={(event) => setDraft({ ...draft, validation: { ...draft.validation, min: event.target.value === '' ? '' : Number(event.target.value) } })} placeholder="Optional" /></Field><Field label="Maximum value"><input disabled={disabled} type="number" value={draft.validation?.max ?? ''} onChange={(event) => setDraft({ ...draft, validation: { ...draft.validation, max: event.target.value === '' ? '' : Number(event.target.value) } })} placeholder="Optional" /></Field><Field label="Minimum characters"><input disabled={disabled} type="number" min="0" value={draft.validation?.minLength ?? ''} onChange={(event) => setDraft({ ...draft, validation: { ...draft.validation, minLength: event.target.value === '' ? '' : Number(event.target.value) } })} placeholder="Optional" /></Field><Field label="Maximum characters"><input disabled={disabled} type="number" min="1" value={draft.validation?.maxLength ?? ''} onChange={(event) => setDraft({ ...draft, validation: { ...draft.validation, maxLength: event.target.value === '' ? '' : Number(event.target.value) } })} placeholder="Optional" /></Field><Field label="Earliest date"><input disabled={disabled} type="date" value={draft.validation?.minDate || ''} onChange={(event) => setDraft({ ...draft, validation: { ...draft.validation, minDate: event.target.value } })} /></Field><Field label="Latest date"><input disabled={disabled} type="date" value={draft.validation?.maxDate || ''} onChange={(event) => setDraft({ ...draft, validation: { ...draft.validation, maxDate: event.target.value } })} /></Field></div><Field label="Pattern" hint="Optional JavaScript regular expression, for example ^[A-Z]{3}-\\d{4}$"><input disabled={disabled} value={draft.validation?.pattern || ''} onChange={(event) => setDraft({ ...draft, validation: { ...draft.validation, pattern: event.target.value } })} placeholder="Optional format rule" /></Field></div>{draft.inputType === 'select' && <div className="drawer-section"><div className="drawer-section__heading"><span>04</span><strong>Select options</strong></div><Field label="Options" hint="One option per line. Labels and values are kept consistent for exports."><textarea disabled={disabled} rows="6" value={(draft.options || []).map((option) => typeof option === 'string' ? option : option.label).join('\n')} onChange={(event) => setDraft({ ...draft, options: event.target.value.split('\n').map((value) => value.trim()).filter(Boolean) })} placeholder="Branch visit\nPhone follow-up\nOther" /></Field></div>}{<div className="drawer-section"><div className="drawer-section__heading"><span>{draft.inputType === 'select' ? '05' : '04'}</span><strong>Conditional visibility</strong></div><p className="drawer-section__note"><Info size={14} /> Keep this field hidden until another answer matches the value you define.</p><Field label="Show when this question"><LedgerPicker ariaLabel="Conditional question" className="ledger-picker--drawer" disabled={disabled} emptyLabel="Add another question first." onChange={(value) => setDraft({ ...draft, showWhen: { questionKey: value, equals: draft.showWhen?.equals ?? '' } })} options={questionOptions.filter((option) => option.value !== draft.key)} placeholder="Always visible" value={draft.showWhen?.questionKey || ''} /></Field>{draft.showWhen?.questionKey && <Field label="Answer equals"><input disabled={disabled} value={draft.showWhen.equals ?? ''} onChange={(event) => setDraft({ ...draft, showWhen: { ...draft.showWhen, equals: event.target.value } })} placeholder="e.g. Yes" /></Field>}</div>}<div className="drawer-footer">{draft._id && <button className={draft.isActive === false ? 'secondary-button' : 'danger-button'} type="button" disabled={disabled} onClick={() => { setDraft(null); toggleQuestion(draft); }}>{draft.isActive === false ? <><RotateCcw size={14} /> Restore question</> : <><Trash2 size={14} /> Retire question</>}</button>}<button className="primary-button" type="button" disabled={disabled} onClick={requestQuestionSave}>{pendingAction === 'save-question' && <LoaderCircle className="button-spinner" size={15} />}{pendingAction === 'save-question' ? 'Saving…' : 'Save to daily template'}</button></div></section></div>}
      <ConfirmActionModal action={confirmation} busy={Boolean(pendingAction)} onCancel={() => setConfirmation(null)} onConfirm={confirmChange} />
    </main>
  </div>;
}
