'use strict';

function get(key, defaultValue) {
  const value = atom.config.get(key);
  return value === undefined ? defaultValue : value;
}

function set(key, value) {
  return atom.config.set(key, value);
}

function observe(key, callback) {
  return atom.config.observe(key, callback);
}

module.exports = { get, set, observe };
