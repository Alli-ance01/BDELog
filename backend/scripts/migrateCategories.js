import mongoose from 'mongoose';
import { Question, QuestionCategory } from '../src/models.js';

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');

const categories = [
  { name: 'Daily performance', description: 'The numbers that reconcile today’s activity across the region.', order: 0 },
  { name: 'Pipeline and support', description: 'Forward-looking commitments, pace, and the support needed to move them.', order: 1 },
];
const dailyKeys = new Set(['accountsOpened', 'alternateChannels', 'cumulativeOpeningBalance', 'amountMobilised', 'accountNumber', 'funded', 'carded']);

await mongoose.connect(process.env.MONGODB_URI);
const categoryByName = new Map();
for (const definition of categories) {
  const category = await QuestionCategory.findOneAndUpdate({ name: definition.name }, { $setOnInsert: definition }, { upsert: true, new: true, setDefaultsOnInsert: true });
  categoryByName.set(definition.name, category._id);
}

const questions = await Question.find().sort({ order: 1, createdAt: 1 });
const counters = new Map(categories.map((category) => [category.name, 0]));
for (const question of questions) {
  const categoryName = dailyKeys.has(question.key) ? 'Daily performance' : 'Pipeline and support';
  const order = counters.get(categoryName) || 0;
  await Question.updateOne({ _id: question._id }, { $set: { categoryId: categoryByName.get(categoryName), order } });
  counters.set(categoryName, order + 1);
}

console.log(`Assigned ${questions.length} existing questions to category sequences.`);
await mongoose.disconnect();
