// Gilded Ledger design reminder: reporting data uses wide, breathable ledger tables and filter controls that surface decision boundaries clearly.
import { Download, FilterX, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import AdminSidebar from '../components/AdminSidebar';
import { api, API_BASE_URL } from '../lib/api';
import { formatDate, formatNaira } from '../lib/formUtils';

export default function Reports() {
  const [, navigate] = useLocation();
  const [reports, setReports] = useState([]);
  const [filters, setFilters] = useState({ from: '', to: '', search: '' });
  const [loading, setLoading] = useState(true);
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));

  function load() { setLoading(true); api(`/admin/reports?${query.toString()}`).then((data) => setReports(data.reports)).catch(() => navigate('/admin/login')).finally(() => setLoading(false)); }
  useEffect(() => { load(); }, []);
  function exportFile(format) { window.open(`${API_BASE_URL}/admin/reports/export?${query.toString()}&format=${format}`, '_blank', 'noopener,noreferrer'); }

  return <div className="admin-layout"><AdminSidebar /><main className="admin-main"><header className="admin-header"><div><p className="eyebrow">REGIONAL SALES / REPORTS</p><h1>One clean <em>record.</em></h1></div><div className="admin-header__actions"><button className="secondary-button" onClick={() => exportFile('csv')}><Download size={16} /> CSV</button><button className="primary-button" onClick={() => exportFile('xlsx')}><Download size={16} /> Excel</button></div></header><section className="filter-bar"><div className="filter-bar__label"><SlidersHorizontal size={17} /> Filters</div><label><span>From</span><input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label><label><span>To</span><input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label><label className="filter-bar__search"><Search size={16} /><input placeholder="Search BDE or branch" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></label><button className="primary-button" onClick={load}>Apply</button><button className="icon-button" onClick={() => { setFilters({ from: '', to: '', search: '' }); setTimeout(load, 0); }} aria-label="Clear filters"><FilterX size={17} /></button></section><section className="ledger-table-wrap ledger-table-wrap--reports"><table className="ledger-table"><thead><tr><th>DATE</th><th>BDE / ESO</th><th>BRANCH</th><th>OPENED</th><th>CHANNELS</th><th>MOBILISED</th><th>PACE</th></tr></thead><tbody>{loading ? <tr><td colSpan="7" className="empty-ledger">Refreshing the reporting ledger…</td></tr> : reports.length ? reports.map((report) => <tr key={report._id}><td>{formatDate(report.reportDate)}</td><td>{report.teamMemberName}</td><td>{report.branchName}</td><td>{report.answers?.accountsOpened ?? '—'}</td><td>{report.answers?.alternateChannels ?? '—'}</td><td>{formatNaira(report.answers?.amountMobilised)}</td><td><span className={`pace-badge pace-badge--${String(report.answers?.paceRating || '').toLowerCase()}`}>{report.answers?.paceRating || '—'}</span></td></tr>) : <tr><td colSpan="7" className="empty-ledger">No reports match this boundary.</td></tr>}</tbody></table></section></main></div>;
}
