const globals = {
  clearTimeout: 'readonly',
  console: 'readonly',
  document: 'readonly',
  fetch: 'readonly',
  localStorage: 'readonly',
  module: 'readonly',
  process: 'readonly',
  sessionStorage: 'readonly',
  setTimeout: 'readonly'
};

export default [
  {
    ignores: [
      'android/**',
      'dist-check*/**',
      'node_modules/**',
      'ui-smoke-*.png'
    ]
  },
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        },
        sourceType: 'module'
      },
      sourceType: 'module'
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^(React|_)$'
        }
      ]
    }
  }
];
