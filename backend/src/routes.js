import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import XLSX from 'xlsx';
import { Admin, Branch, DirectoryRequest, Question, QuestionCategory, Report, TeamMember } from './models.js';
import { clearSessionCookie, createSession, requireAdmin, requireCsrf, requireOwner, sessionCookie } from './middleware/auth.js';
import { exportValue, makeQuestionKey, normaliseAnswer } from './utils/normalise.js';
import { orderTemplate } from './utils/template.js';

const questionInputTypes = ['text', 'textarea', 'integer', 'currency', 'date', 'select', 'boolean', 'paceRating', 'accountNumber'];
const questionOption = z.union([z.string().trim().min(1).max(100), z.object({ label: z.string().trim().min(1).max(100), value: z.string().trim().min(1).max(100) })]);
const questionValidation = z.object({
  min: z.number().finite().optional(),
  max: z.number().finite().optional(),
  minLength: z.number().int().nonnegative().max(1000).optional(),
  maxLength: z.number().int().positive().max(1000).optional(),
  pattern: z.string().trim().max(200).optional(),
  minDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  maxDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).optional().default({});
const showWhenPayload = z.object({ questionKey: z.string().trim().min(1).max(80), equals: z.union([z.string(), z.boolean(), z.number()]) }).nullable().optional().default(null);
const categoryPayload = z.object({ name: z.string().trim().min(2).max(120), description: z.string().trim().max(320).optional().default(''), order: z.number().int().min(0).optional(), isActive: z.boolean().optional().default(true) });
const questionPayload = z.object({ label: z.string().trim().min(3).max(180), helpText: z.string().trim().max(300).optional().default(''), inputType: z.enum(questionInputTypes), options: z.array(questionOption).max(30).optional().default([]), required: z.boolean().optional().default(false), isActive: z.boolean().optional().default(true), categoryId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional().default(null), order: z.number().int().min(0).optional(), validation: questionValidation, showWhen: showWhenPayload });
const branchPayload = z.object({ name: z.string().trim().min(2).max(100), code: z.string().trim().max(20).optional().default(''), isActive: z.boolean().optional().default(true) });
const memberPayload = z.object({ fullName: z.string().trim().min(3).max(120), daoCode: z.string().trim().min(2).max(50).regex(/^[A-Za-z0-9/_-]+$/, 'DAO code can contain letters, numbers, hyphens, underscores, or slashes only.'), role: z.enum(['BDE', 'ESO']), branchId: z.string().regex(/^[a-f\d]{24}$/i), isActive: z.boolean().optional().default(true) });
const directoryRequestPayload = z.object({ fullName: z.string().trim().min(3).max(120), branchName: z.string().trim().min(2).max(100), daoCode: z.string().trim().min(2).max(50).regex(/^[A-Za-z0-9/_-]+$/, 'DAO code can contain letters, numbers, hyphens, underscores, or slashes only.'), role: z.enum(['BDE', 'ESO']) });
const directoryRequestStatusPayload = z.object({ status: z.enum(['reviewed', 'dismissed']) });
const adminCreatePayload = z.object({ displayName: z.string().trim().min(2).max(100), email: z.string().trim().email().max(254), password: z.string().min(12).max(128) });
const adminUpdatePayload = z.object({ displayName: z.string().trim().min(2).max(100), email: z.string().trim().email().max(254) });
const passwordResetPayload = z.object({ password: z.string().min(12).max(128) });
const adminStatusPayload = z.object({ isActive: z.boolean() });

function canonicalOptions(options) { return options.map((option) => typeof option === 'string' ? { label: option, value: option } : option); }
function normaliseValidation(validation = {}) {
  const next = Object.fromEntries(Object.entries(validation).filter(([, value]) => value !== undefined && value !== ''));
  const validationError = (message) => Object.assign(new Error(message), { statusCode: 422 });
  if (next.min !== undefined && next.max !== undefined && next.min > next.max) throw validationError('The minimum validation value cannot exceed the maximum.');
  if (next.minLength !== undefined && next.maxLength !== undefined && next.minLength > next.maxLength) throw validationError('The minimum text length cannot exceed the maximum.');
  if (next.minDate && next.maxDate && next.minDate > next.maxDate) throw validationError('The earliest date cannot be after the latest date.');
  if (next.pattern) { try { new RegExp(next.pattern); } catch { throw validationError('The validation pattern must be a valid regular expression.'); } }
  return next;
}
function normaliseQuestionPayload(payload) { return { ...payload, options: canonicalOptions(payload.options), validation: normaliseValidation(payload.validation), categoryId: payload.categoryId || null }; }
function questionSequenceFilter(categoryId) { return categoryId ? { categoryId } : { categoryId: null }; }
function normaliseBranchPayload(payload) { return { ...payload, code: payload.code ? payload.code.trim().toUpperCase() : undefined }; }
function toPlainAnswers(report) { return Object.fromEntries(report.answers instanceof Map ? report.answers.entries() : Object.entries(report.answers || {})); }
function dateToday() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date()); }

export const publicRouter = Router();
publicRouter.get('/form', async (_req, res, next) => {
  try {
    const [branches, teamMembers, categories, questions] = await Promise.all([
      Branch.find({ isActive: true }).select('name code').sort({ name: 1 }).lean(),
      TeamMember.find({ isActive: true }).select('fullName branchId').sort({ fullName: 1 }).lean(),
      QuestionCategory.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean(),
      Question.find({ isActive: true }).sort({ categoryId: 1, order: 1, createdAt: 1 }).lean(),
    ]);
    res.json({ branches, teamMembers, categories, questions: orderTemplate(categories, questions) });
  } catch (error) { next(error); }
});

publicRouter.post('/directory-requests', async (req, res, next) => {
  try {
    const payload = directoryRequestPayload.parse(req.body);
    const daoCode = payload.daoCode.toUpperCase();
    const existingMember = await TeamMember.exists({ daoCode });
    if (existingMember) return res.status(409).json({ message: 'This DAO code is already in the BDELog directory.' });
    const request = await DirectoryRequest.create({ ...payload, daoCode });
    return res.status(201).json({ request: { id: request._id, status: request.status } });
  } catch (error) { return next(error); }
});

publicRouter.post('/reports', async (req, res, next) => {
  try {
    const reportDate = String(req.body.reportDate || '');
    const branchId = String(req.body.branchId || '');
    const teamMemberId = String(req.body.teamMemberId || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) return res.status(422).json({ message: 'Choose a valid report date.' });
    const [branch, teamMember, categories, questions] = await Promise.all([
      Branch.findOne({ _id: branchId, isActive: true }),
      TeamMember.findOne({ _id: teamMemberId, isActive: true }),
      QuestionCategory.find({ isActive: true }).select('name').lean(),
      Question.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean(),
    ]);
    const orderedQuestions = orderTemplate(categories, questions);
    if (!branch || !teamMember || teamMember.branchId.toString() !== branch._id.toString()) return res.status(422).json({ message: 'Select an active BDE/ESO from the selected branch.' });
    const sourceAnswers = { ...req.body, ...(req.body.customAnswers || {}) };
    const answers = {};
    const errors = [];
      for (const question of orderedQuestions) {
      const shouldShow = !question.showWhen || sourceAnswers[question.showWhen.questionKey] === question.showWhen.equals || (question.showWhen.equals === true && sourceAnswers[question.showWhen.questionKey] === 'Yes');
      if (!shouldShow) continue;
      const result = normaliseAnswer(question, sourceAnswers[question.key]);
      if (question.required && (result.value === null || result.value === '')) errors.push(`${question.label} is required.`);
      else if (result.error) errors.push(result.error);
        else if (result.value !== null) answers[question.key] = result.value;
      }
      if (errors.length) return res.status(422).json({ message: errors[0], fieldErrors: errors });
    const categoriesById = new Map(categories.map((category) => [String(category._id), category.name]));
    const report = await Report.create({ reportDate, branchId: branch._id, branchName: branch.name, teamMemberId: teamMember._id, teamMemberName: teamMember.fullName, teamMemberDaoCode: teamMember.daoCode || '', teamMemberRole: teamMember.role || 'BDE', answers, questionSnapshot: orderedQuestions.map(({ key, label, inputType, categoryId, order }) => ({ key, label, inputType, categoryId, categoryName: categoriesById.get(String(categoryId)) || 'Uncategorised', order })) });
    return res.status(201).json({ report: { ...report.toObject(), answers: toPlainAnswers(report) } });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'This BDE/ESo has already submitted a report for that date.' });
    return next(error);
  }
});

export const authRouter = Router();
authRouter.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const admin = await Admin.findOne({ email, isActive: true });
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) return res.status(401).json({ message: 'The email or password is not recognised.' });
    const { token, csrfToken } = createSession(admin);
    sessionCookie(res, token);
    return res.json({ admin: { id: admin._id, displayName: admin.displayName, email: admin.email, role: admin.role || 'admin' }, csrfToken });
  } catch (error) { return next(error); }
});
authRouter.post('/logout', requireAdmin, requireCsrf, (_req, res) => { clearSessionCookie(res); res.json({ success: true }); });
authRouter.get('/me', requireAdmin, async (req, res, next) => { try { const admin = await Admin.findById(req.admin.sub).select('displayName email role isActive').lean(); if (!admin?.isActive) return res.status(401).json({ message: 'This administrator is no longer active.' }); return res.json({ admin: { ...admin, role: admin.role || 'admin' } }); } catch (error) { return next(error); } });

export const adminRouter = Router();
adminRouter.use(requireAdmin);
adminRouter.get('/admins', requireOwner, async (_req, res, next) => { try { const admins = await Admin.find().select('displayName email role isActive createdAt updatedAt').sort({ role: 1, displayName: 1 }).lean(); return res.json({ admins: admins.map((admin) => ({ ...admin, role: admin.role || 'admin' })) }); } catch (error) { return next(error); } });
adminRouter.post('/admins', requireOwner, requireCsrf, async (req, res, next) => { try { const payload = adminCreatePayload.parse(req.body); const admin = await Admin.create({ displayName: payload.displayName, email: payload.email.toLowerCase(), passwordHash: await bcrypt.hash(payload.password, 12), role: 'admin', isActive: true }); return res.status(201).json({ admin: { id: admin._id, displayName: admin.displayName, email: admin.email, role: admin.role, isActive: admin.isActive } }); } catch (error) { return next(error); } });
adminRouter.put('/admins/:id', requireOwner, requireCsrf, async (req, res, next) => { try { const payload = adminUpdatePayload.parse(req.body); const admin = await Admin.findByIdAndUpdate(req.params.id, { displayName: payload.displayName, email: payload.email.toLowerCase() }, { new: true, runValidators: true }).select('displayName email role isActive createdAt updatedAt'); if (!admin) return res.status(404).json({ message: 'Administrator not found.' }); return res.json({ admin: { ...admin.toObject(), role: admin.role || 'admin' } }); } catch (error) { return next(error); } });
adminRouter.post('/admins/:id/reset-password', requireOwner, requireCsrf, async (req, res, next) => { try { const { password } = passwordResetPayload.parse(req.body); const admin = await Admin.findByIdAndUpdate(req.params.id, { passwordHash: await bcrypt.hash(password, 12) }, { new: true }); if (!admin) return res.status(404).json({ message: 'Administrator not found.' }); return res.json({ success: true }); } catch (error) { return next(error); } });
adminRouter.post('/admins/:id/status', requireOwner, requireCsrf, async (req, res, next) => { try { const { isActive } = adminStatusPayload.parse(req.body); if (req.params.id === req.admin.sub && !isActive) return res.status(422).json({ message: 'You cannot deactivate your own account.' }); const target = await Admin.findById(req.params.id); if (!target) return res.status(404).json({ message: 'Administrator not found.' }); if (!isActive && target.role === 'owner') { const otherOwners = await Admin.countDocuments({ role: 'owner', isActive: true, _id: { $ne: target._id } }); if (!otherOwners) return res.status(422).json({ message: 'BDELog must retain at least one active owner.' }); } target.isActive = isActive; await target.save(); return res.json({ admin: { id: target._id, displayName: target.displayName, email: target.email, role: target.role || 'admin', isActive: target.isActive } }); } catch (error) { return next(error); } });
adminRouter.get('/dashboard', async (_req, res, next) => {
  try {
    const today = dateToday();
    const [todayReports, activeBranches, latestReports] = await Promise.all([Report.find({ reportDate: today }).lean(), Branch.countDocuments({ isActive: true }), Report.find().sort({ reportDate: -1, createdAt: -1 }).limit(8).lean()]);
    const summary = todayReports.reduce((result, report) => { const answers = toPlainAnswers(report); result.accountsOpened += Number(answers.accountsOpened || 0); result.amountMobilised += Number(answers.amountMobilised || 0); return result; }, { submittedToday: todayReports.length, accountsOpened: 0, amountMobilised: 0, activeBranches });
    res.json({ summary, latestReports: latestReports.map((report) => ({ ...report, answers: toPlainAnswers(report) })) });
  } catch (error) { next(error); }
});
const reorderPayload = z.object({ items: z.array(z.object({ id: z.string().regex(/^[a-f\d]{24}$/i), order: z.number().int().min(0) })).min(1).max(500) });

adminRouter.get('/categories', async (_req, res, next) => { try { res.json({ categories: await QuestionCategory.find().sort({ order: 1, createdAt: 1 }).lean() }); } catch (error) { next(error); } });
adminRouter.post('/categories', requireCsrf, async (req, res, next) => {
  try {
    const payload = categoryPayload.parse(req.body);
    const category = await QuestionCategory.create({ ...payload, order: payload.order ?? await QuestionCategory.countDocuments() });
    return res.status(201).json({ category });
  } catch (error) { return next(error); }
});
adminRouter.put('/categories/:id', requireCsrf, async (req, res, next) => {
  try {
    const payload = categoryPayload.parse(req.body);
    const category = await QuestionCategory.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ message: 'Category not found.' });
    return res.json({ category });
  } catch (error) { return next(error); }
});
adminRouter.post('/categories/reorder', requireCsrf, async (req, res, next) => {
  try {
    const payload = reorderPayload.parse(req.body);
    await Promise.all(payload.items.map(({ id, order }) => QuestionCategory.updateOne({ _id: id }, { $set: { order } })));
    return res.json({ categories: await QuestionCategory.find().sort({ order: 1, createdAt: 1 }).lean() });
  } catch (error) { return next(error); }
});
adminRouter.delete('/categories/:id', requireCsrf, async (req, res, next) => {
  try {
    const questionCount = await Question.countDocuments({ categoryId: req.params.id, isActive: true });
    if (questionCount) return res.status(422).json({ message: 'Move or retire every question in this category before archiving it.' });
    const category = await QuestionCategory.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!category) return res.status(404).json({ message: 'Category not found.' });
    return res.json({ category });
  } catch (error) { return next(error); }
});

adminRouter.get('/questions', async (_req, res, next) => { try { res.json({ questions: await Question.find().sort({ categoryId: 1, order: 1, createdAt: 1 }).lean() }); } catch (error) { next(error); } });
adminRouter.post('/questions', requireCsrf, async (req, res, next) => {
  try {
    const payload = questionPayload.parse(req.body);
    if (payload.inputType === 'select' && !payload.options.length) return res.status(422).json({ message: 'A select list needs at least one option.' });
    const normalised = normaliseQuestionPayload(payload);
    if (normalised.categoryId && !(await QuestionCategory.exists({ _id: normalised.categoryId, isActive: true }))) return res.status(422).json({ message: 'Choose an active category for this question.' });
    if (normalised.showWhen && !(await Question.exists({ key: normalised.showWhen.questionKey }))) return res.status(422).json({ message: 'Conditional visibility must reference an existing question.' });
    const question = await Question.create({ ...normalised, key: makeQuestionKey(payload.label), order: payload.order ?? await Question.countDocuments(questionSequenceFilter(normalised.categoryId)) });
    return res.status(201).json({ question });
  } catch (error) { return next(error); }
});
adminRouter.put('/questions/:id', requireCsrf, async (req, res, next) => {
  try {
    const payload = questionPayload.parse(req.body);
    if (payload.inputType === 'select' && !payload.options.length) return res.status(422).json({ message: 'A select list needs at least one option.' });
    const current = await Question.findById(req.params.id);
    if (!current) return res.status(404).json({ message: 'Question not found.' });
    const normalised = normaliseQuestionPayload(payload);
    if (normalised.showWhen?.questionKey === current.key) return res.status(422).json({ message: 'A question cannot depend on its own answer.' });
    if (normalised.categoryId && !(await QuestionCategory.exists({ _id: normalised.categoryId, isActive: true }))) return res.status(422).json({ message: 'Choose an active category for this question.' });
    if (normalised.showWhen && !(await Question.exists({ key: normalised.showWhen.questionKey, _id: { $ne: current._id } }))) return res.status(422).json({ message: 'Conditional visibility must reference another existing question.' });
    const categoryChanged = String(normalised.categoryId || '') !== String(current.categoryId || '');
    const nextOrder = payload.order ?? (categoryChanged ? await Question.countDocuments(questionSequenceFilter(normalised.categoryId)) : current.order);
    current.set({ ...normalised, order: nextOrder });
    await current.save();
    return res.json({ question: current });
  } catch (error) { return next(error); }
});
adminRouter.post('/questions/reorder', requireCsrf, async (req, res, next) => {
  try {
    const payload = reorderPayload.parse(req.body);
    await Promise.all(payload.items.map(({ id, order }) => Question.updateOne({ _id: id }, { $set: { order } })));
    return res.json({ questions: await Question.find().sort({ categoryId: 1, order: 1, createdAt: 1 }).lean() });
  } catch (error) { return next(error); }
});
adminRouter.delete('/questions/:id', requireCsrf, async (req, res, next) => { try { const question = await Question.findById(req.params.id); if (!question) return res.status(404).json({ message: 'Question not found.' }); const existsInReport = await Report.exists({ 'questionSnapshot.key': question.key }); if (existsInReport) { question.isActive = false; await question.save(); return res.json({ retired: true, question }); } await question.deleteOne(); return res.json({ deleted: true }); } catch (error) { return next(error); } });

adminRouter.get('/branches', async (_req, res, next) => { try { res.json({ branches: await Branch.find().sort({ name: 1 }).lean() }); } catch (error) { next(error); } });
adminRouter.post('/branches', requireCsrf, async (req, res, next) => { try { const payload = normaliseBranchPayload(branchPayload.parse(req.body)); const branch = await Branch.create(payload); res.status(201).json({ branch }); } catch (error) { next(error); } });
adminRouter.put('/branches/:id', requireCsrf, async (req, res, next) => { try { const payload = normaliseBranchPayload(branchPayload.parse(req.body)); const update = payload.code ? { $set: payload } : { $set: { name: payload.name, isActive: payload.isActive }, $unset: { code: 1 } }; const branch = await Branch.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }); if (!branch) return res.status(404).json({ message: 'Branch not found.' }); res.json({ branch }); } catch (error) { next(error); } });
adminRouter.get('/team-members', async (_req, res, next) => { try { res.json({ teamMembers: await TeamMember.find().sort({ fullName: 1 }).lean() }); } catch (error) { next(error); } });
adminRouter.post('/team-members', requireCsrf, async (req, res, next) => { try { const payload = memberPayload.parse(req.body); const member = await TeamMember.create({ ...payload, daoCode: payload.daoCode.toUpperCase() }); res.status(201).json({ member }); } catch (error) { next(error); } });
adminRouter.put('/team-members/:id', requireCsrf, async (req, res, next) => { try { const payload = memberPayload.parse(req.body); const member = await TeamMember.findByIdAndUpdate(req.params.id, { ...payload, daoCode: payload.daoCode.toUpperCase() }, { new: true, runValidators: true }); if (!member) return res.status(404).json({ message: 'Team member not found.' }); res.json({ member }); } catch (error) { next(error); } });
adminRouter.get('/directory-requests', async (_req, res, next) => { try { res.json({ requests: await DirectoryRequest.find({ status: 'pending' }).sort({ createdAt: -1 }).lean() }); } catch (error) { next(error); } });
adminRouter.post('/directory-requests/:id/status', requireCsrf, async (req, res, next) => { try { const { status } = directoryRequestStatusPayload.parse(req.body); const request = await DirectoryRequest.findOneAndUpdate({ _id: req.params.id, status: 'pending' }, { status, reviewedAt: new Date() }, { new: true }); if (!request) return res.status(404).json({ message: 'This registration request is no longer pending.' }); return res.json({ request }); } catch (error) { return next(error); } });

function buildReportFilter(query) { const filter = {}; if (/^\d{4}-\d{2}-\d{2}$/.test(query.from)) filter.reportDate = { ...(filter.reportDate || {}), $gte: query.from }; if (/^\d{4}-\d{2}-\d{2}$/.test(query.to)) filter.reportDate = { ...(filter.reportDate || {}), $lte: query.to }; if (query.search?.trim()) { const regex = new RegExp(query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); filter.$or = [{ teamMemberName: regex }, { branchName: regex }]; } return filter; }
async function queriedReports(query) { return Report.find(buildReportFilter(query)).sort({ reportDate: -1, createdAt: -1 }).lean(); }
adminRouter.get('/reports', async (req, res, next) => { try { const reports = await queriedReports(req.query); res.json({ reports: reports.map((report) => ({ ...report, answers: toPlainAnswers(report) })) }); } catch (error) { next(error); } });
adminRouter.get('/reports/export', async (req, res, next) => {
  try {
    const reports = await queriedReports(req.query);
    const labels = new Map(); reports.forEach((report) => report.questionSnapshot.forEach((question) => labels.set(question.key, question)));
    const rows = reports.map((report) => { const answers = toPlainAnswers(report); const row = { 'Report date': report.reportDate, Branch: report.branchName, Name: report.teamMemberName, 'DAO code': report.teamMemberDaoCode || '', Role: report.teamMemberRole || '', 'Submitted at': report.createdAt?.toISOString?.() || '' }; labels.forEach((question, key) => { row[question.label] = exportValue(question, answers[key]); }); return row; });
    const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
    const fileName = `bdelog-reports-${dateToday()}.${format}`;
    if (format === 'csv') { const worksheet = XLSX.utils.json_to_sheet(rows); const output = XLSX.utils.sheet_to_csv(worksheet); res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.attachment(fileName); return res.send(`\uFEFF${output}`); }
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'BDELog reports'); const output = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }); res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.attachment(fileName); return res.send(output);
  } catch (error) { return next(error); }
});

export function appErrorHandler(error, _req, res, _next) {
  if (error instanceof z.ZodError) return res.status(422).json({ message: error.issues[0]?.message || 'The input is not valid.' });
  if (error?.statusCode === 422) return res.status(422).json({ message: error.message });
  if (error?.code === 11000) { const field = Object.keys(error.keyPattern || {})[0]; const messages = { name: 'A branch with that name already exists.', code: 'That branch code is already in use.', email: 'An administrator with that email already exists.', daoCode: 'That DAO code is already assigned to a team member.' }; return res.status(409).json({ message: messages[field] || 'That value already exists in BDELog.' }); }
  console.error(error); return res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
}
