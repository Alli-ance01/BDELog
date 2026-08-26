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
if (existing) console.log(`An administrator already exists for ${email}. No change made.`);
else { await Admin.create({ email, passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12), displayName: process.env.ADMIN_DISPLAY_NAME, isActive: true }); console.log(`Created administrator ${email}.`); }
await mongoose.disconnect();
