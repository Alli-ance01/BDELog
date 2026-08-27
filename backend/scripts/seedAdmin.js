import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Admin } from '../src/models.js';

const required = ['MONGODB_URI', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'ADMIN_DISPLAY_NAME'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) throw new Error(`Missing seed variables: ${missing.join(', ')}`);

await mongoose.connect(process.env.MONGODB_URI);
const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
const existing = await Admin.findOne({ email });
if (existing) { await Admin.updateOne({ _id: existing._id }, { $set: { role: 'owner', isActive: true } }); console.log(`Confirmed ${email} as the active BDELog owner. Password was not changed.`); }
else { await Admin.create({ email, passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12), displayName: process.env.ADMIN_DISPLAY_NAME, role: 'owner', isActive: true }); console.log(`Created BDELog owner ${email}.`); }
await mongoose.disconnect();
