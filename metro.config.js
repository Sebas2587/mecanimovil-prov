const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Un solo worker: en una Mac de 8 GB, varios procesos de Metro disparan el abort
// por falta de memoria (exit 134) al arrancar con la caché limpia.
config.maxWorkers = 1;

// El proceso principal necesita más de los ~2 GB por defecto. Ese techo llega
// por NODE_OPTIONS o por --max-old-space-size, y Metro lo copia a cada worker.
// Los workers solo transforman archivos; se quedan con el heap por defecto.
stripInheritedHeapCeiling();

module.exports = config;

function stripInheritedHeapCeiling() {
  process.execArgv = process.execArgv.filter(
    (arg) => !String(arg).includes('max-old-space-size'),
  );
  if (!process.env.NODE_OPTIONS) return;
  const next = process.env.NODE_OPTIONS
    .replace(/--max-old-space-size=\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (next) process.env.NODE_OPTIONS = next;
  else delete process.env.NODE_OPTIONS;
}
