#!/usr/bin/env node
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const skipped = new Set(['node_modules', '.DS_Store']);
export const sharedDocs = ['README.md', 'LICENSE', 'docs/guide', 'assets'];
const readJson = path => JSON.parse(readFileSync(join(repo, path), 'utf8'));
const claudeData = readJson('hosts/claude.json');
const codexData = readJson('hosts/codex.json');

function walk(dir) {
  const files = new Map();
  const visit = rel => {
    for (const name of readdirSync(join(dir, rel)).sort()) {
      if (skipped.has(name)) continue;
      const path = rel ? `${rel}/${name}` : name;
      const stat = statSync(join(dir, path));
      if (stat.isDirectory()) visit(path);
      else files.set(path, { bytes: readFileSync(join(dir, path)), executable: (stat.mode & 0o100) !== 0 });
    }
  };
  if (existsSync(dir)) visit('');
  return files;
}

const text = (string, origin) => ({ bytes: Buffer.from(string), executable: false, origin });
const json = (value, origin) => text(`${JSON.stringify(value, null, '\t')}\n`, origin);

export function parseFrontmatter(source, where) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error(`${where}: ${source.includes('\r\n') ? 'uses CRLF line endings, convert it to LF' : 'missing frontmatter'}`);
  const lines = [];
  for (const line of match[1].split('\n')) {
    const key = line.match(/^([A-Za-z][\w-]*):/)?.[1];
    if (key) lines.push([key, line]);
    else if (lines.length) lines.at(-1)[1] += `\n${line}`;
    else throw new Error(`${where}: frontmatter starts with a continuation line`);
  }
  return { frontmatter: lines, body: source.slice(match[0].length) };
}

const field = (frontmatter, key) => frontmatter.find(([name]) => name === key)?.[1].slice(key.length + 1).trim();
const flag = (frontmatter, key) => /^true(\s|$)/.test(field(frontmatter, key) ?? '');
const serialize = (frontmatter, body) => `---\n${frontmatter.map(([, line]) => line).join('\n')}\n---\n${body}`;

export function loadSource(root = repo) {
  const leaks = [...walk(join(root, 'src'))].filter(([, file]) => file.bytes.includes('${CLAUDE_')).map(([path]) => `src/${path}`);
  if (leaks.length) throw new Error(`host variables in neutral source, use a neutral token instead: ${leaks.join(', ')}`);
  const skillsDir = join(root, 'src/skills');
  const skills = readdirSync(skillsDir).sort().filter(name => existsSync(join(skillsDir, name, 'SKILL.md'))).map(name => {
    const files = walk(join(skillsDir, name));
    const { frontmatter, body } = parseFrontmatter(files.get('SKILL.md').bytes.toString('utf8'), `src/skills/${name}/SKILL.md`);
    files.delete('SKILL.md');
    return { name, frontmatter, body, files };
  });
  const agentsDir = join(root, 'src/agents');
  const agents = (existsSync(agentsDir) ? readdirSync(agentsDir).sort().filter(name => name.endsWith('.md')) : []).map(file => {
    const where = `src/agents/${file}`;
    const { frontmatter, body } = parseFrontmatter(readFileSync(join(agentsDir, file), 'utf8'), where);
    if (frontmatter.map(([key]) => key).join() !== 'name,description') throw new Error(`${where}: a neutral agent carries only name and description; host fields go in hosts/*.json`);
    const description = field(frontmatter, 'description');
    if (/^["'|>]/.test(description)) throw new Error(`${where}: write the description as a plain scalar`);
    return { name: field(frontmatter, 'name'), description, body };
  });
  const docs = new Map();
  for (const path of sharedDocs) {
    const stat = statSync(join(root, path));
    if (stat.isDirectory()) for (const [rel, file] of walk(join(root, path))) docs.set(`${path}/${rel}`, file);
    else docs.set(path, { bytes: readFileSync(join(root, path)), executable: (stat.mode & 0o100) !== 0 });
  }
  return { root, pkg: JSON.parse(readFileSync(join(root, 'src/plugin.json'), 'utf8')), skills, agents, docs };
}

function renderTokens(source, tokens, skillNames) {
  return source.replace(/<(this skill directory|skill file)([^>]*)>/g, (token, head, arg) => {
    const name = arg.trim();
    const valid = head === 'skill file' ? arg === ` ${name}` && skillNames.has(name) : arg === '';
    if (!valid || !tokens[head]) throw new Error(`cannot render ${token}`);
    return tokens[head](name);
  });
}

function skillFiles(skill, frontmatter, render) {
  const files = [[`skills/${skill.name}/SKILL.md`, text(serialize(frontmatter, render(skill.body)), `src/skills/${skill.name}/SKILL.md`)]];
  for (const [rel, file] of skill.files) {
    const origin = `src/skills/${skill.name}/${rel}`;
    files.push([`skills/${skill.name}/${rel}`, rel.endsWith('.md') ? { ...text(render(file.bytes.toString('utf8')), origin), executable: file.executable } : { ...file, origin }]);
  }
  return files;
}

function withHint(frontmatter, hint) {
  const kept = frontmatter.filter(([key]) => key !== 'argument-hint');
  return hint ? [...kept, ['argument-hint', `argument-hint: ${JSON.stringify(hint)}`]] : kept;
}

const manifestFiles = (pkg, data) => Object.entries(data.manifests).map(([path, extra]) => [path, json({ ...pkg, ...extra })]);

const control = /[\u0000-\u0008\u000b-\u001f\u007f]/g;
const escapeControl = char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`;
const tomlString = value => `"${value.replace(/[\\"]/g, '\\$&').replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(control, escapeControl)}"`;
const tomlMultiline = value => `"""${value.replace(/\\/g, '\\\\').replace(/"""/g, '""\\"').replace(control, escapeControl)}"""`;

export const hosts = {
  claude: {
    dir: 'claude',
    tokens: {
      'this skill directory': () => '${CLAUDE_SKILL_DIR}',
      'skill file': name => `\`\${CLAUDE_PLUGIN_ROOT}/skills/${name}/SKILL.md\``,
    },
    skill: (skill, render) => skillFiles(skill, withHint(skill.frontmatter, claudeData.argumentHints[skill.name]), render),
    agent: (agent, render) => {
      const fields = [['name', agent.name], ['description', agent.description], ...Object.entries(claudeData.agents[agent.name] ?? {})];
      return [[`agents/${agent.name}.md`, text(serialize(fields.map(([key, value]) => [key, `${key}: ${value}`]), render(agent.body)), `src/agents/${agent.name}.md`)]];
    },
    manifests: pkg => manifestFiles(pkg, claudeData),
    extras: () => [...walk(join(repo, 'hosts/claude/hooks'))].map(([rel, file]) => [`hooks/${rel}`, file]),
  },
  codex: {
    dir: 'codex',
    tokens: {
      'this skill directory': () => '<this skill directory>',
      'skill file': name => `the absolute path your parent gave you, else the installed skills path the session announces plus \`/${name}/SKILL.md\`, else a file under the installed plugin directory whose path ends in \`skills/${name}/SKILL.md\`, taking the copy whose \`.codex-plugin/plugin.json\` has the highest \`version\``,
    },
    skill: (skill, render) => {
      const files = skillFiles(skill, skill.frontmatter.filter(([key]) => key === 'name' || key === 'description'), render);
      if (flag(skill.frontmatter, 'disable-model-invocation')) files.push([`skills/${skill.name}/agents/openai.yaml`, text('policy:\n  allow_implicit_invocation: false\n')]);
      return files;
    },
    agent: (agent, render) => [[`agents/${agent.name}.toml`, text(
      `name = ${tomlString(agent.name)}\ndescription = ${tomlString(agent.description)}\ndeveloper_instructions = ${tomlMultiline(render(agent.body).replace(/^\n+/, ''))}\n`,
      `src/agents/${agent.name}.md`,
    )]],
    manifests: pkg => manifestFiles(pkg, codexData),
    extras: () => [],
  },
};

function treePathOf(origins, target) {
  for (const [path, origin] of origins) {
    if (origin === target) return path;
    if (origin.startsWith(`${target}/`) && path.endsWith(origin.slice(target.length))) return path.slice(0, path.length - (origin.length - target.length));
  }
}

const linkOrFence = /^(```|~~~)[\s\S]*?^\1|(\]\(<?)([^)\s>]+)/gm;
function relink(source, docPath, origins, repoUrl, root) {
  return source.replace(linkOrFence, (match, fence, open, target) => {
    if (fence || /^[a-z]+:/i.test(target) || target.startsWith('#')) return match;
    const [path, anchor] = target.split('#');
    const wanted = posix.normalize(posix.join(posix.dirname(docPath), decodeURI(path))).replace(/\/$/, '');
    if (!existsSync(join(root, wanted))) return match;
    const inTree = treePathOf(origins, wanted);
    if (inTree === wanted) return match;
    const slash = path.endsWith('/') ? '/' : '';
    const href = inTree === undefined ? `${repoUrl}/blob/main/${wanted}` : posix.relative(posix.dirname(docPath), inTree);
    return `${open}${encodeURI(href)}${slash}${anchor === undefined ? '' : `#${anchor}`}`;
  });
}

export function render(host, source) {
  const skillNames = new Set(source.skills.map(skill => skill.name));
  const renderText = body => renderTokens(body, host.tokens, skillNames);
  const files = new Map();
  const origins = new Map();
  const add = ([path, { bytes, executable, origin }]) => {
    if (files.has(path)) throw new Error(`${host.dir}: two files render to ${path}`);
    files.set(path, { bytes, executable });
    if (origin) origins.set(path, origin);
  };
  for (const skill of source.skills) host.skill(skill, renderText).forEach(add);
  for (const agent of source.agents) host.agent(agent, renderText).forEach(add);
  host.manifests(source.pkg).forEach(add);
  host.extras().forEach(add);
  for (const path of source.docs.keys()) origins.set(path, path);
  for (const [path, file] of source.docs) {
    add([path, path.endsWith('.md') ? { ...text(relink(file.bytes.toString('utf8'), path, origins, source.pkg.repository, source.root)), executable: file.executable } : file]);
  }
  return files;
}

function renderAll(source) {
  const unknown = (table, names) => Object.keys(table).filter(name => !names.includes(name));
  const stale = [...unknown(claudeData.argumentHints, source.skills.map(skill => skill.name)), ...unknown(claudeData.agents, source.agents.map(agent => agent.name))];
  if (stale.length) throw new Error(`hosts/claude.json names what src/ lacks: ${stale.join(', ')}`);
  return Object.values(hosts).map(host => [host, render(host, source)]);
}

export function diff(files, dir) {
  const disk = walk(dir);
  const problems = [];
  for (const [path, file] of files) {
    const current = disk.get(path);
    if (!current) problems.push(`missing ${path}`);
    else if (!current.bytes.equals(file.bytes) || current.executable !== file.executable) problems.push(`stale ${path}`);
  }
  for (const path of disk.keys()) if (!files.has(path)) problems.push(`extra ${path}`);
  return problems;
}

function prune(dir) {
  for (const name of readdirSync(dir)) if (statSync(join(dir, name)).isDirectory()) prune(join(dir, name));
  if (!readdirSync(dir).length) rmdirSync(dir);
}

export function write(files, dir) {
  for (const path of walk(dir).keys()) if (!files.has(path)) rmSync(join(dir, path));
  if (existsSync(dir)) prune(dir);
  for (const [path, file] of files) {
    const target = join(dir, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.bytes);
    chmodSync(target, file.executable ? 0o755 : 0o644);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const check = process.argv.includes('--check');
  try {
    const problems = [];
    for (const [host, files] of renderAll(loadSource())) {
      const dir = join(repo, host.dir);
      if (check) problems.push(...diff(files, dir).map(problem => problem.replace(' ', ` ${host.dir}/`)));
      else write(files, dir);
      if (!check) console.log(`${host.dir}/: ${files.size} files`);
    }
    if (problems.length) {
      console.error(`generated trees are out of date. Run node scripts/build.mjs\n${problems.join('\n')}`);
      process.exit(1);
    }
    if (check) console.log('claude/ and codex/ match src/ and hosts/');
  } catch (error) {
    console.error(`build failed: ${error.message}`);
    process.exit(1);
  }
}
