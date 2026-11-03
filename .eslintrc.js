module.exports = {
  extends: 'expo',
  rules: {
    // Prohibir uso directo de console.* para prevenir logs de datos sensibles
    // Solo permitir console en utils/logger.ts y scripts de node
    'no-console': ['error', { allow: [] }],
  },
  overrides: [
    {
      // Permitir console en el logger mismo y en scripts de node
      files: ['utils/logger.ts', 'scripts/**/*.js', '*.config.js', '*.config.ts'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
