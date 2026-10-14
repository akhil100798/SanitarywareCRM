import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { auditEnvironment } from './audit-env.mjs';
test('audit removes only inherited allow-scripts flags and forbids lifecycle scripts', () => {
  const original = { NPM_CONFIG_ALLOW_SCRIPTS: 'example', npm_config_allow_scripts: 'example', npm_config_registry: 'https://registry.npmjs.org', OTHER: 'preserved' };
  const env = auditEnvironment(original);
  assert.equal(env.NPM_CONFIG_ALLOW_SCRIPTS, undefined);
  assert.equal(env.npm_config_allow_scripts, undefined);
  assert.equal(env.npm_config_ignore_scripts, 'true');
  assert.equal(env.npm_config_registry, original.npm_config_registry);
  assert.equal(env.OTHER, 'preserved');
  assert.equal(original.NPM_CONFIG_ALLOW_SCRIPTS, 'example');
});
test('installed npm resolver reproduces the nested-config error and accepts audit-only environment', async () => {
  const require = createRequire(import.meta.url);
  const npmRoot = path.dirname(process.env.npm_execpath || path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'));
  const resolver = require(path.resolve(npmRoot, '../lib/utils/resolve-allow-scripts.js'));
  const configured = env => ({ global: false, prefix: path.resolve('automation-tests'), config: {
    get: (name, source) => name === 'allow-scripts' ? (source === 'env' ? env.npm_config_allow_scripts : source === 'user' ? 'example' : undefined) : undefined
  } });
  await assert.rejects(resolver(configured({ npm_config_allow_scripts: 'example' })), { code: 'EALLOWSCRIPTS' });
  const resolved = await resolver(configured(auditEnvironment({ npm_config_allow_scripts: 'example' })));
  assert.deepEqual(resolved.policy, { example: true });
  assert.equal(resolved.source, '.npmrc');
});
