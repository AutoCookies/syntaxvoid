'use strict';

function info(message, ...args) {
  console.info(`[pomai] ${message}`, ...args);
}

function warn(message, ...args) {
  console.warn(`[pomai] ${message}`, ...args);
}

function error(message, ...args) {
  console.error(`[pomai] ${message}`, ...args);
}

module.exports = { info, warn, error };
