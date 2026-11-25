import test from 'node:test';
import assert from 'node:assert/strict';
import { LOCAL_WORKSPACE_OWNER_KEY, resolveWorkspaceAccess } from '../lib/workspace-access.ts';

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { values, getItem(key) { return values.get(key) ?? null; }, setItem(key, value) { values.set(key, value); } };
}

test('guest workspace stays local and preserves every existing record', () => {
  const local = storage({ 'carvio.applications.v1': '[{"id":"guest-job"}]' });
  assert.equal(resolveWorkspaceAccess(local, null), 'ready');
  assert.equal(local.getItem(LOCAL_WORKSPACE_OWNER_KEY), null);
  assert.equal(local.getItem('carvio.applications.v1'), '[{"id":"guest-job"}]');
});

test('first authenticated access protects existing data without moving or uploading it', () => {
  const local = storage({ 'carvio.contacts.v1': '[{"name":"Private contact"}]' });
  assert.equal(resolveWorkspaceAccess(local, 'alice'), 'ready');
  assert.equal(local.getItem(LOCAL_WORKSPACE_OWNER_KEY), 'alice');
  assert.equal(local.getItem('carvio.contacts.v1'), '[{"name":"Private contact"}]');
  assert.equal(local.values.size, 2);
});

test('logout and account switch cannot open a previous account workspace; original account can return', () => {
  const local = storage({ [LOCAL_WORKSPACE_OWNER_KEY]: 'alice', 'carvio.applications.v1': '[{"notes":"alice-private"}]' });
  for (const [identity, result] of [['alice','ready'], [null,'locked'], ['bob','locked'], [null,'locked'], ['alice','ready']]) {
    assert.equal(resolveWorkspaceAccess(local, identity), result);
    assert.equal(local.getItem(LOCAL_WORKSPACE_OWNER_KEY), 'alice');
    assert.equal(local.getItem('carvio.applications.v1'), '[{"notes":"alice-private"}]');
  }
});

test('blocked reads and failed owner assignment fail closed', () => {
  assert.equal(resolveWorkspaceAccess({ getItem() { throw new Error('disabled'); }, setItem() {} }, 'alice'), 'unavailable');
  assert.equal(resolveWorkspaceAccess({ getItem() { return null; }, setItem() { throw new Error('quota'); } }, 'alice'), 'unavailable');
});

test('another-tab owner update is respected on the next access check', () => {
  const local = storage();
  assert.equal(resolveWorkspaceAccess(local, null), 'ready');
  local.setItem(LOCAL_WORKSPACE_OWNER_KEY, 'alice');
  assert.equal(resolveWorkspaceAccess(local, null), 'locked');
  assert.equal(resolveWorkspaceAccess(local, 'bob'), 'locked');
  assert.equal(resolveWorkspaceAccess(local, 'alice'), 'ready');
});
