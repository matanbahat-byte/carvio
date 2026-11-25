import test from 'node:test';
import assert from 'node:assert/strict';
import { clearLocalWorkspaceData, LOCAL_WORKSPACE_DATA_KEYS } from '../lib/local-data.ts';

function storage(keys) {
  const values = new Set(keys);
  return { values, get length() { return values.size; }, key: (index) => [...values][index] ?? null, removeItem: (key) => values.delete(key) };
}

test('local deletion removes product data and analytics identifiers but preserves preferences', () => {
  const workspace = storage([...LOCAL_WORKSPACE_DATA_KEYS, 'carvio.language.v1', 'carvio.theme.v1']);
  const local = storage([
    'carvio.analytics-last-active-day.v1',
    'carvio.analytics-acquisition-recorded.v1',
    'carvio.workspace-last-visit.v1',
    'carvio.cloud-autosync.v1',
    'carvio.cloud-local-owner.v1',
    'carvio.cloud-recovery.v1:alice',
    'carvio.cloud-recovery.v1:bob',
  ]);
  const session = storage(['carvio.analytics-session.v1', 'carvio.product-session.workspace', 'carvio.product-session.demo']);
  clearLocalWorkspaceData(workspace, local, session);
  assert.deepEqual([...workspace.values].sort(), ['carvio.language.v1', 'carvio.theme.v1']);
  assert.equal(local.values.has('carvio.analytics-last-active-day.v1'), false);
  assert.equal(local.values.has('carvio.analytics-acquisition-recorded.v1'), false);
  assert.equal(local.values.has('carvio.workspace-last-visit.v1'), false);
  assert.equal(local.values.has('carvio.cloud-autosync.v1'), true);
  assert.equal(local.values.has('carvio.cloud-local-owner.v1'), false);
  assert.equal([...local.values].some(key => key.startsWith('carvio.cloud-recovery.v1:')), false);
  assert.equal(session.values.size, 0);
});
