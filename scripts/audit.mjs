import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditEnvironment } from './audit-env.mjs';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scope = process.argv[2];
if (!['frontend', 'mobile', 'automation-tests'].includes(scope) || process.argv.length !== 3) {
  throw new Error('Usage: node scripts/audit.mjs <frontend|mobile|automation-tests>');
}
const candidates = [process.env.npm_execpath, path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')];
const npmCli = candidates.find(candidate => candidate && path.basename(candidate) === 'npm-cli.js' && fs.existsSync(candidate));
if (!npmCli) throw new Error('Cannot find installed npm-cli.js for read-only audit');
const child = spawn(process.execPath, [npmCli, 'audit', '--json', '--audit-level=high', '--ignore-scripts'], {
  cwd: path.join(repo, scope), env: auditEnvironment(process.env), stdio: 'inherit'
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = signal ? 1 : (code ?? 1); });
