#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function parseValue(raw) {
  const value = raw.trim();
  if (value.startsWith('[')) {
    const commands = [];
    const strings = /"((?:\\.|[^"\\])*)"|'([^']*)'/g;
    let match;
    while ((match = strings.exec(value))) commands.push(match[1] ?? match[2] ?? '');
    return commands.join('\n');
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    try { return JSON.parse(value); } catch { return value.slice(1, -1); }
  }
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1);
  return value;
}

function parseNormalizedConfig(content) {
  const values = new Map();
  const sectionKeys = new Map();
  const lines = content.split('\n');
  let section = '';
  for (let index = 0; index < lines.length; index += 1) {
    const sectionMatch = lines[index].match(/^\s*\[([^\]]+)]\s*$/);
    if (sectionMatch) {
      section = sectionMatch[1].trim();
      continue;
    }
    const keyMatch = lines[index].match(/^\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z0-9_.:+-]+))\s*=\s*(.*)$/);
    if (!keyMatch) continue;
    const key = keyMatch[1] || keyMatch[2] || keyMatch[3];
    let raw = keyMatch[4];
    const triple = raw.startsWith("'''") ? "'''" : raw.startsWith('"""') ? '"""' : undefined;
    if (triple) {
      const chunks = [raw.slice(3)];
      while (!chunks[chunks.length - 1].endsWith(triple) && index + 1 < lines.length) chunks.push(lines[++index]);
      if (chunks[chunks.length - 1].endsWith(triple)) {
        chunks[chunks.length - 1] = chunks[chunks.length - 1].slice(0, -3);
      }
      raw = chunks.join('\n').trim();
    } else if (raw.trim().startsWith('[') && !raw.includes(']')) {
      const chunks = [raw];
      while (!chunks[chunks.length - 1].includes(']') && index + 1 < lines.length) chunks.push(lines[++index]);
      raw = chunks.join('\n');
    }
    values.set(`${section}.${key}`, triple ? raw : parseValue(raw));
    if (!sectionKeys.has(section)) sectionKeys.set(section, new Set());
    sectionKeys.get(section).add(key);
  }
  return { values, sectionKeys };
}

const configPath = path.resolve(process.argv[2] || './mise.toml');
const errors = [];
if (!fs.existsSync(configPath)) {
  console.error(`[MISSING_CONFIG] ${configPath}`);
  process.exit(1);
}
const result = spawnSync('mise', ['config', 'get', '--file', configPath], {
  cwd: path.dirname(configPath),
  encoding: 'utf8',
  env: { ...process.env, MISE_YES: '1' },
});
if (result.status !== 0) {
  console.error(`[INVALID_TOML] ${(result.stderr || result.stdout || 'mise config get failed').trim()}`);
  process.exit(1);
}

const parsed = parseNormalizedConfig(result.stdout);
const get = key => parsed.values.get(key) || '';
const declared = section => parsed.sectionKeys.has(section);
const toolNames = parsed.sectionKeys.get('tools') || new Set();
const install = get('tasks.install.run');
const dev = get('tasks.dev.run');
const build = get('tasks.build.run');
const start = get('tasks.start.run');
const mode = get('meoo.deploy.mode');
const output = get('meoo.deploy.output');
const portText = get('meoo.deploy.port');
const port = /^\d+$/.test(portText) ? Number(portText) : undefined;
const allCommands = [install, dev, build, start].join('\n');
const phpProject = /(?:^|[\s;&|()])(?:php(?:\d+(?:\.\d+)*)?|composer)(?=$|[\s;&|()])/.test(allCommands);

if (toolNames.size === 0 && !phpProject) errors.push('[MISSING_TOOLS] 必须声明非空 [tools]');
for (const platformTool of ['php', 'maven', 'gradle']) {
  if (toolNames.has(platformTool)) errors.push(`[PLATFORM_TOOL] ${platformTool} 由平台提供，不能在 [tools] 中声明`);
}
if (phpProject && !/\bapt-get\s+update\b[\s\S]*\bapt-get\s+install\b[\s\S]*\bphp(?:\d+(?:\.\d+)*)?-cli\b/.test(install)) {
  errors.push('[PHP_SYSTEM_TOOL] PHP 项目必须在 tasks.install 中安装系统 php-cli');
}
if (/(?:^|[\s"'=])\/(?:home\/project|code)(?:\/|\b)/.test(allCommands)) {
  errors.push('[HARDCODED_WORKDIR] tasks 不能写死 /home/project 或 /code');
}
for (const task of ['install', 'build']) {
  if (declared(`tasks.${task}`) && !get(`tasks.${task}.run`).trim()) errors.push(`[EMPTY_TASK] tasks.${task}.run 不能为空`);
}
if (!dev.trim()) errors.push('[MISSING_DEV_TASK] tasks.dev.run 必须非空');
if (!/0\.0\.0\.0/.test(dev) || !/(?:^|\D)3015(?:\D|$)/.test(dev)) {
  errors.push('[INVALID_PREVIEW_ENDPOINT] tasks.dev.run 必须显式监听 0.0.0.0:3015');
}
if (declared('meoo.preview')) errors.push('[DEPRECATED_PREVIEW_CONFIG] 禁止 [meoo.preview]');

if (mode === 'static') {
  if (!output || path.isAbsolute(output) || output.split(/[\\/]+/).includes('..')) {
    errors.push('[INVALID_STATIC_OUTPUT] static 必须声明项目内相对 output');
  }
  if (port !== undefined || declared('tasks.start')) errors.push('[STATIC_SERVER_FIELDS] static 不能声明 port/tasks.start');
} else if (mode === 'server') {
  if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push('[INVALID_SERVER_PORT] server 必须声明合法 port');
  if (!start.trim()) errors.push('[MISSING_START_TASK] server 必须声明 tasks.start.run');
  if (output) errors.push('[SERVER_STATIC_OUTPUT] server 不能声明 output');
} else {
  errors.push('[INVALID_DEPLOY_MODE] mode 必须是 static 或 server');
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Mise 协议校验通过: ${configPath}`);
