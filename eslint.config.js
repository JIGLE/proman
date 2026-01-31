module.exports = [
  // Ignore common build and dependency folders
  { ignores: ['node_modules/**', '.next/**', 'dist/**', 'out/**', 'tests/**', 'e2e/**'] },

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
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      'react-hooks': require('eslint-plugin-react-hooks')
    },
    rules: {
      // Relaxed rules for existing codebase - can be tightened over time
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' }],
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': ['warn'],
      '@typescript-eslint/explicit-module-boundary-types': ['off'],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
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