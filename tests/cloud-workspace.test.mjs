import test from 'node:test';
import assert from 'node:assert/strict';
import { canSaveCloudWorkspace, isCloudWorkspace, writeCloudWorkspace, WorkspaceConflictError } from '../lib/cloud-workspace.ts';

function database(initial = null) {
  let row = initial;
  return {
    get row() { return row; },
    from(table) {
      assert.equal(table, 'user_workspaces');
      let incoming, inserting = false;
      const conditions = [];
      const builder = {
        insert(value) { inserting = true; incoming = value; return this; },
        update(value) { incoming = value; return this; },
        eq(key, value) { conditions.push([key, value]); return this; },
        select() { return this; },
        async maybeSingle() {
          if (inserting && row) return { data: null, error: { code: '23505' } };
          if (!inserting && (!row || !conditions.every(([key, value]) => row[key] === value))) return { data: null, error: null };
          row = structuredClone(incoming);
          return { data: { updated_at: row.updated_at }, error: null };
        },
      };
      return builder;
    },
  };
}
const payload = { schemaVersion: 1, applications: [{ id: 'saved-job' }] };

test('first save inserts only and cannot overwrite a cloud workspace created by another device', async () => {
  const db = database();
  const baseline = await writeCloudWorkspace(db, { userId: 'alice', updatedAt: null }, payload);
  assert.equal(db.row.workspace_data.applications[0].id, 'saved-job');
  assert.equal(baseline.updatedAt, db.row.updated_at);
  await assert.rejects(writeCloudWorkspace(db, { userId: 'alice', updatedAt: null }, { schemaVersion: 1, applications: [] }), WorkspaceConflictError);
  assert.equal(db.row.workspace_data.applications.length, 1);
});

test('two devices with the same baseline cannot overwrite each other silently', async () => {
  const db = database({ user_id: 'alice', updated_at: '2026-11-25T06:00:00.000Z', workspace_data: payload });
  const baseline = { userId: 'alice', updatedAt: db.row.updated_at };
  const next = await writeCloudWorkspace(db, baseline, payload);
  assert.notEqual(next.updatedAt, baseline.updatedAt);
  await assert.rejects(writeCloudWorkspace(db, baseline, { schemaVersion: 1, applications: [] }), WorkspaceConflictError);
  assert.deepEqual(db.row.workspace_data, payload);
});

test('a baseline from one account cannot update a different account row', async () => {
  const db = database({ user_id: 'bob', updated_at: '2026-11-25T06:00:00.000Z', workspace_data: payload });
  await assert.rejects(writeCloudWorkspace(db, { userId: 'alice', updatedAt: db.row.updated_at }, payload), WorkspaceConflictError);
  assert.equal(db.row.user_id, 'bob');
});

test('network failures propagate without reporting a successful save', async () => {
  const db = { from() { throw new Error('offline'); } };
  await assert.rejects(writeCloudWorkspace(db, { userId: 'alice', updatedAt: null }, payload), /offline/);
});

test('local owner and revision must match the signed-in account before upload', () => {
  assert.equal(canSaveCloudWorkspace(null, 'alice', null), false);
  assert.equal(canSaveCloudWorkspace({ userId: 'alice', updatedAt: null }, 'bob', null), false);
  assert.equal(canSaveCloudWorkspace({ userId: 'bob', updatedAt: null }, 'bob', 'alice'), false);
  assert.equal(canSaveCloudWorkspace({ userId: 'bob', updatedAt: null }, 'bob', null), true);
  assert.equal(canSaveCloudWorkspace({ userId: 'bob', updatedAt: null }, 'bob', 'bob'), true);
});

test('invalid or newer schema snapshots cannot replace a local workspace', () => {
  const valid = { schemaVersion: 1, applications: [], contacts: [], resumes: [], recoveryEntries: [], actionEvents: [], language: 'he', dailyMood: '', theme: 'light', searchProfile: {}, userProfile: {} };
  assert.equal(isCloudWorkspace(valid), true);
  for (const invalid of [null, {}, { ...valid, schemaVersion: 2 }, { ...valid, applications: {} }, { ...valid, applications: [null] }, { ...valid, searchTasks: ["broken"] }, { ...valid, userProfile: null }]) assert.equal(isCloudWorkspace(invalid), false);
});
