const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Limita workers para que Expo Go no sature la RAM (SDK 57 bundlea iOS + web/SSR).
config.maxWorkers = 2;

module.exports = config;
