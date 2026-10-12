import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

// Matches apps/api and packages/core (js.configs.recommended + typescript-eslint)
// so the workspace has one lint convention rather than two. The hooks rules are
// the part eslint-config-next provided that is actually about React rather than
// about Next: they catch a dependency array that lies, which in this codebase
// means a stale render.
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat['recommended-latest'],
  {
    rules: {
      // A leading underscore marks an argument that exists only to hold a
      // position -- a mock standing in for `fetch` has to accept the `init`
      // it is handed whether or not it reads it.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  { ignores: ['dist/**'] },
)
