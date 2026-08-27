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

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      method,
      headers,
      credentials: 'include',
    });
  } catch (_error) {
    throw new Error('Cannot reach BDELog right now. Check your connection, then refresh and try again.');
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok) {
    const recoveryMessage = response.status === 401 ? 'Your admin session has expired. Sign in again to continue.'
      : response.status === 403 ? 'You do not have permission to make this change.'
        : response.status === 404 ? 'That record is no longer available. Refresh the page and try again.'
          : response.status >= 500 ? 'BDELog could not complete that change. Wait a moment, then try again.'
            : null;
    throw new Error(data?.message || recoveryMessage || 'The change could not be completed. Please review the fields and try again.');
  }
  return data;
}

export { API_BASE_URL };
