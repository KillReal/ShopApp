module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es6: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.json',
  },
  plugins: [
    "@typescript-eslint"
  ],
  rules: {
    'no-case-declarations': 'off',
    'prefer-const': 'off',
    "@typescript-eslint/no-explicit-any": ["off"]
  },
};