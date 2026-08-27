import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Admin } from '../models.js';

function getCookieOptions() {
  const production = process.env.NODE_ENV === 'production';
  const sameSite = process.env.COOKIE_SAME_SITE || (production ? 'none' : 'lax');
  return { httpOnly: true, secure: production, sameSite, domain: process.env.COOKIE_DOMAIN || undefined, path: '/' };
}

export function createSession(admin) {
  const csrfToken = crypto.randomUUID();
  const token = jwt.sign({ sub: admin._id.toString(), email: admin.email, role: admin.role || 'admin', csrfToken }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
  return { token, csrfToken };
}

export function sessionCookie(res, token) {
  res.cookie(process.env.COOKIE_NAME || 'bdelog_session', token, { ...getCookieOptions(), maxAge: 1000 * 60 * 60 * 8 });
}

export function clearSessionCookie(res) {
  res.clearCookie(process.env.COOKIE_NAME || 'bdelog_session', getCookieOptions());
}

export async function requireAdmin(req, res, next) {
  try {
    const token = req.cookies?.[process.env.COOKIE_NAME || 'bdelog_session'];
    if (!token) return res.status(401).json({ message: 'Administrator sign-in is required.' });
    const session = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findOne({ _id: session.sub, isActive: true }).select('email displayName role isActive').lean();
    if (!admin) return res.status(401).json({ message: 'Your administrator access is no longer active.' });
    req.admin = { ...session, email: admin.email, displayName: admin.displayName, role: admin.role || 'admin' };
    return next();
  } catch {
    return res.status(401).json({ message: 'Your secure session has expired. Please sign in again.' });
  }
}

export function requireOwner(req, res, next) {
  if (req.admin?.role !== 'owner') return res.status(403).json({ message: 'Only the BDELog owner can manage administrator accounts.' });
  return next();
}

export function requireCsrf(req, res, next) {
  const received = req.get(process.env.CSRF_HEADER_NAME || 'x-bdelog-csrf');
  if (!received || !req.admin?.csrfToken || received !== req.admin.csrfToken) return res.status(403).json({ message: 'The secure action could not be verified. Refresh and try again.' });
  return next();
}
