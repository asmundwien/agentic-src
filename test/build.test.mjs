import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { promisify } from 'node:util';
import { assembleDist } from '../scripts/build.mjs';

const exec = promisify(execFile);
const source = { repository: 'fixture/source', commit: 'a'.repeat(40), dirty: false };
const script = fileURLToPath(new URL('../scripts/build.mjs', import.meta.url));
const installedPackage = fileURLToPath(new URL('../node_modules/rulesync', import.meta.url));

function nativeEnvironment(root) {
  const home = join(root, '.test-home');
  return {
    ...process.env,
    HOME: home,
    XDG_CONFIG_HOME: join(home, 'config'),
    XDG_CACHE_HOME: join(home, 'cache'),
    XDG_DATA_HOME: join(home, 'data'),
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GITHUB_REPOSITORY: source.repository,
  };
}

async function put(root, path, content, mode) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content);
  if (mode !== undefined) await chmod(target, mode);
  return target;
}

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'agentic-build-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await put(root, 'docs/consuming.md', '# Consume canonical collections\r\n');
  return root;
}

async function collection(root, name = 'base', { skills = [], rules = [] } = {}) {
  const remote = `fixture/${name}@${'b'.repeat(40)}:skills`;
  const sources = skills.length || rules.length ? [{ source: remote, ...(skills.length ? { skills } : {}), ...(rules.length ? { rules } : {}) }] : [];
  await put(root, `src/${name}/rulesync.jsonc`, `${JSON.stringify({ sources }, null, 2)}\n`);
  const lock = {
    lockfileVersion: 1,
    sources: sources.length ? {
      [remote]: {
        requestedRef: 'b'.repeat(40), resolvedRef: 'b'.repeat(40),
        skills: Object.fromEntries(skills.map((name) => [name, { integrity: 'fixture' }])),
        ...(rules.length ? { rules: Object.fromEntries(rules.map((name) => [name, { integrity: 'fixture' }])) } : {}),
        skillSelection: skills,
      },
    } : {},
  };
  const lockBytes = `${JSON.stringify(lock, null, 2)}\n`;
  await put(root, `src/${name}/rulesync.lock`, lockBytes);
  return lockBytes;
}

async function snapshot(path, prefix = '', result = {}) {
  for (const name of (await readdir(path)).sort()) {
    const child = join(path, name);
    const key = prefix ? `${prefix}/${name}` : name;
    const stat = await lstat(child);
    assert.equal(stat.isSymbolicLink(), false, `Artifact must not contain a symlink: ${key}`);
    if (stat.isDirectory()) await snapshot(child, key, result);
    else result[key] = { bytes: (await readFile(child)).toString('base64'), mode: stat.mode & 0o777 };
  }
  return result;
}

async function missing(path) {
  await assert.rejects(lstat(path), { code: 'ENOENT' });
}

test('canonical artifacts preserve arbitrary metadata, binary bytes, rule licenses and executable companions', async (t) => {
  const root = await fixture(t);
  const lock = await collection(root, 'base', { skills: ['remote', 'build'], rules: ['remote-rule'] });
  const rule = Buffer.from('---\r\nroot: true\r\ntargets: [omp, cursor]\r\ncursor: { alwaysApply: false }\r\narbitrary: { nested: [1, two] }\r\n---\r\n# Rule\r\n');
  const skill = Buffer.from('---\nname: original\ndescription: "Keep: punctuation"\nallowed-tools: Bash\nclaude: { context: fork }\ncustom: [yes, 17]\n---\n# Skill\n');
  await put(root, 'src/base/.rulesync/rules/policy.md', rule);
  await put(root, 'src/base/.rulesync/rules/policy.md.LICENSE', 'License sidecar\n');
  await put(root, 'src/base/.rulesync/rules/LICENSE', 'Collection license\n');
  await put(root, 'src/base/.rulesync/rules/.curated/remote-rule.md', '---\ntargets: [codexcli]\n---\nRemote rule\n');
  await put(root, 'src/base/.rulesync/skills/local/SKILL.md', skill);
  await put(root, 'src/base/.rulesync/skills/local/agents/openai.yaml', 'display_name: Exact metadata\n');
  const binary = Buffer.from([0, 255, 13, 10, 128, 42]);
  await put(root, 'src/base/.rulesync/skills/local/assets/data.bin', binary);
  await put(root, 'src/base/.rulesync/skills/local/scripts/run.sh', '#!/bin/sh\nprintf companion\n', 0o751);
  await put(root, 'src/base/.rulesync/skills/.curated/remote/SKILL.md', skill);
  await put(root, 'src/base/.rulesync/skills/.curated/remote/scripts/run.sh', '#!/bin/sh\nexit 0\n', 0o755);
  await put(root, 'src/base/.rulesync/skills/.curated/build/SKILL.md', 'Build workflow skill\n');

  const provenance = await assembleDist({ root, source });
  assert.deepEqual(provenance, {
    schemaVersion: 1, source, rulesyncVersion: '43.6.0',
    collections: [{ name: 'base', lockSha256: createHash('sha256').update(lock).digest('hex') }],
  });
  const dist = join(root, 'dist');
  assert.deepEqual((await readdir(dist)).sort(), ['README.md', 'collections', 'provenance.json']);
  assert.deepEqual(await readFile(join(dist, 'README.md')), await readFile(join(root, 'docs/consuming.md')));
  assert.deepEqual(JSON.parse(await readFile(join(dist, 'provenance.json'), 'utf8')), provenance);
  assert.deepEqual(await readFile(join(dist, 'collections/base/rules/policy.md')), rule);
  assert.equal(await readFile(join(dist, 'collections/base/rules/policy.md.LICENSE'), 'utf8'), 'License sidecar\n');
  assert.equal(await readFile(join(dist, 'collections/base/rules/LICENSE'), 'utf8'), 'Collection license\n');
  assert.deepEqual(await readFile(join(dist, 'collections/base/skills/local/SKILL.md')), skill);
  assert.deepEqual(await readFile(join(dist, 'collections/base/skills/local/assets/data.bin')), binary);
  assert.equal(await readFile(join(dist, 'collections/base/skills/local/agents/openai.yaml'), 'utf8'), 'display_name: Exact metadata\n');
  assert.equal((await lstat(join(dist, 'collections/base/skills/local/scripts/run.sh'))).mode & 0o777, 0o751);
  assert.equal((await lstat(join(dist, 'collections/base/skills/remote/scripts/run.sh'))).mode & 0o111, 0o111);
  assert.equal(await readFile(join(dist, 'collections/base/skills/build/SKILL.md'), 'utf8'), 'Build workflow skill\n');
  const first = await snapshot(dist);
  await assembleDist({ root, source });
  assert.deepEqual(await snapshot(dist), first, 'Unchanged inputs yield identical bytes and modes');
});

test('local identities replace whole curated skills while collection namespaces remain distinct', async (t) => {
  const root = await fixture(t);
  await collection(root, 'zeta', { skills: ['shared'], rules: ['shared'] });
  await collection(root, 'alpha');
  await put(root, 'src/zeta/.rulesync/skills/.curated/shared/SKILL.md', 'Curated skill\n');
  await put(root, 'src/zeta/.rulesync/skills/.curated/shared/remote-only.txt', 'Must not survive override\n');
  await put(root, 'src/zeta/.rulesync/skills/shared/SKILL.md', 'Local skill\n');
  await put(root, 'src/zeta/.rulesync/skills/shared/local-only.txt', 'Local companion\n');
  await put(root, 'src/zeta/.rulesync/rules/.curated/shared.md', 'Curated rule\n');
  await put(root, 'src/zeta/.rulesync/rules/shared.md', 'Local rule\n');
  await put(root, 'src/alpha/.rulesync/skills/shared/SKILL.md', 'Other collection\n');

  const provenance = await assembleDist({ root, source });
  assert.deepEqual(provenance.collections.map(({ name }) => name), ['alpha', 'zeta']);
  const target = join(root, 'dist/collections');
  assert.equal(await readFile(join(target, 'zeta/skills/shared/SKILL.md'), 'utf8'), 'Local skill\n');
  assert.equal(await readFile(join(target, 'zeta/skills/shared/local-only.txt'), 'utf8'), 'Local companion\n');
  await missing(join(target, 'zeta/skills/shared/remote-only.txt'));
  assert.equal(await readFile(join(target, 'zeta/rules/shared.md'), 'utf8'), 'Local rule\n');
  assert.equal(await readFile(join(target, 'alpha/skills/shared/SKILL.md'), 'utf8'), 'Other collection\n');
});

test('rebuilding removes deleted rules, companions, and entire collections from dist', async (t) => {
  const root = await fixture(t);
  await collection(root, 'base');
  await collection(root, 'removed');
  await put(root, 'src/base/.rulesync/rules/deleted.md', 'Delete me\n');
  await put(root, 'src/base/.rulesync/skills/kept/SKILL.md', 'Keep me\n');
  await put(root, 'src/base/.rulesync/skills/kept/stale.txt', 'Delete companion\n');
  await assembleDist({ root, source });
  await rm(join(root, 'src/base/.rulesync/rules/deleted.md'));
  await rm(join(root, 'src/base/.rulesync/skills/kept/stale.txt'));
  await rm(join(root, 'src/removed'), { recursive: true });
  await assembleDist({ root, source });
  await missing(join(root, 'dist/collections/base/rules/deleted.md'));
  await missing(join(root, 'dist/collections/base/skills/kept/stale.txt'));
  await missing(join(root, 'dist/collections/removed'));
  assert.equal(await readFile(join(root, 'dist/collections/base/skills/kept/SKILL.md'), 'utf8'), 'Keep me\n');
});

test('cached curated artifacts not in the native lock inventory are excluded', async (t) => {
  const root = await fixture(t);
  await collection(root, 'base', { skills: ['selected'], rules: ['selected'] });
  await put(root, 'src/base/.rulesync/skills/.curated/selected/SKILL.md', 'Selected skill\n');
  await put(root, 'src/base/.rulesync/skills/.curated/obsolete/SKILL.md', 'Stale dependency\n');
  await put(root, 'src/base/.rulesync/rules/.curated/selected.md', 'Selected rule\n');
  await put(root, 'src/base/.rulesync/rules/.curated/obsolete.md', 'Stale rule\n');
  await assembleDist({ root, source });
  await missing(join(root, 'dist/collections/base/skills/obsolete'));
  await missing(join(root, 'dist/collections/base/rules/obsolete.md'));
  await collection(root, 'base');
  await assembleDist({ root, source });
  assert.deepEqual(await readdir(join(root, 'dist/collections/base/skills')), []);
  assert.deepEqual(await readdir(join(root, 'dist/collections/base/rules')), []);
});

test('only canonical inputs enter output while selected skills retain dotfiles, configs, templates and binary fixtures', async (t) => {
  const root = await fixture(t);
  await collection(root, 'base', { skills: ['remote'] });
  await put(root, '.env', 'ROOT_SECRET');
  await put(root, 'src/base/personal-notes.md', 'PERSONAL_SOURCE');
  await put(root, 'src/base/.rulesync/config.json', 'PRODUCER_CONFIG');
  const companions = [
    '.github/workflows/template.yml', 'build/fixture.txt', 'dist/fixture.bin',
    'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'rulesync.jsonc',
    'rulesync.lock', '.env.example', '.env.production.example', 'fixture.key',
    'fixture.pem', '.hidden/data.bin',
  ];
  const expectedFiles = ['README.md', 'provenance.json'];
  for (const [input, output] of [['valid', 'valid'], ['.curated/remote', 'remote']]) {
    await put(root, `src/base/.rulesync/skills/${input}/SKILL.md`, 'Valid skill\n');
    expectedFiles.push(`collections/base/skills/${output}/SKILL.md`);
    for (const file of companions) {
      const content = Buffer.concat([Buffer.from(`Fixture:${file}\n`), Buffer.from([0, 255, 13, 10])]);
      await put(root, `src/base/.rulesync/skills/${input}/${file}`, content);
      expectedFiles.push(`collections/base/skills/${output}/${file}`);
    }
  }
  await assembleDist({ root, source });
  const files = await snapshot(join(root, 'dist'));
  assert.deepEqual(Object.keys(files).sort(), expectedFiles.sort());
  for (const output of ['valid', 'remote']) {
    for (const file of companions) {
      const expected = Buffer.concat([Buffer.from(`Fixture:${file}\n`), Buffer.from([0, 255, 13, 10])]);
      assert.deepEqual(await readFile(join(root, 'dist/collections/base/skills', output, file)), expected);
    }
  }
});

test('credential, VCS and cache stores fail closed instead of silently truncating a selected skill', async (t) => {
  for (const store of ['.env', '.ssh/id_ed25519', '.git/config', '.cache/data', 'node_modules/dependency/index.js']) {
    await t.test(store, async (t) => {
      const root = await fixture(t);
      await collection(root);
      await put(root, 'src/base/.rulesync/skills/valid/SKILL.md', 'Valid skill\n');
      await assembleDist({ root, source });
      const previous = await snapshot(join(root, 'dist'));
      await put(root, `src/base/.rulesync/skills/valid/${store}`, 'LOCAL_STORE_SECRET');
      await assert.rejects(assembleDist({ root, source }), /Forbidden credential, VCS, or cache store:.*remove.*canonical inputs/);
      assert.deepEqual(await snapshot(join(root, 'dist')), previous);
    });
  }
});

test('assembly failures leave all previous artifact bytes intact and remove staging', async (t) => {
  const root = await fixture(t);
  await collection(root);
  await put(root, 'src/base/.rulesync/skills/safe/SKILL.md', 'Previous skill\n');
  await assembleDist({ root, source });
  const previous = await snapshot(join(root, 'dist'));
  await put(root, 'src/base/.rulesync/skills/safe/SKILL.md', 'Unpublished replacement\n');
  await symlink(join(root, '.env'), join(root, 'src/base/.rulesync/skills/safe/linked-secret'));
  await put(root, '.env', 'DO NOT PUBLISH');
  await assert.rejects(assembleDist({ root, source }), /Symlink/);
  assert.deepEqual(await snapshot(join(root, 'dist')), previous);
  assert.deepEqual((await readdir(root)).filter((name) => name.startsWith('.agentic-build-')), []);
});

test('linked canonical ancestors and a linked dist cannot redirect reads or writes', async (t) => {
  const root = await fixture(t);
  const outside = await fixture(t);
  await collection(root);
  await put(outside, 'skills/secret/SKILL.md', 'OUTSIDE_SECRET');
  await mkdir(join(root, 'src/base/.rulesync'), { recursive: true });
  await symlink(join(outside, 'skills'), join(root, 'src/base/.rulesync/skills'), 'dir');
  await assert.rejects(assembleDist({ root, source }), /Symlink/);
  await missing(join(root, 'dist'));
  await rm(join(root, 'src/base/.rulesync/skills'));
  await put(outside, 'artifact/keep.txt', 'OUTSIDE_ARTIFACT');
  await symlink(join(outside, 'artifact'), join(root, 'dist'), 'dir');
  await assert.rejects(assembleDist({ root, source }), /Refusing to replace/);
  assert.equal(await readFile(join(outside, 'artifact/keep.txt'), 'utf8'), 'OUTSIDE_ARTIFACT');
  assert.deepEqual(await readdir(join(outside, 'artifact')), ['keep.txt']);
});

async function nativeFixture(t) {
  const root = await fixture(t);
  await collection(root);
  await put(root, '.gitignore', '/node_modules/\n/dist/\n/.test-home/\n');
  await mkdir(join(root, 'node_modules'), { recursive: true });
  await symlink(installedPackage, join(root, 'node_modules/rulesync'), 'dir');
  const env = nativeEnvironment(root);
  await exec('git', ['init', '--quiet'], { cwd: root, env });
  await exec('git', ['add', '.'], { cwd: root, env });
  await exec('git', ['-c', 'user.name=Build Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--quiet', '-m', 'Fixture source'], { cwd: root, env });
  return root;
}

async function cli(root, entrypoint = script) {
  return exec(process.execPath, [entrypoint], {
    cwd: root,
    env: nativeEnvironment(root),
    maxBuffer: 1024 * 1024,
  });
}

test('the CLI uses the actual pinned installer and records tracked, untracked and ignored source state honestly', async (t) => {
  const root = await nativeFixture(t);
  await cli(root);
  const manifest = async () => JSON.parse(await readFile(join(root, 'dist/provenance.json'), 'utf8'));
  const commit = (await exec('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim();
  assert.deepEqual((await manifest()).source, { ...source, commit });
  await put(root, 'ignored.txt', 'Ignored source');
  await put(root, '.git/info/exclude', 'ignored.txt\n');
  await cli(root);
  assert.equal((await manifest()).source.dirty, false);
  await put(root, 'untracked.txt', 'Untracked source');
  await cli(root);
  assert.equal((await manifest()).source.dirty, true);
  await rm(join(root, 'untracked.txt'));
  await put(root, 'docs/consuming.md', 'Tracked modification\n');
  await cli(root);
  assert.equal((await manifest()).source.dirty, true);
  assert.equal((await manifest()).rulesyncVersion, '43.6.0');
});

test('a real frozen-install failure retains the previous artifact instead of publishing a partial build', async (t) => {
  const root = await nativeFixture(t);
  await cli(root);
  const previous = await snapshot(join(root, 'dist'));
  await put(root, 'src/base/rulesync.jsonc', JSON.stringify({ sources: [{ source: `fixture/missing@${'b'.repeat(40)}:skills`, skills: ['missing'] }] }));
  await assert.rejects(cli(root), (error) => {
    assert.match(error.stderr + error.stdout, /[Ff]rozen|lockfile/);
    return true;
  });
  assert.deepEqual(await snapshot(join(root, 'dist')), previous);
});

test('a removed source retained by a frozen native lock fails closed without replacing dist', async (t) => {
  const root = await nativeFixture(t);
  await cli(root);
  const previous = await snapshot(join(root, 'dist'));
  await collection(root, 'base', { skills: ['obsolete'] });
  await put(root, 'src/base/.rulesync/skills/.curated/obsolete/SKILL.md', 'Obsolete dependency\n');
  // Source removal is incomplete until the native non-frozen install reconciles
  // its lock; --frozen alone intentionally retains this stale source entry.
  await put(root, 'src/base/rulesync.jsonc', '{ "sources": [] }\n');
  await assert.rejects(cli(root), (error) => {
    assert.match(error.stderr, /Stale or unsupported lock source.*reconcile/);
    return true;
  });
  assert.deepEqual(await snapshot(join(root, 'dist')), previous);
});

test('JSONC collection comments and trailing commas do not change canonical bytes', async (t) => {
  const root = await fixture(t);
  await collection(root);
  await put(root, 'src/base/rulesync.jsonc', '{\n  // Native JSONC source manifest\n  "sources": [],\n}\n');
  const rule = '---\narbitrary: "https://example.invalid/#keep"\n---\nExact bytes\n';
  await put(root, 'src/base/.rulesync/rules/policy.md', rule);
  await assembleDist({ root, source });
  assert.equal(await readFile(join(root, 'dist/collections/base/rules/policy.md'), 'utf8'), rule);
});

test('unsafe lock paths cannot read or publish files outside canonical roots', async (t) => {
  const root = await fixture(t);
  await collection(root, 'base', { rules: ['../../credentials'] });
  await put(root, 'src/base/.rulesync/credentials.md', 'SOURCE_SECRET');
  await assert.rejects(assembleDist({ root, source }), /Unsafe locked rule/);
  await missing(join(root, 'dist'));
  assert.equal(await readFile(join(root, 'src/base/.rulesync/credentials.md'), 'utf8'), 'SOURCE_SECRET');
});

test('unsupported inventory in the native npm lock fails without replacing dist', async (t) => {
  const root = await fixture(t);
  await collection(root);
  await assembleDist({ root, source });
  const previous = await snapshot(join(root, 'dist'));
  await put(root, 'src/base/rulesync-npm.lock.json', JSON.stringify({
    lockfileVersion: 1,
    sources: { 'fixture-package': { version: '1.0.0', skills: {} } },
  }));
  await assert.rejects(assembleDist({ root, source }), /Unsupported npm lock inventory/);
  assert.deepEqual(await snapshot(join(root, 'dist')), previous);
});

test('the build CLI executes through a symlinked entrypoint', async (t) => {
  const root = await nativeFixture(t);
  const linked = join(root, 'build-link.mjs');
  await put(root, '.git/info/exclude', '/build-link.mjs\n');
  await symlink(script, linked);
  await put(root, 'src/base/.rulesync/rules/linked.md', 'Canonical linked entrypoint content\n');
  await cli(root, linked);
  assert.equal(await readFile(join(root, 'dist/collections/base/rules/linked.md'), 'utf8'), 'Canonical linked entrypoint content\n');
});
