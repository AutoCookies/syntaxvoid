'use strict';

function info(message, ...args) {
  console.info(`[syntaxvoid] ${message}`, ...args);
}

function warn(message, ...args) {
  console.warn(`[syntaxvoid] ${message}`, ...args);
}

function error(message, ...args) {
  console.error(`[syntaxvoid] ${message}`, ...args);
}

module.exports = { info, warn, error };
