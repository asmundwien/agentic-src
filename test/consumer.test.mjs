import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { assembleDist } from '../scripts/build.mjs';
import { publishArtifact } from '../scripts/publish.mjs';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const rulesyncCli = path.join(repositoryRoot, 'node_modules/rulesync/dist/cli/index.js');

async function put(root, relative, content) {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
}

function run(command, args, cwd, env) {
  return execFileSync(command, args, {
    cwd, env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  });
}

test('published canonical collections install and reconcile through native Rulesync', async (t) => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'agentic-consumer-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const source = path.join(temporary, 'source');
  const consumer = path.join(temporary, 'consumer');
  const home = path.join(temporary, 'home');
  const artifact = path.join(temporary, 'artifact.git');
  await Promise.all([source, consumer, home].map((directory) => mkdir(directory)));
  const env = {
    ...process.env,
    HOME: home,
    XDG_CONFIG_HOME: path.join(home, 'config'),
    XDG_CACHE_HOME: path.join(home, 'cache'),
    XDG_DATA_HOME: path.join(home, 'data'),
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: path.join(home, '.gitconfig'),
    GIT_TERMINAL_PROMPT: '0',
  };
  const git = (args, cwd = source) => run('git', args, cwd, env).trim();
  const native = (...args) => run(process.execPath, [rulesyncCli, ...args], consumer, env);

  await put(source, '.gitignore', 'dist/\n');
  await put(source, 'docs/consuming.md', '# Disposable canonical distribution\n');
  for (const name of ['base', 'testing']) {
    await put(source, `src/${name}/rulesync.jsonc`, '{"sources":[]}\n');
    await put(source, `src/${name}/rulesync.lock`, '{"lockfileVersion":1,"sources":{}}\n');
  }
  await put(source, 'src/base/.rulesync/rules/focus.md',
    '---\ndescription: Fixture startup guidance\nroot: false\nglobs: ["**"]\n---\nApply fixture guidance.\n');
  await put(source, 'src/base/.rulesync/skills/fixture-guide/SKILL.md',
    '---\nname: fixture-guide\ndescription: Fixture guide\n---\nRead the fixture guide.\n');
  const canonicalSkill = '---\nname: fixture-testing\ndescription: Fixture testing\ncodexcli:\n  interface:\n    display_name: Canonical fixture\n---\nRead references/method.md.\n';
  await put(source, 'src/testing/.rulesync/skills/fixture-testing/SKILL.md', canonicalSkill);
  await put(source, 'src/testing/.rulesync/skills/fixture-testing/references/method.md', 'Use the canonical fixture method.\n');
  await put(source, 'src/testing/.rulesync/skills/fixture-testing/scripts/check.sh', '#!/bin/sh\nprintf "fixture-ok\\n"\n');
  await chmod(path.join(source, 'src/testing/.rulesync/skills/fixture-testing/scripts/check.sh'), 0o755);
  git(['init', '--initial-branch=main']);
  git(['remote', 'add', 'origin', 'https://github.com/example/agentic-src.git']);
  git(['add', '.']);
  git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'Canonical fixture']);
  const commit = git(['rev-parse', 'HEAD']);
  await assembleDist({ root: source, source: { repository: 'example/agentic-src', commit, dirty: false } });

  // Actions upload/download does not preserve file modes without this tar boundary.
  const archive = path.join(temporary, 'agentic.tar.gz');
  run('tar', ['-C', path.join(source, 'dist'), '-czf', archive, '.'], temporary, env);
  await rm(path.join(source, 'dist'), { recursive: true });
  await mkdir(path.join(source, 'dist'));
  run('tar', ['-xzf', archive, '-C', path.join(source, 'dist')], temporary, env);
  assert.equal(await readFile(path.join(source, 'dist/collections/testing/skills/fixture-testing/SKILL.md'), 'utf8'), canonicalSkill);
  assert.ok((await stat(path.join(source, 'dist/collections/testing/skills/fixture-testing/scripts/check.sh'))).mode & 0o111);

  git(['init', '--bare', '--initial-branch=main', artifact]);
  publishArtifact({ root: source, repository: pathToFileURL(artifact).href });
  const location = pathToFileURL(artifact).href;
  const sources = [
    { source: location, transport: 'git', ref: 'main', path: 'collections/base/skills', rulesPath: 'collections/base/rules', rules: ['*'], skills: ['*'] },
    { source: location, transport: 'git', ref: 'main', path: 'collections/testing/skills', skills: ['*'] },
  ];
  const config = { targets: ['omp', 'claudecode'], features: ['rules', 'skills'], sources };
  await put(consumer, 'rulesync.jsonc', `${JSON.stringify(config, null, 2)}\n`);
  native('install');
  native('install', '--frozen');
  native('generate', '--delete', '--dry-run');
  native('generate', '--delete');

  for (const target of ['.omp', '.claude']) {
    assert.match(await readFile(path.join(consumer, target, 'rules/focus.md'), 'utf8'), /Apply fixture guidance\./);
    assert.equal(await readFile(path.join(consumer, target, 'skills/fixture-testing/references/method.md'), 'utf8'), 'Use the canonical fixture method.\n');
    const script = path.join(consumer, target, 'skills/fixture-testing/scripts/check.sh');
    assert.ok((await stat(script)).mode & 0o111);
    assert.equal(run(script, [], consumer, env), 'fixture-ok\n');
  }
  assert.match(await readFile(path.join(consumer, '.omp/rules/focus.md'), 'utf8'), /alwaysApply: true/);

  native('generate', '--global', '--delete', '--dry-run');
  native('generate', '--global', '--delete');
  assert.match(await readFile(path.join(home, '.omp/agent/rules/focus.md'), 'utf8'), /alwaysApply: true/);
  assert.equal(await readFile(path.join(home, '.omp/agent/skills/fixture-testing/references/method.md'), 'utf8'), 'Use the canonical fixture method.\n');

  config.sources = sources.slice(0, 1);
  await put(consumer, 'rulesync.jsonc', `${JSON.stringify(config, null, 2)}\n`);
  native('install');
  native('generate', '--delete', '--dry-run');
  native('generate', '--delete');
  for (const target of ['.omp', '.claude']) {
    await assert.rejects(stat(path.join(consumer, target, 'skills/fixture-testing')), { code: 'ENOENT' });
    assert.match(await readFile(path.join(consumer, target, 'skills/fixture-guide/SKILL.md'), 'utf8'), /Read the fixture guide\./);
    assert.match(await readFile(path.join(consumer, target, 'rules/focus.md'), 'utf8'), /Apply fixture guidance\./);
  }
});
