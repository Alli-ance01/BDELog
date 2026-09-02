import assert from 'node:assert/strict';
import test from 'node:test';
import { branchPayload, memberPayload, normaliseBranchPayload } from '../src/routes.js';

const branchId = '507f1f77bcf86cd799439011';

test('branch edits trim names and normalize branch codes to uppercase', () => {
  const parsed = branchPayload.parse({ name: '  Lagos Central  ', code: ' lag-centre ', isActive: true });
  const normalized = normaliseBranchPayload(parsed);
  assert.equal(normalized.name, 'Lagos Central');
  assert.equal(normalized.code, 'LAG-CENTRE');
  assert.equal(normalized.isActive, true);
});

test('team-member edits accept a branch reassignment and normalize DAO codes', () => {
  const parsed = memberPayload.parse({ fullName: '  Ada Okafor  ', daoCode: ' dao-009 ', role: 'BDE', branchId, isActive: true });
  assert.equal(parsed.fullName, 'Ada Okafor');
  assert.equal(parsed.daoCode, 'dao-009');
  assert.equal(parsed.branchId, branchId);
  assert.equal(parsed.role, 'BDE');
});

test('team-member edits reject malformed DAO codes', () => {
  assert.throws(() => memberPayload.parse({ fullName: 'Ada Okafor', daoCode: 'DAO 009', role: 'BDE', branchId }), /DAO code can contain/);
});
