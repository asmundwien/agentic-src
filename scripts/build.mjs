#!/usr/bin/env node
import { spawn, execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import {
  chmod, lstat, mkdir, mkdtemp, open, readFile, readdir, realpath, rename, rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { parse as parseJsonc } from 'jsonc-parser';

const exec = promisify(execFile);
const RULESYNC_VERSION = '43.6.0';
const forbiddenStores = new Set([
  '.git', '.ssh', '.aws', '.gnupg', '.npmrc', '.netrc', '.git-credentials',
  '.env', '.env.local', '.cache', 'node_modules', '__pycache__',
]);

function assertPublishableName(name, path) {
  if (forbiddenStores.has(name.toLowerCase())) {
    throw new Error(`Forbidden credential, VCS, or cache store: ${path}; remove the local store from canonical inputs or rename an intended example before building`);
  }
}

function inside(root, target) {
  const path = relative(root, target);
  if (path === '..' || path.startsWith(`..${sep}`) || isAbsolute(path)) {
    throw new Error(`Path escapes source root: ${target}`);
  }
  return target;
}

async function info(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

// Check every ancestor, not just the leaf: a regular file behind a linked
// .rulesync, collection, or docs directory is still outside the trust boundary.
async function safePath(root, path, { optional = false, directory = false } = {}) {
  inside(root, path);
  let current = root;
  const parts = relative(root, path).split(sep).filter(Boolean);
  for (const [index, part] of parts.entries()) {
    current = join(current, part);
    const stat = await info(current);
    if (!stat) {
      if (optional) return null;
      throw new Error(`Missing build input: ${current}`);
    }
    if (stat.isSymbolicLink()) throw new Error(`Symlink build input is forbidden: ${current}`);
    const needsDirectory = index < parts.length - 1 || directory;
    if (needsDirectory ? !stat.isDirectory() : !stat.isFile()) {
      throw new Error(`Unexpected build input type: ${current}`);
    }
  }
  return path;
}

async function bytes(root, path) {
  await safePath(root, path);
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    if (!stat.isFile()) throw new Error(`Not a regular build input: ${path}`);
    return { content: await file.readFile(), mode: stat.mode & 0o777 };
  } finally {
    await file.close();
  }
}

async function copy(root, from, to) {
  const { content, mode } = await bytes(root, from);
  await mkdir(dirname(to), { recursive: true });
  await writeFile(to, content, { flag: 'wx', mode });
  await chmod(to, mode);
}

async function entries(root, path) {
  if (!await safePath(root, path, { optional: true, directory: true })) return [];
  return (await readdir(path)).sort();
}

async function discoverCollections(root) {
  await safePath(root, join(root, 'src'), { directory: true });
  const collections = [];
  for (const name of await entries(root, join(root, 'src'))) {
    const path = join(root, 'src', name);
    const stat = await info(path);
    if (stat.isSymbolicLink()) throw new Error(`Symlink collection is forbidden: ${path}`);
    if (!stat.isDirectory()) continue;
    if (!await safePath(root, join(path, 'rulesync.jsonc'), { optional: true })) continue;
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name)) {
      throw new Error(`Unsafe collection name: ${name}`);
    }
    await safePath(root, join(path, 'rulesync.lock'));
    collections.push({ name, path });
  }
  return collections;
}

// Only canonical feature roots are visited. Files beside .rulesync (including
// source configs, credentials and locks) never enter the copy operation.
async function tree(root, path, { featureRoot = false } = {}, files = new Map(), prefix = '') {
  for (const name of await entries(root, path)) {
    if (featureRoot && name === '.curated') continue;
    assertPublishableName(name, join(path, name));
    if (name.includes('\\') || /[\x00-\x1f\x7f]/.test(name)) {
      throw new Error(`Unsafe artifact path: ${join(path, name)}`);
    }
    const from = join(path, name);
    const stat = await info(from);
    if (stat.isSymbolicLink()) throw new Error(`Symlink build input is forbidden: ${from}`);
    const key = prefix ? `${prefix}/${name}` : name;
    if (stat.isDirectory()) await tree(root, from, {}, files, key);
    else if (stat.isFile()) files.set(key, from);
    else throw new Error(`Not a regular build input: ${from}`);
  }
  return files;
}

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function inventory(root, collection) {
  const errors = [];
  const config = parseJsonc((await bytes(root, join(collection.path, 'rulesync.jsonc'))).content.toString('utf8'), errors, { allowTrailingComma: true });
  if (errors.length || !record(config) || !Array.isArray(config.sources ?? [])) {
    throw new Error(`Invalid collection JSONC: ${collection.name}`);
  }
  const declared = new Set();
  for (const entry of config.sources ?? []) {
    if (!record(entry) || typeof entry.source !== 'string' || entry.transport === 'npm') {
      throw new Error(`Unsupported source inventory in ${collection.name}; use unambiguous Git source lock entries`);
    }
    const key = entry.source.toLowerCase();
    if (declared.has(key) || key.includes('#')) {
      throw new Error(`Ambiguous source inventory in ${collection.name}; use unambiguous Git source lock entries`);
    }
    declared.add(key);
  }
  const lockBytes = (await bytes(root, join(collection.path, 'rulesync.lock'))).content;
  const lock = JSON.parse(lockBytes);
  if (lock.lockfileVersion !== 1 || !record(lock.sources)) {
    throw new Error(`Invalid native lock inventory in ${collection.name}`);
  }
  const npmPath = join(collection.path, 'rulesync-npm.lock.json');
  if (await safePath(root, npmPath, { optional: true })) {
    const npm = JSON.parse((await bytes(root, npmPath)).content);
    if (Object.keys(npm.sources ?? {}).length) {
      throw new Error(`Unsupported npm lock inventory in ${collection.name}; Git source inventory is required`);
    }
  }
  const skills = new Set();
  const rules = new Set();
  for (const [key, entry] of Object.entries(lock.sources)) {
    // Frozen native installs deliberately retain obsolete lock/cache entries.
    // Fail closed rather than recreate native ref/qualified-key resolution.
    if (key.includes('#') || !declared.has(key.toLowerCase())) {
      throw new Error(`Stale or unsupported lock source in ${collection.name}; reconcile sources with native rulesync install before building`);
    }
    if (!record(entry) || !record(entry.skills ?? {}) || !record(entry.rules ?? {})) {
      throw new Error(`Invalid native lock inventory in ${collection.name}`);
    }
    for (const name of Object.keys(entry.skills ?? {})) {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name)) {
        throw new Error(`Unsafe locked skill name in ${collection.name}`);
      }
      skills.add(name);
    }
    for (const name of Object.keys(entry.rules ?? {})) {
      if (name.includes('\\') || /[\x00-\x1f\x7f]/.test(name)
        || name.split('/').some((part) => !part || ['.', '..'].includes(part) || forbiddenStores.has(part.toLowerCase()))) {
        throw new Error(`Unsafe locked rule name in ${collection.name}`);
      }
      rules.add(name);
    }
  }
  return { skills, rules, lockSha256: createHash('sha256').update(lockBytes).digest('hex') };
}

async function copyRules(root, collection, output, inventory) {
  const path = join(collection.path, '.rulesync', 'rules');
  const files = await tree(root, path, { featureRoot: true });
  for (const name of inventory.rules) {
    const file = `${name}.md`;
    if (!files.has(file)) {
      const from = inside(path, resolve(path, '.curated', file));
      await safePath(root, from);
      files.set(file, from);
    }
  }
  for (const [name, from] of [...files].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    await copy(root, from, inside(output, resolve(output, name)));
  }
}

async function skillDirectories(root, path) {
  const skills = new Map();
  for (const name of await entries(root, path)) {
    if (name === '.curated') continue;
    const from = join(path, name);
    assertPublishableName(name, from);
    const stat = await info(from);
    if (stat.isSymbolicLink()) throw new Error(`Symlink build input is forbidden: ${from}`);
    if (!stat.isDirectory()) continue;
    if (!await safePath(root, join(from, 'SKILL.md'), { optional: true })) continue;
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name)) {
      throw new Error(`Unsafe skill name: ${name}`);
    }
    skills.set(name, from);
  }
  return skills;
}

async function copySkills(root, collection, output, inventory) {
  const path = join(collection.path, '.rulesync', 'skills');
  const skills = await skillDirectories(root, path);
  for (const name of inventory.skills) {
    if (!skills.has(name)) {
      const from = join(path, '.curated', name);
      await safePath(root, join(from, 'SKILL.md'));
      skills.set(name, from);
    }
  }
  // Select the entire winning directory before copying, never merge companions.
  for (const [name, from] of [...skills].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    assertPublishableName(name, from);
    for (const [file, input] of await tree(root, from)) {
      await copy(root, input, inside(output, resolve(output, name, file)));
    }
  }
}

function validateSource(source) {
  if (!source || !/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(source.repository)
    || ['.', '..'].includes(source.repository.split('/')[1])
    || !/^[0-9a-f]{40}$/.test(source.commit) || typeof source.dirty !== 'boolean') {
    throw new Error('Expected source repository owner/repo, 40hex commit, and boolean dirty provenance');
  }
  return { repository: source.repository, commit: source.commit, dirty: source.dirty };
}

async function replaceDist(root, stage, output) {
  const dist = join(root, 'dist');
  const previous = await info(dist);
  if (previous && !previous.isDirectory()) throw new Error('Refusing to replace non-directory or symlink dist');
  const backup = join(stage, 'previous-dist');
  if (previous) await rename(dist, backup);
  try {
    await rename(output, dist);
  } catch (error) {
    if (previous) {
      try {
        await rename(backup, dist);
      } catch (restoreError) {
        // Never delete the only remaining copy if the filesystem prevents rollback.
        error.preserveStage = true;
        throw new AggregateError([error, restoreError], `Previous dist retained at ${backup}`, { cause: error });
      }
    }
    throw error;
  }
}

// Isolated filesystem assembly: dependencies must already be installed by
// Rulesync. This API never fetches, resolves sources, or converts harness data.
export async function assembleDist({ root = process.cwd(), source }) {
  root = await realpath(root);
  source = validateSource(source);
  const collections = await discoverCollections(root);
  const stage = await mkdtemp(join(root, '.agentic-build-'));
  let preserveStage = false;
  try {
    const output = join(stage, 'artifact');
    await mkdir(join(output, 'collections'), { recursive: true });
    await copy(root, join(root, 'docs', 'consuming.md'), join(output, 'README.md'));
    const manifest = [];
    for (const collection of collections) {
      const installed = await inventory(root, collection);
      const target = join(output, 'collections', collection.name);
      await mkdir(join(target, 'rules'), { recursive: true });
      await mkdir(join(target, 'skills'), { recursive: true });
      await copyRules(root, collection, join(target, 'rules'), installed);
      await copySkills(root, collection, join(target, 'skills'), installed);
      manifest.push({ name: collection.name, lockSha256: installed.lockSha256 });
    }
    const provenance = { schemaVersion: 1, source, rulesyncVersion: RULESYNC_VERSION, collections: manifest };
    await writeFile(join(output, 'provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`, { flag: 'wx' });
    await replaceDist(root, stage, output);
    return provenance;
  } catch (error) {
    preserveStage = error.preserveStage || error.cause?.preserveStage || false;
    throw error;
  } finally {
    if (!preserveStage) await rm(stage, { recursive: true, force: true });
  }
}

function repositoryFromOrigin(origin) {
  const match = /^(?:git@github\.com:|https?:\/\/github\.com\/|ssh:\/\/git@github\.com\/)([^/]+\/[^/]+?)\/?$/i.exec(origin);
  if (!match) throw new Error('Set GITHUB_REPOSITORY or configure a GitHub origin for source provenance');
  return match[1].replace(/\.git$/i, '');
}

async function sourceProvenance(root) {
  const git = async (...args) => (await exec('git', args, { cwd: root, maxBuffer: 16 * 1024 * 1024 })).stdout;
  const repository = process.env.GITHUB_REPOSITORY
    || repositoryFromOrigin((await git('remote', 'get-url', 'origin')).trim());
  return validateSource({
    repository,
    commit: (await git('rev-parse', '--verify', 'HEAD')).trim(),
    dirty: (await git('status', '--porcelain=v1', '-z', '--untracked-files=all')).length !== 0,
  });
}

export async function build({ root = process.cwd() } = {}) {
  root = await realpath(root);
  const cli = join(root, 'node_modules', 'rulesync', 'dist', 'cli', 'index.js');
  const installed = JSON.parse(await readFile(join(root, 'node_modules', 'rulesync', 'package.json'), 'utf8'));
  if (installed.name !== 'rulesync' || installed.version !== RULESYNC_VERSION) {
    throw new Error(`Install the pinned Rulesync ${RULESYNC_VERSION} dependency with pnpm install --frozen-lockfile`);
  }
  for (const collection of await discoverCollections(root)) {
    await new Promise((done, fail) => {
      const child = spawn(process.execPath, [cli, 'install', '--frozen'], { cwd: collection.path, stdio: 'inherit' });
      child.once('error', fail);
      child.once('exit', (code, signal) => {
        if (code === 0) done();
        else fail(new Error(`Rulesync install --frozen failed for ${collection.name} (${signal ?? `exit ${code}`})`));
      });
    });
  }
  return assembleDist({ root, source: await sourceProvenance(root) });
}

if (process.argv[1] && await realpath(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length === 3 && ['--help', '-h'].includes(process.argv[2])) {
    console.log('Usage: node scripts/build.mjs\nRun from the source repository root after pnpm install --frozen-lockfile.');
  } else if (process.argv.length !== 2) {
    console.error('Usage: node scripts/build.mjs');
    process.exitCode = 1;
  } else {
    try {
      await build();
    } catch (error) {
      console.error(`Build failed: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
