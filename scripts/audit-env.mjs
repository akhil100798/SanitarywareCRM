export function auditEnvironment(original) {
  const env = { ...original };
  // npm 11 exports user allow-scripts config into lifecycle environments,
  // then rejects that same env setting in a nested project-scoped audit.
  // Audit is read-only; keep user/project config intact and forbid scripts.
  for (const key of Object.keys(env)) {
    if (/^npm_config_allow_scripts$/i.test(key)) delete env[key];
  }
  env.npm_config_ignore_scripts = 'true';
  return env;
}
