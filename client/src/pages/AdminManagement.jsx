/* Gilded Ledger access control: show work in progress and confirm high-impact administrator changes. */
import { KeyRound, LoaderCircle, Pencil, Plus, ShieldCheck, UserCheck, UserX, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import AdminSidebar from '../components/AdminSidebar';
import ConfirmActionModal from '../components/ConfirmActionModal';
import { api } from '../lib/api';

const emptyDraft = { displayName: '', email: '', password: '' };
const formatDate = (value) => value ? new Intl.DateTimeFormat('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';

export default function AdminManagement() {
  const [, navigate] = useLocation();
  const [admins, setAdmins] = useState([]);
  const [me, setMe] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [account, directory] = await Promise.all([api('/auth/me'), api('/admin/admins')]);
      setMe(account.admin); setAdmins(directory.admins); setAccessDenied(false);
    } catch (error) {
      if (/owner/i.test(error.message)) setAccessDenied(true);
      else if (/session has expired|sign in again/i.test(error.message)) navigate('/admin/login');
      else toast.error(error.message);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const openNew = () => setDraft(emptyDraft);
  const openEdit = (admin) => setDraft({ ...admin, password: '' });

  async function save(snapshot) {
    setSaving(true);
    try {
      if (snapshot._id) {
        const updated = await api(`/admin/admins/${snapshot._id}`, { method: 'PUT', body: JSON.stringify({ displayName: snapshot.displayName, email: snapshot.email }) });
        if (snapshot.password) await api(`/admin/admins/${snapshot._id}/reset-password`, { method: 'POST', body: JSON.stringify({ password: snapshot.password }) });
        setAdmins((current) => current.map((admin) => admin._id === updated.admin._id ? { ...admin, ...updated.admin } : admin));
        toast.success(snapshot.password ? 'Administrator details and password updated.' : 'Administrator details updated.');
      } else {
        const created = await api('/admin/admins', { method: 'POST', body: JSON.stringify(snapshot) });
        setAdmins((current) => [...current, created.admin].sort((a, b) => a.displayName.localeCompare(b.displayName)));
        toast.success('Administrator created. Share the temporary password privately.');
      }
      setDraft(null); setConfirmation(null);
    } catch (error) { toast.error(error.message); } finally { setSaving(false); }
  }

  function requestSave(event) {
    event.preventDefault();
    const snapshot = { ...draft };
    setConfirmation({ title: snapshot._id ? `Save changes for ${snapshot.displayName}?` : `Create ${snapshot.displayName} as an administrator?`, description: snapshot._id ? 'This updates account details and applies any password reset immediately.' : 'The new administrator can access BDELog after you share their temporary password privately.', confirmLabel: snapshot._id ? 'Save changes' : 'Create administrator', execute: () => save(snapshot) });
  }

  function toggleStatus(admin) {
    const nextStatus = !admin.isActive;
    const action = nextStatus ? 'Reactivate' : 'Deactivate';
    setConfirmation({ title: `${action} ${admin.displayName}?`, description: nextStatus ? 'They will be able to sign in to BDELog again.' : 'They will lose BDELog access immediately.', confirmLabel: `${action} account`, danger: !nextStatus, execute: async () => {
      setSaving(true);
      try {
        const result = await api(`/admin/admins/${admin._id}/status`, { method: 'POST', body: JSON.stringify({ isActive: nextStatus }) });
        setAdmins((current) => current.map((item) => item._id === result.admin.id ? { ...item, ...result.admin, _id: result.admin.id } : item));
        toast.success(nextStatus ? 'Administrator reactivated.' : 'Administrator deactivated.'); setConfirmation(null);
      } catch (error) { toast.error(error.message); } finally { setSaving(false); }
    } });
  }

  return <div className="admin-layout"><AdminSidebar /><main className="admin-main admin-main--admins"><header className="admin-header"><div><p className="eyebrow">CONTROL DESK / ACCESS</p><h1>Who holds the <em>keys?</em></h1></div>{!accessDenied && <button className="primary-button" onClick={openNew}><Plus size={16} /> Add administrator</button>}</header><section className="access-intro"><ShieldCheck size={19} /><div><strong>Owner-controlled access</strong><p>Administrators can manage reports and the daily template. Only the designated BDELog owner can create, edit, reset, disable, or reactivate administrator accounts.</p></div></section>{accessDenied ? <section className="access-denied"><UserX size={28} /><h2>This ledger is owner-controlled.</h2><p>Your account can use BDELog, but it cannot change who has administrator access. Ask the BDELog owner to manage accounts from this screen.</p></section> : <section className="admin-directory"><div className="admin-directory__head"><span>ACCOUNT</span><span>ROLE</span><span>STATUS</span><span>CREATED</span><span>ACTION</span></div>{loading ? <div className="empty-ledger">Loading the access register…</div> : admins.map((admin) => <article className="admin-account-row" key={admin._id}><div className="admin-identity"><span className="admin-avatar">{admin.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{admin.displayName}</strong><small>{admin.email}</small></div></div><span className={`role-mark role-mark--${admin.role}`}>{admin.role === 'owner' ? 'Owner' : 'Administrator'}</span><span className={`access-status ${admin.isActive ? 'is-active' : ''}`}><i />{admin.isActive ? 'Active' : 'Disabled'}</span><span className="admin-date">{formatDate(admin.createdAt)}</span><div className="admin-actions"><button className="secondary-button" onClick={() => openEdit(admin)}><Pencil size={14} /> Edit</button><button className="icon-button" aria-label={`${admin.isActive ? 'Deactivate' : 'Reactivate'} ${admin.displayName}`} onClick={() => toggleStatus(admin)} disabled={admin._id === me?._id || saving}>{saving ? <LoaderCircle className="button-spinner" size={16} /> : admin.isActive ? <UserX size={16} /> : <UserCheck size={16} />}</button></div></article>)}</section>}{draft && <div className="studio-drawer" role="dialog" aria-modal="true"><div className="studio-drawer__backdrop" onClick={() => !saving && setDraft(null)} /><section className="studio-drawer__panel admin-editor"><button className="drawer-back" disabled={saving} onClick={() => setDraft(null)}><X size={16} /> Close access record</button><p className="eyebrow">{draft._id ? 'EDIT ADMINISTRATOR' : 'NEW ADMINISTRATOR'}</p><h2>{draft._id ? 'Refine account access' : 'Issue a new key'}</h2><p className="admin-editor__intro">{draft._id ? 'Update the person’s identity, or set a new password only when it must be reset.' : 'Create a standard administrator account. The account owner remains protected and cannot be replaced from this screen.'}</p><form onSubmit={requestSave}><label className="field"><span className="field__label">Display name</span><input disabled={saving} value={draft.displayName} onChange={(event) => updateDraft('displayName', event.target.value)} required /></label><label className="field"><span className="field__label">Email address</span><input disabled={saving} type="email" value={draft.email} onChange={(event) => updateDraft('email', event.target.value)} required /></label><label className="field"><span className="field__label">{draft._id ? 'New password (optional)' : 'Temporary password'}</span><div className="password-field"><KeyRound size={16} /><input disabled={saving} type="password" minLength="12" value={draft.password} onChange={(event) => updateDraft('password', event.target.value)} placeholder={draft._id ? 'Leave blank to keep the current password' : 'At least 12 characters'} required={!draft._id} /></div><span className="field__hint">Passwords must contain at least 12 characters. Share a new password privately, never in a group chat.</span></label><button className="primary-button" type="submit" disabled={saving}>{saving && <LoaderCircle className="button-spinner" size={15} />}{saving ? 'Saving access…' : draft._id ? 'Save account changes' : 'Create administrator'}</button></form></section></div>}<ConfirmActionModal action={confirmation} busy={saving} onCancel={() => setConfirmation(null)} onConfirm={() => confirmation?.execute()} /></main></div>;
}
