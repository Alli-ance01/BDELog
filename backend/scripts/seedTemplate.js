import 'dotenv/config';
import mongoose from 'mongoose';
import { Question } from '../src/models.js';

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
const template = [
  ['accountsOpened', 'Accounts opened today', 'integer', true, 'Whole number only'],
  ['alternateChannels', 'Alternate channels issued', 'integer', true, 'Whole number only'],
  ['cumulativeOpeningBalance', 'Cumulative opening balance', 'currency', true, 'Enter a Naira amount'],
  ['amountMobilised', 'Amount mobilised today', 'currency', true, 'Enter a Naira amount'],
  ['accountNumber', 'Account number', 'accountNumber', false, 'Leading zeros are preserved'],
  ['funded', 'How many funded?', 'integer', true, 'Whole number only'],
  ['carded', 'How many carded?', 'integer', true, 'Whole number only'],
  ['plannedClosures', 'How many do you intend to close this week?', 'integer', true, 'Whole number only'],
  ['hasCluster', 'Do you have cluster to close this week?', 'boolean', true, ''],
  ['needsHelp', 'Do you need help?', 'boolean', true, ''],
  ['helpDetails', 'Where do you need help?', 'textarea', false, 'Give brief, actionable context'],
  ['paceRating', 'What is your current pace rating?', 'paceRating', true, ''],
].map(([key, label, inputType, required, helpText], order) => ({ key, label, inputType, required, helpText, order, showWhen: key === 'helpDetails' ? { questionKey: 'needsHelp', equals: true } : null }));

await mongoose.connect(process.env.MONGODB_URI);
for (const question of template) await Question.updateOne({ key: question.key }, { $setOnInsert: question }, { upsert: true });
console.log(`Ensured ${template.length} baseline questions.`);
await mongoose.disconnect();
