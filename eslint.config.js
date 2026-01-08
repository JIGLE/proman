module.exports = [
  // Ignore common build and dependency folders
  { ignores: ['node_modules/**', '.next/**', 'dist/**', 'out/**'] },

  // TypeScript files
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2021,
        sourceType: 'module'
      },
      globals: {}
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin')
    },
    rules: {
      // Minimal baseline (turn off noisy unused var warnings for now)
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' }],
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': ['error'],
      '@typescript-eslint/explicit-module-boundary-types': ['error']
    }
  },

  // JavaScript files
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module'
    },
    rules: {
      'no-unused-vars': 'warn'
    }
  }
];