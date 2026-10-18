import tseslint from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  {
    files: ['**/*.ts'],
    languageOptions: { parser },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
