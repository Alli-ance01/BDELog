import mongoose from 'mongoose';

const { Schema } = mongoose;

const adminSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  displayName: { type: String, required: true, trim: true, maxlength: 100 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const branchSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100, unique: true },
  code: { type: String, trim: true, uppercase: true, maxlength: 20, unique: true, sparse: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const teamMemberSchema = new Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 120 },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
teamMemberSchema.index({ fullName: 1, branchId: 1 }, { unique: true });

const optionSchema = new Schema({ label: { type: String, required: true, trim: true, maxlength: 100 }, value: { type: String, required: true, trim: true, maxlength: 100 } }, { _id: false });
const validationSchema = new Schema({ min: Number, max: Number, pattern: String, maxLength: Number }, { _id: false });
const conditionSchema = new Schema({ questionKey: String, equals: Schema.Types.Mixed }, { _id: false });

const questionSchema = new Schema({
  key: { type: String, required: true, unique: true, immutable: true, trim: true, maxlength: 80 },
  label: { type: String, required: true, trim: true, maxlength: 180 },
  helpText: { type: String, trim: true, maxlength: 300, default: '' },
  inputType: { type: String, required: true, enum: ['text', 'textarea', 'integer', 'currency', 'date', 'select', 'boolean', 'paceRating', 'accountNumber'] },
  options: { type: [optionSchema], default: [] },
  validation: { type: validationSchema, default: {} },
  showWhen: { type: conditionSchema, default: null },
  required: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  order: { type: Number, required: true, default: 0 },
}, { timestamps: true });

const answerSnapshotSchema = new Schema({ key: String, label: String, inputType: String }, { _id: false });
const reportSchema = new Schema({
  reportDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  branchName: { type: String, required: true },
  teamMemberId: { type: Schema.Types.ObjectId, ref: 'TeamMember', required: true },
  teamMemberName: { type: String, required: true },
  answers: { type: Map, of: Schema.Types.Mixed, default: {} },
  questionSnapshot: { type: [answerSnapshotSchema], default: [] },
}, { timestamps: true });
reportSchema.index({ reportDate: 1, teamMemberId: 1 }, { unique: true });
reportSchema.index({ reportDate: -1, branchName: 1, teamMemberName: 1 });

export const Admin = mongoose.model('Admin', adminSchema);
export const Branch = mongoose.model('Branch', branchSchema);
export const TeamMember = mongoose.model('TeamMember', teamMemberSchema);
export const Question = mongoose.model('Question', questionSchema);
export const Report = mongoose.model('Report', reportSchema);
