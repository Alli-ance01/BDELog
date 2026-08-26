// Gilded Ledger design reminder: API interactions are quiet, explicit, and protect administrative actions with an intentional CSRF handshake.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const CSRF_STORAGE_KEY = 'bdelog_csrf';

function getCsrfToken() {
  return sessionStorage.getItem(CSRF_STORAGE_KEY) || '';
}

export function setCsrfToken(token) {
  if (token) sessionStorage.setItem(CSRF_STORAGE_KEY, token);
}

export function clearCsrfToken() {
  sessionStorage.removeItem(CSRF_STORAGE_KEY);
}

export async function api(path, options = {}) {
  const method = options.method || 'GET';
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (!['GET', 'HEAD'].includes(method.toUpperCase())) headers['x-bdelog-csrf'] = getCsrfToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: 'include',
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok) throw new Error(data?.message || 'The request could not be completed.');
  return data;
}

export { API_BASE_URL };
