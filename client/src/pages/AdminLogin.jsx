// Gilded Ledger design reminder: the admin entry is a restrained institutional threshold, not a generic authentication card.
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import BrandMark from '../components/BrandMark';
import { api, setCsrfToken } from '../lib/api';

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      setCsrfToken(result.csrfToken);
      navigate('/admin');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel login-panel--story">
        <BrandMark inverse />
        <div className="login-panel__story-copy">
          <p className="eyebrow eyebrow--gold">BDELOG / ADMINISTRATION</p>
          <h1>Make every regional decision from a cleaner ledger.</h1>
          <p>View reports, shape the daily template, and export structured performance data without chasing forms.</p>
        </div>
        <div className="login-panel__motif"><i /><i /><i /></div>
      </section>
      <section className="login-panel login-panel--form">
        <div className="login-form-wrap">
          <p className="eyebrow">SECURE ACCESS</p>
          <h2>Regional control desk</h2>
          <p className="login-form-wrap__intro">Use your authorised BDELog administrator credentials.</p>
          <form onSubmit={submit}>
            <label className="field"><span className="field__label">Email address</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label className="field"><span className="field__label">Password</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Verifying…' : 'Enter control desk'} <ArrowRight size={17} /></button>
          </form>
          <div className="login-security"><LockKeyhole size={15} /> Protected access for authorised regional managers.</div>
        </div>
      </section>
    </main>
  );
}
