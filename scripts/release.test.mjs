import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { createHash } from 'node:crypto';

const workflow = readFileSync(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8');
const programs = [...workflow.matchAll(/node --input-type=module(?: - [^\n]*)? <<'NODE'\r?\n([\s\S]*?)\r?\n          NODE/g)]
  .map(match => match[1].replace(/^          /gm, '').replace(/^import .*;\r?\n/gm, ''));
const recovery = programs.find(program => program.includes('const runId ='));
const inventory = programs.find(program => program.includes('const [inventory, ...files]'));
assert.ok(recovery && inventory, 'Recovery and publication validation must exist');

function validateRecovery(change = {}) {
  const platforms = ['windows-x86_64', 'linux-x86_64', 'darwin-x86_64', 'darwin-aarch64'];
  const run = { status: 'completed', event: 'workflow_dispatch', path: '.github/workflows/release.yml', ...change.run };
  const jobs = platforms.map((platform, index) => ({ id: index + 2, name: `Build ${platform}`, conclusion: 'success' }));
  jobs.push({ id: 1, name: 'Resolve private source release tag', conclusion: 'success' });
  if (change.missingBuild) jobs.pop();
  if (change.failedBuild) jobs[0].conclusion = 'failure';
  const artifacts = platforms.map(platform => ({ name: `release-${platform}`, expired: !!change.expired }));
  let output = '';
  const env = { GITHUB_REPOSITORY: 'owner/releases', ARTIFACTS_RUN_ID: change.id ?? '1234', SOURCE_TAG: 'v0.1.127', SOURCE_COMMIT: 'a'.repeat(40) };
  const gh = (_api, path) => path.endsWith('/logs') ? `Building v0.1.127 (${(change.commit ?? 'a').repeat(40)})`
    : path.includes('/jobs?') ? JSON.stringify({ jobs })
    : path.includes('/artifacts?') ? JSON.stringify({ artifacts }) : JSON.stringify(run);
  new Function('env', 'gh', 'appendFileSync', recovery.replaceAll('process.env.', 'env.').replace(/const gh = .*;\r?\n/, ''))(env, gh, (_path, value) => { output += value; });
  assert.equal(output, 'run_id=1234\n');
}

test('artifact recovery binds all successful platforms to the exact source commit', () => {
  validateRecovery();
  for (const invalid of [{ id: '../bad' }, { run: { status: 'in_progress' } }, { run: { path: 'untrusted.yml' } }, { failedBuild: true }, { missingBuild: true }, { expired: true }, { commit: 'b' }]) {
    assert.throws(() => validateRecovery(invalid));
  }
});

function validateInventory(files, assets, contents = { '/release/a.exe': Buffer.from('signed artifact') }) {
  new Function('argv', 'readFileSync', 'statSync', 'basename', 'createHash', inventory.replace('process.argv.slice(2)', 'argv'))(
    ['inventory.json', ...files],
    file => file === 'inventory.json' ? JSON.stringify({ assets }) : contents[file],
    file => ({ size: contents[file].length }), basename, createHash,
  );
}
test('only a complete publication with unique names and matching sizes/digests becomes public', () => {
  const bytes = Buffer.from('signed artifact');
  const asset = { name: 'a.exe', size: bytes.length, digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}` };
  validateInventory(['/release/a.exe'], [asset]);
  assert.throws(() => validateInventory(['/release/a.exe'], []));
  assert.throws(() => validateInventory(['/release/a.exe'], [{ ...asset, size: 1 }]));
  assert.throws(() => validateInventory(['/release/a.exe'], [{ ...asset, digest: 'sha256:bad' }]));
  assert.throws(() => validateInventory(['/release/a.exe', '/other/a.exe'], [asset, asset]));
});
