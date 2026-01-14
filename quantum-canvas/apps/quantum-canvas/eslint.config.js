export default {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  rules: {
    'no-undef': 'error',
    'no-unused-vars': 'warn'
  },
  globals: {
    React: 'readonly',
    JSX: 'readonly'
  }
};
