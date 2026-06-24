import next from 'eslint-config-next'
import prettier from 'eslint-config-prettier/flat'

// Flat config for ESLint 9 + Next.js 16 (next lint was removed; .eslintrc.json is legacy).
const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'next-env.d.ts',
      'drizzle/**',
      'public/**',
    ],
  },
  ...next,
  prettier,
  {
    // eslint-plugin-react-hooks v6 (bundled with eslint-config-next 16) promotes the
    // React Compiler rules to "error". This codebase has not adopted the React Compiler,
    // and these flag valid patterns (e.g. syncing state from localStorage/media queries
    // in effects). Keep them visible as warnings rather than blocking the lint pipeline.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/error-boundaries': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
]

export default eslintConfig
