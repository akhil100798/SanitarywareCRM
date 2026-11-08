const globals = {
  __dirname: 'readonly',
  clearTimeout: 'readonly',
  console: 'readonly',
  document: 'readonly',
  __DEV__: 'readonly',
  fetch: 'readonly',
  localStorage: 'readonly',
  module: 'readonly',
  process: 'readonly',
  require: 'readonly',
  sessionStorage: 'readonly',
  setTimeout: 'readonly'
};

export default [
  {
    ignores: [
      'android/**',
      'dist-check*/**',
      'node_modules/**',
      '.qa-*/**',
      'expo-tmp-*/**',
      '.gradle/**',
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
