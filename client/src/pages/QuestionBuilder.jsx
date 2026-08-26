// Gilded Ledger design reminder: the form studio makes configuration feel like editorial composition, with strong order and unambiguous field types.
import { ArrowLeft, GripVertical, Plus, SlidersHorizontal, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import AdminSidebar from '../components/AdminSidebar';
import { api } from '../lib/api';

const typeLabels = { text: 'Short text', textarea: 'Long text', integer: 'Whole number', currency: 'Currency', date: 'Date', select: 'Select list', boolean: 'Yes / No', paceRating: 'Pace rating', accountNumber: 'Account number' };
const blankQuestion = { label: '', inputType: 'text', required: false, options: [] };

export default function QuestionBuilder() {
  const [, navigate] = useLocation();
  const [questions, setQuestions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [draft, setDraft] = useState(null);
  const [branchDraft, setBranchDraft] = useState({ name: '', code: '' });
  const [memberDraft, setMemberDraft] = useState({ fullName: '', branchId: '' });

  useEffect(() => {
    Promise.all([api('/admin/questions'), api('/admin/branches'), api('/admin/team-members')])
      .then(([questionData, branchData, memberData]) => { setQuestions(questionData.questions); setBranches(branchData.branches); setTeamMembers(memberData.teamMembers); })
      .catch(() => navigate('/admin/login'));
  }, [navigate]);

  function beginCreate() { setDraft(blankQuestion); }

  async function save() {
    try {
      const saved = await api(draft._id ? `/admin/questions/${draft._id}` : '/admin/questions', { method: draft._id ? 'PUT' : 'POST', body: JSON.stringify(draft) });
      setQuestions((current) => draft._id ? current.map((question) => question._id === saved.question._id ? saved.question : question) : [...current, saved.question]);
      setDraft(null);
      toast.success('Question saved to the reporting template.');
    } catch (error) { toast.error(error.message); }
  }

  async function retire(question) {
    if (!window.confirm(`Retire “${question.label}” from future reports? Historic exports remain unchanged.`)) return;
    try { await api(`/admin/questions/${question._id}`, { method: 'DELETE' }); setQuestions((current) => current.filter((item) => item._id !== question._id)); toast.success('Question retired.'); } catch (error) { toast.error(error.message); }
  }

  async function addBranch(event) {
    event.preventDefault();
    try { const result = await api('/admin/branches', { method: 'POST', body: JSON.stringify(branchDraft) }); setBranches((current) => [...current, result.branch].sort((a, b) => a.name.localeCompare(b.name))); setBranchDraft({ name: '', code: '' }); toast.success('Branch added to the canonical list.'); } catch (error) { toast.error(error.message); }
  }

  async function addMember(event) {
    event.preventDefault();
    try { const result = await api('/admin/team-members', { method: 'POST', body: JSON.stringify(memberDraft) }); setTeamMembers((current) => [...current, result.member].sort((a, b) => a.fullName.localeCompare(b.fullName))); setMemberDraft({ fullName: '', branchId: '' }); toast.success('BDE/ESo added to the canonical list.'); } catch (error) { toast.error(error.message); }
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-main admin-main--studio">
        <header className="admin-header"><div><p className="eyebrow">FORM STUDIO</p><h1>Build the <em>daily ledger.</em></h1></div><button className="primary-button" onClick={beginCreate}><Plus size={16} /> Add question</button></header>
        <section className="studio-intro"><SlidersHorizontal size={18} /><p>Every question has a defined type. Counts, amounts, options, and dates remain consistent before they reach Excel.</p></section>

        <section className="directory-section">
          <div className="directory-heading"><p className="eyebrow">CANONICAL IDENTITY DIRECTORY</p><h2>Branches and BDE / ESo names</h2><p>These managed choices replace free-text identity fields, so every report groups cleanly by branch and team member.</p></div>
          <div className="directory-grid">
            <form className="directory-panel" onSubmit={addBranch}><div className="directory-panel__header"><span>01</span><h3>Branch list</h3></div><div className="inline-form"><input aria-label="Branch name" placeholder="Branch name" value={branchDraft.name} onChange={(event) => setBranchDraft({ ...branchDraft, name: event.target.value })} required /><input aria-label="Branch code" placeholder="Code (optional)" value={branchDraft.code} onChange={(event) => setBranchDraft({ ...branchDraft, code: event.target.value })} /><button className="primary-button" type="submit"><Plus size={15} /> Add</button></div><div className="directory-panel__list">{branches.length ? branches.map((branch) => <span key={branch._id}>{branch.name}{branch.code ? <small>{branch.code}</small> : null}</span>) : <em>Add the branches in your region.</em>}</div></form>
            <form className="directory-panel" onSubmit={addMember}><div className="directory-panel__header"><span>02</span><h3>BDE / ESo list</h3></div><div className="inline-form inline-form--member"><input aria-label="BDE or ESo name" placeholder="Full name" value={memberDraft.fullName} onChange={(event) => setMemberDraft({ ...memberDraft, fullName: event.target.value })} required /><select aria-label="Branch" value={memberDraft.branchId} onChange={(event) => setMemberDraft({ ...memberDraft, branchId: event.target.value })} required><option value="">Select branch</option>{branches.filter((branch) => branch.isActive).map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}</select><button className="primary-button" type="submit" disabled={!branches.length}><UserPlus size={15} /> Add</button></div><div className="directory-panel__list">{teamMembers.length ? teamMembers.map((member) => <span key={member._id}>{member.fullName}<small>{branches.find((branch) => branch._id === member.branchId)?.name || 'Assigned branch'}</small></span>) : <em>Add each BDE / ESo to their branch.</em>}</div></form>
          </div>
        </section>

        <section className="question-list"><div className="question-list__head"><span>ORDER</span><span>QUESTION</span><span>INPUT TYPE</span><span>REQUIRED</span><span /></div>{questions.length ? questions.map((question, index) => <article className="question-row" key={question._id}><span className="question-order"><GripVertical size={17} /> {String(index + 1).padStart(2, '0')}</span><button className="question-label" onClick={() => setDraft(question)}>{question.label}<small>{question.key}</small></button><span className="question-type">{typeLabels[question.inputType] || question.inputType}</span><span className={question.required ? 'required-mark is-required' : 'required-mark'}>{question.required ? 'Required' : 'Optional'}</span><button className="icon-button" aria-label={`Retire ${question.label}`} onClick={() => retire(question)}><Trash2 size={16} /></button></article>) : <div className="empty-studio">The daily template will appear here after the baseline questions are seeded.</div>}</section>

        {draft && <div className="studio-drawer" role="dialog" aria-modal="true"><div className="studio-drawer__backdrop" onClick={() => setDraft(null)} /><section className="studio-drawer__panel"><button className="drawer-back" onClick={() => setDraft(null)}><ArrowLeft size={16} /> Back to template</button><p className="eyebrow">{draft._id ? 'EDIT QUESTION' : 'NEW QUESTION'}</p><h2>{draft._id ? 'Refine this field' : 'Add a precise field'}</h2><label className="field"><span className="field__label">Question label</span><input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} placeholder="e.g. How many accounts were funded?" /></label><label className="field"><span className="field__label">Input type</span><select value={draft.inputType} onChange={(event) => setDraft({ ...draft, inputType: event.target.value })}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{draft.inputType === 'select' && <label className="field"><span className="field__label">Options</span><textarea rows="4" value={(draft.options || []).map((option) => typeof option === 'string' ? option : option.label).join('\n')} onChange={(event) => setDraft({ ...draft, options: event.target.value.split('\n').map((value) => value.trim()).filter(Boolean) })} placeholder="One option per line" /></label>}<label className="toggle-row"><input type="checkbox" checked={draft.required} onChange={(event) => setDraft({ ...draft, required: event.target.checked })} /><span>Required for submission</span></label><button className="primary-button" onClick={save}>Save to daily template</button></section></div>}
      </main>
    </div>
  );
}
