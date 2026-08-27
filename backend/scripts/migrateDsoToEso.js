import 'dotenv/config';
import mongoose from 'mongoose';
import { DirectoryRequest, Report, TeamMember } from '../src/models.js';

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required to migrate DSO records to ESO.');

try {
  await mongoose.connect(process.env.MONGODB_URI);
  const [teamMembers, reports, registrations] = await Promise.all([
    TeamMember.collection.updateMany({ role: 'DSO' }, { $set: { role: 'ESO' } }),
    Report.collection.updateMany({ teamMemberRole: 'DSO' }, { $set: { teamMemberRole: 'ESO' } }),
    DirectoryRequest.collection.updateMany({ role: 'DSO' }, { $set: { role: 'ESO' } }),
  ]);
  console.log(`ESO migration complete: ${teamMembers.modifiedCount} team member(s), ${reports.modifiedCount} report snapshot(s), ${registrations.modifiedCount} registration(s) updated.`);
} finally {
  await mongoose.disconnect();
}
