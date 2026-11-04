import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const publisher = fileURLToPath(new URL('../scripts/publish.mjs', import.meta.url));
const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null';
const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => (
  !/^GIT_/i.test(key) && !['ARTIFACT_TOKEN', 'GH_TOKEN', 'GITHUB_TOKEN', 'GITHUB_REPOSITORY'].includes(key)
)));
Object.assign(environment, { GIT_CONFIG_GLOBAL: nullDevice, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' });

function gitResult(cwd, args, encoding = 'utf8') {
  return spawnSync('git', ['-c', 'user.name=Publisher fixture', '-c', 'user.email=fixture@example.invalid',
    '-c', `core.hooksPath=${nullDevice}`, '-c', 'commit.gpgsign=false', ...args], {
    cwd, env: environment, encoding,
  });
}

function git(cwd, args, encoding = 'utf8') {
  const result = gitResult(cwd, args, encoding);
  assert.equal(result.status, 0, `Git ${args.join(' ')} failed: ${result.stderr}`);
  return encoding ? result.stdout.trimEnd() : result.stdout;
}

function put(root, name, contents) {
  const path = join(root, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'agentic-publisher-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'source');
  const target = join(root, 'artifact.git');
  mkdirSync(join(source, 'scripts'), { recursive: true });
  copyFileSync(publisher, join(source, 'scripts', 'publish.mjs'));
  put(source, '.gitignore', '/dist/\n');
  put(source, 'source.txt', 'Initial source\n');
  git(source, ['init', '--initial-branch=main']);
  git(source, ['remote', 'add', 'origin', 'https://github.com/example/agentic-src.git']);
  git(source, ['add', '.']);
  git(source, ['commit', '-m', 'Initial source']);
  git(root, ['init', '--bare', '--initial-branch=main', target]);
  return { root, source, target };
}

const initialFiles = {
  'collections/base/rules/default.md': '# Initial rule\n',
  'collections/base/skills/helper/SKILL.md': '# Helper\n',
  'collections/base/skills/helper/run.sh': '#!/bin/sh\nprintf "helper\\n"\n',
};

function artifact(f, { files = initialFiles, source = {}, schemaVersion = 1, extra = {} } = {}) {
  const dist = join(f.source, 'dist');
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(join(dist, 'collections', 'base', 'rules'), { recursive: true });
  mkdirSync(join(dist, 'collections', 'base', 'skills'), { recursive: true });
  put(dist, 'README.md', '# Published collection\n');
  put(dist, 'provenance.json', `${JSON.stringify({
    schemaVersion,
    source: { repository: 'example/agentic-src', commit: git(f.source, ['rev-parse', 'HEAD']), dirty: false, ...source },
    rulesyncVersion: '43.6.0',
    collections: [{ name: 'base', lockSha256: 'a'.repeat(64) }],
    ...extra,
  }, null, 2)}\n`);
  for (const [name, contents] of Object.entries(files)) {
    put(dist, name, contents);
    if (name.endsWith('.sh')) chmodSync(join(dist, name), 0o755);
  }
  return dist;
}

function publish(f, { repository = pathToFileURL(f.target).href, tag } = {}) {
  return spawnSync(process.execPath, [join(f.source, 'scripts', 'publish.mjs'), '--repository', repository,
    ...(tag ? ['--tag', tag] : [])], { cwd: f.root, env: environment, encoding: 'utf8' });
}

function succeeds(result) {
  assert.equal(result.status, 0, result.stderr);
}

function fails(result, pattern) {
  assert.notEqual(result.status, 0, result.stdout);
  assert.match(result.stderr, pattern);
}

function commitSource(f, contents = 'Updated source\n') {
  put(f.source, 'source.txt', contents);
  git(f.source, ['add', 'source.txt']);
  git(f.source, ['commit', '-m', contents.trim()]);
}

function ref(f, name = 'refs/heads/main') {
  return git(f.target, ['rev-parse', name]);
}

test('publishes an exact snapshot to main in an empty bare repository', (t) => {
  const f = fixture(t);
  const payload = Buffer.from([0, 255, 13, 10, 1]);
  const files = {
    ...initialFiles,
    'collections/base/skills/helper/payload.bin': payload,
    'collections/base/skills/helper/.gitattributes': '*.bin text eol=lf\n',
  };
  const dist = artifact(f, { files });
  const sourceConfig = readFileSync(join(f.source, '.git', 'config'));
  succeeds(publish(f));
  assert.deepEqual(git(f.target, ['ls-tree', '-r', '--name-only', 'main']).split('\n'), [
    'README.md', ...Object.keys(files), 'provenance.json',
  ].sort());
  for (const name of ['README.md', 'provenance.json', ...Object.keys(files)]) {
    assert.deepEqual(git(f.target, ['show', `main:${name}`], null), readFileSync(join(dist, name)));
  }
  assert.match(git(f.target, ['ls-tree', 'main', 'collections/base/skills/helper/run.sh']), /^100755 blob /);
  assert.equal(git(f.target, ['rev-list', '--count', 'main']), '1');
  assert.equal(git(f.target, ['show', '-s', '--format=%an <%ae>', 'main']),
    'agentic-artifact[bot] <agentic-artifact[bot]@users.noreply.github.com>');
  assert.equal(git(f.source, ['status', '--porcelain']), '');
  assert.deepEqual(readFileSync(join(f.source, '.git', 'config')), sourceConfig);
});

test('publishing identical content is a no-op without another commit', (t) => {
  const f = fixture(t);
  artifact(f);
  succeeds(publish(f));
  const before = ref(f);
  const result = publish(f);
  succeeds(result);
  assert.match(result.stdout, /already matches.*nothing to publish/);
  assert.equal(ref(f), before);
  assert.equal(git(f.target, ['rev-list', '--count', 'main']), '1');
});

test('empty collection directories need no synthetic files for publication or idempotence', (t) => {
  const f = fixture(t);
  artifact(f, { files: {} });
  succeeds(publish(f));
  const before = ref(f);
  assert.deepEqual(git(f.target, ['ls-tree', '-r', '--name-only', 'main']).split('\n'), ['README.md', 'provenance.json']);
  succeeds(publish(f));
  assert.equal(ref(f), before);
});

test('main publication updates content, removes stale files, and retains history', (t) => {
  const f = fixture(t);
  artifact(f);
  succeeds(publish(f));
  const before = ref(f);
  commitSource(f);
  artifact(f, { files: {
    'collections/base/rules/replacement.md': '# Replacement\n',
    'collections/base/skills/new/SKILL.md': '# New skill\n',
  } });
  succeeds(publish(f));
  assert.notEqual(ref(f), before);
  assert.equal(git(f.target, ['rev-parse', 'main^']), before);
  assert.equal(git(f.target, ['rev-list', '--count', 'main']), '2');
  assert.equal(git(f.target, ['show', 'main:collections/base/rules/replacement.md']), '# Replacement');
  assert.deepEqual(git(f.target, ['ls-tree', '-r', '--name-only', 'main']).split('\n'), [
    'README.md', 'collections/base/rules/replacement.md', 'collections/base/skills/new/SKILL.md', 'provenance.json',
  ]);
  assert.equal(git(f.target, ['show', `${before}:collections/base/rules/default.md`]), '# Initial rule');
  assert.equal(git(f.source, ['status', '--porcelain']), '');
});

test('a release publishes its own immutable snapshot without advancing main', (t) => {
  const f = fixture(t);
  artifact(f);
  succeeds(publish(f));
  const main = ref(f);
  commitSource(f, 'Release source\n');
  git(f.source, ['tag', 'v1.2.3']);
  artifact(f, { files: { 'collections/base/rules/release.md': '# Release\n' } });
  succeeds(publish(f, { tag: 'v1.2.3' }));
  const release = ref(f, 'refs/tags/v1.2.3');
  assert.notEqual(release, main);
  assert.equal(ref(f), main);
  assert.equal(git(f.target, ['rev-parse', 'v1.2.3^']), main);
  assert.equal(git(f.target, ['show', 'v1.2.3:collections/base/rules/release.md']), '# Release');
  assert.equal(git(f.target, ['show', 'main:collections/base/rules/default.md']), '# Initial rule');
  const repeated = publish(f, { tag: 'v1.2.3' });
  succeeds(repeated);
  assert.match(repeated.stdout, /already matches/);
  assert.equal(ref(f, 'refs/tags/v1.2.3'), release);
  assert.equal(ref(f), main);
  artifact(f, { files: { 'collections/base/rules/release.md': '# Conflicting release\n' } });
  fails(publish(f, { tag: 'v1.2.3' }), /tag v1\.2\.3 is immutable/);
  assert.equal(ref(f, 'refs/tags/v1.2.3'), release);
  assert.equal(ref(f), main);
});

test('a release can initialize an empty repository without creating main', (t) => {
  const f = fixture(t);
  git(f.source, ['tag', '-a', 'v0.1.0', '-m', 'Source release']);
  artifact(f);
  succeeds(publish(f, { tag: 'v0.1.0' }));
  const release = ref(f, 'refs/tags/v0.1.0');
  assert.notEqual(gitResult(f.target, ['show-ref', '--verify', 'refs/heads/main']).status, 0);
  succeeds(publish(f, { tag: 'v0.1.0' }));
  assert.equal(ref(f, 'refs/tags/v0.1.0'), release);
  succeeds(publish(f));
  assert.equal(ref(f), release);
});

test('rejects dirty provenance and an actually dirty source before publication', (t) => {
  const f = fixture(t);
  artifact(f, { source: { dirty: true } });
  fails(publish(f), /dirty source provenance/);
  assert.equal(git(f.target, ['for-each-ref']), '');
  artifact(f);
  put(f.source, 'source.txt', 'Uncommitted source\n');
  fails(publish(f), /Source repository is dirty/);
  assert.equal(git(f.target, ['for-each-ref']), '');
  assert.equal(readFileSync(join(f.source, 'source.txt'), 'utf8'), 'Uncommitted source\n');
});

test('rejects untracked source changes as dirty', (t) => {
  const f = fixture(t);
  artifact(f);
  put(f.source, 'untracked.txt', 'Not committed\n');
  fails(publish(f), /Source repository is dirty/);
  assert.equal(git(f.target, ['for-each-ref']), '');
});

test('rejects unsupported provenance and a stale source commit', (t) => {
  const f = fixture(t);
  artifact(f, { schemaVersion: 2 });
  fails(publish(f), /unsupported artifact provenance/);
  artifact(f, { extra: { collections: [{ name: 'base', lockSha256: 'not-a-digest' }] } });
  fails(publish(f), /unsupported collection provenance/);
  artifact(f);
  commitSource(f);
  fails(publish(f), /provenance commit does not match source HEAD/);
  assert.equal(git(f.target, ['for-each-ref']), '');
});

test('refuses an unrelated nonempty target without modifying it', (t) => {
  const f = fixture(t);
  git(f.source, ['push', f.target, 'HEAD:refs/heads/main']);
  const before = ref(f);
  artifact(f);
  fails(publish(f), /unrelated target repository.*provenance ownership/);
  assert.equal(ref(f), before);
  assert.equal(git(f.target, ['show', 'main:source.txt']), 'Initial source');
  assert.equal(git(f.target, ['rev-list', '--count', 'main']), '1');
});

test('refuses artifact ownership belonging to a different source repository', (t) => {
  const f = fixture(t);
  artifact(f);
  succeeds(publish(f));
  const before = ref(f);
  artifact(f, { source: { repository: 'another/source' } });
  fails(publish(f), /unrelated target repository owned by another source repository/);
  assert.equal(ref(f), before);
});

test('guards the source checkout, its Git directory, its local origin, and its GitHub identity', (t) => {
  const f = fixture(t);
  artifact(f);
  for (const path of [f.source, join(f.source, '.git')]) {
    fails(publish(f, { repository: pathToFileURL(path).href }), /must differ from the source repository/);
  }
  fails(publish(f, { repository: 'EXAMPLE/AGENTIC-SRC' }), /must differ from the source repository/);
  artifact(f, { source: { repository: 'different/source' } });
  fails(publish(f, { repository: 'EXAMPLE/AGENTIC-SRC' }), /must differ from the source repository/);
  artifact(f);
  const alias = join(f.root, 'source-alias');
  symlinkSync(f.source, alias, 'dir');
  fails(publish(f, { repository: pathToFileURL(alias).href }), /must differ from the source repository/);
  const origin = join(f.root, 'source-origin.git');
  git(f.root, ['init', '--bare', origin]);
  git(f.source, ['remote', 'set-url', 'origin', pathToFileURL(origin).href]);
  fails(publish(f, { repository: pathToFileURL(origin).href }), /must differ from the source repository/);
  assert.equal(git(f.target, ['for-each-ref']), '');
  assert.equal(git(f.source, ['show', 'HEAD:source.txt']), 'Initial source');
});

test('requires a matching committed source release tag', (t) => {
  const f = fixture(t);
  artifact(f);
  fails(publish(f, { tag: 'v9.0.0' }), /tag must exist.*point to source HEAD/);
  git(f.source, ['tag', 'v9.0.0']);
  commitSource(f);
  artifact(f);
  fails(publish(f, { tag: 'v9.0.0' }), /tag must exist.*point to source HEAD/);
  assert.equal(git(f.target, ['for-each-ref']), '');
});

test('refuses Git metadata and symbolic links in artifact content', (t) => {
  const f = fixture(t);
  let dist = artifact(f);
  put(dist, 'collections/base/skills/helper/.git/config', '[credential]\n');
  fails(publish(f), /must not contain \.git/);
  dist = artifact(f);
  symlinkSync(join(f.source, 'source.txt'), join(dist, 'collections/base/skills/helper/source-link'));
  fails(publish(f), /only regular files and directories/);
  assert.equal(git(f.target, ['for-each-ref']), '');
});

test('refuses a nonempty unrelated target containing only custom refs', (t) => {
  const f = fixture(t);
  git(f.source, ['push', f.target, 'HEAD:refs/notes/unrelated']);
  const before = ref(f, 'refs/notes/unrelated');
  artifact(f);
  fails(publish(f), /unrelated target repository.*provenance ownership/);
  assert.equal(ref(f, 'refs/notes/unrelated'), before);
  assert.notEqual(gitResult(f.target, ['show-ref', '--verify', 'refs/heads/main']).status, 0);
});

test('publication executes through a symlinked source directory', (t) => {
  const f = fixture(t);
  artifact(f);
  const linkedSource = join(f.root, 'source-link');
  symlinkSync(f.source, linkedSource, 'dir');
  const result = spawnSync(process.execPath, [join(linkedSource, 'scripts', 'publish.mjs'),
    '--repository', pathToFileURL(f.target).href], { cwd: f.root, env: environment, encoding: 'utf8' });
  succeeds(result);
  assert.equal(git(f.target, ['show', 'main:collections/base/rules/default.md']), '# Initial rule');
});
