// Gilded Ledger design reminder: the overview is a single decisive work surface that favours readable signals over decorative KPI cards.
import { ArrowUpRight, Download, FileSpreadsheet, Filter, Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';
import AdminSidebar from '../components/AdminSidebar';
import { api, API_BASE_URL } from '../lib/api';
import { formatDate, formatNaira } from '../lib/formUtils';

function Stat({ label, value, detail, accent = false }) {
  return <div className={`stat ${accent ? 'stat--accent' : ''}`}><p>{label}</p><strong>{value}</strong><span>{detail}</span></div>;
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/admin/dashboard')
      .then(setDashboard)
      .catch(() => navigate('/admin/login'))
      .finally(() => setLoading(false));
  }, [navigate]);

  function download(format) {
    window.open(`${API_BASE_URL}/admin/reports/export?format=${format}`, '_blank', 'noopener,noreferrer');
  }

  const summary = dashboard?.summary || { submittedToday: 0, accountsOpened: 0, amountMobilised: 0, activeBranches: 0 };
  const latest = dashboard?.latestReports || [];

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-main">
        <header className="admin-header"><div><p className="eyebrow">REGIONAL SALES / OVERVIEW</p><h1>Good morning, <em>manager.</em></h1></div><div className="admin-header__actions"><Link href="/admin/reports" className="secondary-button"><Filter size={16} /> Filter reports</Link><button className="primary-button" onClick={() => download('xlsx')}><Download size={16} /> Export XLSX</button></div></header>
        {loading ? <div className="loading-line">Loading your current regional ledger…</div> : <>
          <section className="overview-stats">
            <Stat label="Reports submitted" value={summary.submittedToday} detail="Today" accent />
            <Stat label="Accounts opened" value={summary.accountsOpened} detail="Across all submitted reports" />
            <Stat label="Amount mobilised" value={formatNaira(summary.amountMobilised)} detail="Validated currency values" />
            <Stat label="Active branches" value={summary.activeBranches} detail="Configured in BDELog" />
          </section>
          <section className="insight-band">
            <div><p className="eyebrow eyebrow--gold">TODAY’S POSITION</p><h2>{summary.submittedToday ? 'Your regional picture is taking shape.' : 'The ledger is waiting for today’s first report.'}</h2><p>{summary.submittedToday ? 'Review the newest entries or export the current, normalised dataset when you are ready.' : 'Once BDEs submit their daily entries, their checked figures will appear here.'}</p></div>
            <div className="insight-band__motif"><i /><i /><i /></div>
          </section>
          <section className="admin-section">
            <div className="section-heading"><div><p className="eyebrow">LATEST ENTRIES</p><h2>Reporting ledger</h2></div><Link href="/admin/reports" className="gold-link">Open all reports <ArrowUpRight size={16} /></Link></div>
            <div className="ledger-table-wrap">
              <table className="ledger-table"><thead><tr><th>REPORT DATE</th><th>BDE / ESO</th><th>BRANCH</th><th>ACCOUNTS</th><th>MOBILISED</th><th>PACE</th></tr></thead><tbody>{latest.length ? latest.map((report) => <tr key={report._id}><td>{formatDate(report.reportDate)}</td><td>{report.teamMemberName}</td><td>{report.branchName}</td><td>{report.answers?.accountsOpened ?? '—'}</td><td>{formatNaira(report.answers?.amountMobilised)}</td><td><span className={`pace-badge pace-badge--${String(report.answers?.paceRating || '').toLowerCase()}`}>{report.answers?.paceRating || '—'}</span></td></tr>) : <tr><td colSpan="6" className="empty-ledger">No reports have been submitted yet. BDELog will display normalised daily entries here.</td></tr>}</tbody></table>
            </div>
          </section>
          <section className="admin-bottom-grid"><Link href="/admin/questions" className="action-panel"><Settings2 size={20} /><div><p>FORM STUDIO</p><h3>Shape tomorrow’s report</h3><span>Add, edit, order, or retire questions without touching code.</span></div><ArrowUpRight size={17} /></Link><button className="action-panel" onClick={() => download('csv')}><FileSpreadsheet size={20} /><div><p>DATA EXPORT</p><h3>Download a clean CSV</h3><span>All configured filters become your export boundary.</span></div><ArrowUpRight size={17} /></button></section>
        </>}
      </main>
    </div>
  );
}
