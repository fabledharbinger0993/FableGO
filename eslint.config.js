const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['coverage/*', 'dist/*', 'src/api/schema.d.ts'],
  },
]);
