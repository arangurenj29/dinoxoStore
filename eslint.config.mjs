import eslint from '@eslint/js';
import astro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      '**/.astro/**',
      '**/.wrangler/**',
      '**/dist/**',
      '**/node_modules/**',
      'output/**',
      'outputs/**',
      'tmp/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ['**/*.{js,mjs}'],
    rules: {
      'no-undef': 'off',
    },
  },
];
