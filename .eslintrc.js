module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  env: {
    node: true,
    browser: true,
    es2020: true
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended'
  ],
  rules: {
    'prettier/prettier': 'error',

    // 👇 这些是“开发友好型”配置
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    'no-console': 'off',

    // 👇 React / Vue 通用不容易冲突
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn']
  }
}