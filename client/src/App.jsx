// Gilded Ledger design reminder: routing preserves a calm public ledger sheet and an efficient, dark-spined admin workspace.
import { Route, Switch } from 'wouter';
import ReportForm from './pages/ReportForm';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import QuestionBuilder from './pages/QuestionBuilder';
import Reports from './pages/Reports';
import AdminManagement from './pages/AdminManagement';

function NotFound() {
  return (
    <main className="not-found">
      <p className="eyebrow">BDELOG / 404</p>
      <h1>That page is not part of the ledger.</h1>
      <a className="gold-link" href="/">Return to daily reporting</a>
    </main>
  );
}

export default function App() {
  return (
    <Switch>
      <Route path="/" component={ReportForm} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/questions" component={QuestionBuilder} />
      <Route path="/admin/reports" component={Reports} />
      <Route path="/admin/administrators" component={AdminManagement} />
      <Route component={NotFound} />
    </Switch>
  );
}
