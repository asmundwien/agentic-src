#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { cpSync, lstatSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultSourceRoot = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null';
const repositoryPattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\/[A-Za-z0-9_][A-Za-z0-9_.-]*$/;
const usage = 'Usage: node scripts/publish.mjs --repository <owner/repo|file:///absolute/bare.git> [--tag v1.2.3]';

function options(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!['--repository', '--tag'].includes(argument) || result[argument.slice(2)] !== undefined) {
      throw new Error(usage);
    }
    const value = argv[++index];
    if (!value || value.startsWith('--')) throw new Error(usage);
    result[argument.slice(2)] = value;
  }
  if (!result.repository) throw new Error(usage);
  return result;
}

function gitEnvironment(target) {
  const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => (
    !/^GIT_/i.test(key) && !['ARTIFACT_TOKEN', 'GH_TOKEN', 'GITHUB_TOKEN'].includes(key)
  )));
  const config = [
    ['credential.helper', ''],
    ['core.hooksPath', nullDevice],
    ['core.autocrlf', 'false'],
    ['core.fileMode', 'true'],
    ['http.followRedirects', 'false'],
  ];
  if (target?.github && process.env.ARTIFACT_TOKEN) {
    const authorization = Buffer.from(`x-access-token:${process.env.ARTIFACT_TOKEN}`).toString('base64');
    config.push([`http.${target.url}.extraheader`, `AUTHORIZATION: basic ${authorization}`]);
  }
  Object.assign(environment, {
    GIT_CONFIG_GLOBAL: nullDevice,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_COUNT: String(config.length),
    GIT_TERMINAL_PROMPT: '0',
    GIT_OPTIONAL_LOCKS: '0',
    GIT_ATTR_NOSYSTEM: '1',
  });
  for (const [index, [key, value]] of config.entries()) {
    environment[`GIT_CONFIG_KEY_${index}`] = key;
    environment[`GIT_CONFIG_VALUE_${index}`] = value;
  }
  return environment;
}

function git(args, cwd, { target, input, optional = false } = {}) {
  const result = spawnSync('git', args, {
    cwd,
    env: gitEnvironment(target),
    encoding: 'utf8',
    input,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) throw new Error(`Cannot run Git: ${result.error.message}`);
  if (result.status !== 0) {
    if (optional) return undefined;
    // Do not surface remote output: authentication failures must never disclose credentials.
    throw new Error(`Git ${args.find((argument) => !argument.startsWith('-')) ?? 'operation'} failed (exit ${result.status}).`);
  }
  return result.stdout.trimEnd();
}

function provenance(text, description) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(`${description} has invalid provenance JSON.`);
  }
  const source = value?.source;
  if (value?.schemaVersion !== 1 || !source || typeof source.repository !== 'string'
      || !repositoryPattern.test(source.repository) || typeof source.commit !== 'string'
      || !/^[a-f0-9]{40}$/i.test(source.commit) || typeof source.dirty !== 'boolean'
      || value.rulesyncVersion !== '43.6.0' || !Array.isArray(value.collections)) {
    throw new Error(`${description} has unsupported artifact provenance.`);
  }
  if (source.dirty) throw new Error(`${description} has dirty source provenance; publication is forbidden.`);
  const names = new Set();
  for (const collection of value.collections) {
    if (!collection || typeof collection.name !== 'string'
        || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(collection.name)
        || collection.name.toLowerCase() === '.git' || names.has(collection.name)
        || typeof collection.lockSha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(collection.lockSha256)) {
      throw new Error(`${description} has unsupported collection provenance.`);
    }
    names.add(collection.name);
  }
  return value;
}

function filesIn(directory, base = directory) {
  const files = [];
  for (const entry of readdirSync(directory).sort()) {
    if (entry.toLowerCase() === '.git') throw new Error('Artifact content must not contain .git.');
    const path = join(directory, entry);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() || (!stat.isFile() && !stat.isDirectory())) {
      throw new Error(`Artifact content must contain only regular files and directories: ${relative(base, path)}`);
    }
    if (stat.isDirectory()) files.push(...filesIn(path, base));
    else files.push({ path, name: relative(base, path).split(sep).join('/'), mode: stat.mode & 0o111 ? '100755' : '100644' });
  }
  return files;
}

function snapshot(directory, { checkout = false } = {}) {
  const root = readdirSync(directory).filter((name) => !(checkout && name === '.git')).sort();
  if (root.join('\0') !== ['README.md', 'collections', 'provenance.json'].join('\0')
      || !lstatSync(join(directory, 'README.md')).isFile()
      || !lstatSync(join(directory, 'provenance.json')).isFile()
      || !lstatSync(join(directory, 'collections')).isDirectory()) {
    throw new Error('Expected artifact root containing only README.md, provenance.json, and collections/.');
  }
  const value = provenance(readFileSync(join(directory, 'provenance.json'), 'utf8'), 'Artifact');
  const expected = value.collections.map(({ name }) => name).sort();
  const actual = readdirSync(join(directory, 'collections')).sort();
  if (expected.join('\0') !== actual.join('\0')) throw new Error('Artifact collections do not match provenance.');
  for (const name of actual) {
    const collection = join(directory, 'collections', name);
    if (!lstatSync(collection).isDirectory()) throw new Error(`Artifact collection ${name} is not a directory.`);
    for (const entry of readdirSync(collection)) {
      if (!['rules', 'skills'].includes(entry) || !lstatSync(join(collection, entry)).isDirectory()) {
        throw new Error(`Artifact collection ${name} may contain only rules/ and skills/ directories.`);
      }
    }
  }
  const files = [];
  for (const name of root) {
    const path = join(directory, name);
    if (lstatSync(path).isDirectory()) files.push(...filesIn(path, directory));
    else if (lstatSync(path).isSymbolicLink()) throw new Error('Artifact root must not contain symbolic links.');
    else files.push({ path, name, mode: lstatSync(path).mode & 0o111 ? '100755' : '100644' });
  }
  return { value, files };
}

function localRemotePath(url, sourceRoot) {
  try {
    if (url.startsWith('file:')) return realpathSync(fileURLToPath(url));
    if (!/^[A-Za-z][A-Za-z0-9+.-]*:/.test(url) && !url.includes(':')) {
      return realpathSync(resolve(sourceRoot, url));
    }
  } catch {
    // A missing/unavailable source remote cannot be the existing local target.
  }
  return undefined;
}

function githubRepository(url) {
  if (!url) return undefined;
  const scp = /^git@github\.com:(.+)$/i.exec(url);
  if (scp) return scp[1].replace(/\.git$/i, '').toLowerCase();
  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase() === 'github.com') {
      return parsed.pathname.slice(1).replace(/\.git$/i, '').toLowerCase();
    }
  } catch {
    // Local paths and other remote transports have no GitHub identity.
  }
  return undefined;
}

function targetRepository(repository, source, sourceRoot) {
  const origin = git(['remote', 'get-url', 'origin'], sourceRoot, { optional: true });
  if (repositoryPattern.test(repository)) {
    if (repository.replace(/\.git$/i, '').toLowerCase() === source.repository.replace(/\.git$/i, '').toLowerCase()
        || repository.replace(/\.git$/i, '').toLowerCase() === githubRepository(origin)) {
      throw new Error('Artifact target must differ from the source repository.');
    }
    return { url: `https://github.com/${repository}.git`, github: true, label: repository };
  }
  let url;
  try {
    url = new URL(repository);
  } catch {
    throw new Error('Repository must be owner/repo or a file:///absolute/bare.git URL.');
  }
  if (url.protocol !== 'file:' || url.host || url.search || url.hash) {
    throw new Error('Repository must be owner/repo or a file:///absolute/bare.git URL.');
  }
  const path = realpathSync(fileURLToPath(url));
  const sourceGit = realpathSync(resolve(sourceRoot, git(['rev-parse', '--git-common-dir'], sourceRoot)));
  if (path === sourceRoot || path === sourceGit || (origin && localRemotePath(origin, sourceRoot) === path)) {
    throw new Error('Artifact target must differ from the source repository.');
  }
  if (git(['rev-parse', '--is-bare-repository'], path, { optional: true }) !== 'true') {
    throw new Error('Local artifact target must be an existing bare Git repository.');
  }
  return { url: url.href, github: false, label: url.href };
}

function assertOwnership(checkout, refs, owner) {
  for (const ref of refs) {
    const text = git(['show', `${ref}:provenance.json`], checkout, { optional: true });
    if (text === undefined) throw new Error('Refusing unrelated target repository without artifact provenance ownership.');
    let existing;
    try {
      existing = provenance(text, 'Target repository');
    } catch (error) {
      throw new Error(`Refusing unrelated or unsupported target repository: ${error.message}`);
    }
    if (existing.source.repository.toLowerCase() !== owner.toLowerCase()) {
      throw new Error('Refusing unrelated target repository owned by another source repository.');
    }
  }
}

function stageSnapshot(checkout, files) {
  // Bypass attributes and clean filters: the artifact is an exact byte/mode snapshot.
  git(['read-tree', '--empty'], checkout);
  let index = '';
  for (let offset = 0; offset < files.length; offset += 128) {
    const batch = files.slice(offset, offset + 128);
    const hashes = git(['hash-object', '-w', '--no-filters', '--', ...batch.map(({ path }) => path)], checkout).split('\n');
    for (const [position, file] of batch.entries()) index += `${file.mode} ${hashes[position]}\t${file.name}\0`;
  }
  git(['update-index', '-z', '--index-info'], checkout, { input: index });
  return git(['write-tree'], checkout);
}

export function publishArtifact({ root = defaultSourceRoot, repository, tag }) {
  const sourceRoot = realpathSync(root);
  const dist = join(sourceRoot, 'dist');
  const artifact = snapshot(dist);
  if (realpathSync(git(['rev-parse', '--show-toplevel'], sourceRoot)) !== sourceRoot) {
    throw new Error('Publisher must live in the source Git repository root scripts/ directory.');
  }
  if (git(['status', '--porcelain=v1', '--untracked-files=normal', '--ignore-submodules=none'], sourceRoot)) {
    throw new Error('Source repository is dirty; publish only a clean committed source snapshot.');
  }
  const sourceCommit = git(['rev-parse', 'HEAD'], sourceRoot);
  if (sourceCommit.toLowerCase() !== artifact.value.source.commit.toLowerCase()) {
    throw new Error('Artifact provenance commit does not match source HEAD; rebuild before publishing.');
  }
  const target = targetRepository(repository, artifact.value.source, sourceRoot);
  if (tag !== undefined) {
    if (!tag.startsWith('v') || git(['check-ref-format', `refs/tags/${tag}`], sourceRoot, { optional: true }) === undefined) {
      throw new Error('Release tag must be a valid Git tag beginning with v.');
    }
    const taggedCommit = git(['rev-parse', '--verify', `refs/tags/${tag}^{commit}`], sourceRoot, { optional: true });
    if (taggedCommit !== sourceCommit) throw new Error('Release tag must exist in the source repository and point to source HEAD.');
  }
  const temporary = mkdtempSync(join(tmpdir(), 'agentic-publish-'));
  try {
    const checkout = join(temporary, 'artifact');
    git(['clone', '--no-checkout', '--no-local', '--', target.url, checkout], temporary, { target });
    // Include releases even when the target has tags but no branch yet.
    git(['fetch', '--no-tags', 'origin', 'refs/tags/*:refs/tags/*'], checkout, { target });
    const refs = git(['for-each-ref', '--format=%(refname)', 'refs/remotes/origin', 'refs/tags'], checkout)
      .split('\n').filter((ref) => ref && ref !== 'refs/remotes/origin/HEAD');
    if (refs.length === 0 && git(['ls-remote', '--refs', 'origin'], checkout, { target })) {
      throw new Error('Refusing unrelated target repository without artifact provenance ownership.');
    }
    assertOwnership(checkout, refs, artifact.value.source.repository);
    const main = refs.includes('refs/remotes/origin/main') ? 'refs/remotes/origin/main' : undefined;
    const existing = tag ? (refs.includes(`refs/tags/${tag}`) ? `refs/tags/${tag}` : undefined) : main;
    const base = existing ?? main ?? refs[0];
    if (base) git(['checkout', '--detach', base], checkout);
    else git(['symbolic-ref', 'HEAD', 'refs/heads/main'], checkout);
    for (const entry of readdirSync(checkout)) {
      if (entry !== '.git') rmSync(join(checkout, entry), { recursive: true, force: true });
    }
    for (const entry of ['README.md', 'provenance.json', 'collections']) {
      cpSync(join(dist, entry), join(checkout, entry), { recursive: true, dereference: false });
    }
    const copied = snapshot(checkout, { checkout: true });
    if (JSON.stringify(copied.value) !== JSON.stringify(artifact.value)) {
      throw new Error('Artifact changed while preparing publication; rebuild and retry.');
    }
    const tree = stageSnapshot(checkout, copied.files);
    const existingTree = existing ? git(['rev-parse', `${existing}^{tree}`], checkout) : undefined;
    if (tree === existingTree) {
      console.log(`Artifact ${tag ?? 'main'} already matches dist; nothing to publish.`);
      return;
    }
    if (tag && existing) throw new Error(`Artifact tag ${tag} is immutable and already contains different content.`);
    const baseTree = base ? git(['rev-parse', `${base}^{tree}`], checkout) : undefined;
    if (tree !== baseTree) {
      git(['-c', 'user.name=agentic-artifact[bot]', '-c', 'user.email=agentic-artifact[bot]@users.noreply.github.com',
        'commit', '--no-gpg-sign', '-m', `Publish ${tag ?? 'main'} from ${artifact.value.source.repository}@${sourceCommit}`], checkout);
    }
    const commit = git(['rev-parse', 'HEAD'], checkout);
    const destination = tag ? `refs/tags/${tag}` : 'refs/heads/main';
    git(['push', 'origin', `${commit}:${destination}`], checkout, { target });
    console.log(`Published artifact ${tag ?? 'main'} to ${target.label}.`);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    publishArtifact(options(process.argv.slice(2)));
  } catch (error) {
    console.error(`Artifact publication failed: ${error.message}`);
    process.exitCode = 1;
  }
}
