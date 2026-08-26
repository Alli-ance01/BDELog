// Gilded Ledger design reminder: BDELog uses composed editorial finance, ink/ivory/gold contrast, and precise operational interfaces.
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <>
    <App />
    <Toaster position="top-right" richColors />
  </>,
);
