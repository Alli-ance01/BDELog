import mongoose from 'mongoose';
import { Question, QuestionCategory } from '../src/models.js';

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');

const categoryDefinitions = [
  { name: 'Daily performance', description: 'The numbers that reconcile today’s activity across the region.', order: 0 },
  { name: 'Pipeline and support', description: 'Forward-looking commitments, pace, and the support needed to move them.', order: 1 },
];

const categoryByName = new Map();
const template = [
  ['accountsOpened', 'Accounts opened today', 'integer', true, 'Whole number only', 'Daily performance'],
  ['alternateChannels', 'Alternate channels issued', 'integer', true, 'Whole number only', 'Daily performance'],
  ['cumulativeOpeningBalance', 'Cumulative opening balance', 'currency', true, 'Enter a Naira amount', 'Daily performance'],
  ['amountMobilised', 'Amount mobilised today', 'currency', true, 'Enter a Naira amount', 'Daily performance'],
  ['accountNumber', 'Account number', 'accountNumber', false, 'Leading zeros are preserved', 'Daily performance'],
  ['funded', 'How many funded?', 'integer', true, 'Whole number only', 'Daily performance'],
  ['carded', 'How many carded?', 'integer', true, 'Whole number only', 'Daily performance'],
  ['plannedClosures', 'How many do you intend to close this week?', 'integer', true, 'Whole number only', 'Pipeline and support'],
  ['hasCluster', 'Do you have cluster to close this week?', 'boolean', true, '', 'Pipeline and support'],
  ['needsHelp', 'Do you need help?', 'boolean', true, '', 'Pipeline and support'],
  ['helpDetails', 'Where do you need help?', 'textarea', false, 'Give brief, actionable context', 'Pipeline and support'],
  ['paceRating', 'What is your current pace rating?', 'paceRating', true, '', 'Pipeline and support'],
].map(([key, label, inputType, required, helpText, categoryName], order) => ({ key, label, inputType, required, helpText, order, categoryName, showWhen: key === 'helpDetails' ? { questionKey: 'needsHelp', equals: true } : null }));

await mongoose.connect(process.env.MONGODB_URI);
for (const definition of categoryDefinitions) {
  const category = await QuestionCategory.findOneAndUpdate({ name: definition.name }, { $set: definition }, { upsert: true, new: true, setDefaultsOnInsert: true });
  categoryByName.set(definition.name, category._id);
}

for (const question of template) {
  const { categoryName, ...payload } = question;
  await Question.updateOne(
    { key: question.key },
    { $set: { ...payload, categoryId: categoryByName.get(categoryName) }, $setOnInsert: { key: question.key } },
    { upsert: true },
  );
}

console.log(`Ensured ${template.length} baseline questions across ${categoryDefinitions.length} categories.`);
await mongoose.disconnect();
